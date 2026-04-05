"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import styles from './Checkout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { TAIWAN_DISTRICTS } from '@/lib/taiwan-data';
import TopNav from '@/components/TopNav';
import toast from 'react-hot-toast';

// 企業級聯防：嚴格的表單驗證 Schema，包含 Transform 寬容轉換與連動校驗邏輯
const checkoutSchema = z.object({
  name: z.string().min(2, '請輸入完整的收件人姓名'),
  phone: z.string()
          .transform(val => val.replace(/[-_ ]/g, ''))
          .pipe(z.string().regex(/^09\d{8}$/, '請輸入有效的手機號碼 (例如: 0912345678)')),
  email: z.string().email('請輸入有效的電子信箱'),
  city: z.string().refine(val => Object.keys(TAIWAN_DISTRICTS).includes(val), { message: '無效的縣市選項' }),
  district: z.string().min(1, '請選擇行政區'),
  detailAddress: z.string().min(5, '請輸入完整的收件街道門牌 (不含縣市區)'),
  payment: z.string()
}).superRefine((data, ctx) => {
  if (data.city) {
    const validDistricts = TAIWAN_DISTRICTS[data.city];
    if (!validDistricts || !validDistricts.includes(data.district)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: '您選擇的行政區不存在於該縣市中，請勿竄改資料'
      });
    }
  }
});
import Footer from '@/components/Footer';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({ name: '', phone: '', email: '', city: '', district: '', detailAddress: '', payment: 'credit_card' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchBuyerInfo = async () => {
      if (!currentUser) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBuyerInfo(prev => ({
            ...prev,
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || currentUser.email || '',
            city: data.city || '',
            district: data.district || '',
            detailAddress: data.detailAddress || data.address || '' // 若舊版單一字串地址，則暫存於門牌號碼
          }));
        } else {
          setBuyerInfo(prev => ({ ...prev, email: currentUser.email || '' }));
        }
      } catch (err) {
        console.error("Error fetching user defaults:", err);
      }
    };
    fetchBuyerInfo();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    if (!currentUser) {
      alert('請先登入會員以完成結帳');
      return;
    }
    
    // 取出 FormData 執行純淨 Zod 驗證
    const formData = new FormData(e.currentTarget);
    const buyerDataRaw = {
      name: formData.get('name') as string || '',
      phone: formData.get('phone') as string || '',
      email: formData.get('email') as string || '',
      city: formData.get('city') as string || '',
      district: formData.get('district') as string || '',
      detailAddress: formData.get('detailAddress') as string || '',
      payment: formData.get('payment') as string || '',
    };

    const result = checkoutSchema.safeParse(buyerDataRaw);
    if (!result.success) {
      // 提取第一個錯誤至 State Render
      const formattedErrors: Record<string, string> = {};
      for (const [key, val] of Object.entries(result.error.flatten().fieldErrors)) {
        if (val && val.length > 0) formattedErrors[key] = val[0];
      }
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    
    // 將驗證通過之無塵資料準備好 (包含清除符號後的手機和組合後的地址)
    const validData = result.data;
    const finalBuyerData = {
      name: validData.name,
      phone: validData.phone,
      email: validData.email,
      address: `${validData.city}${validData.district}${validData.detailAddress}`,
      payment: validData.payment
    };
    
    try {
      const createdOrder = await runTransaction(db, async (transaction) => {
        let secureTotalPrice = 0;
        const snapshotItems: any[] = [];
        
        // 1. 讀取階段 (Read Phase)
        // 必須在所有 write 之前執行
        const productDocs = await Promise.all(
          cart.map(item => transaction.get(doc(db, 'products', item.id)))
        );

        // 2. 校驗階段 (Validation Phase)
        cart.forEach((item, index) => {
          const productSnap = productDocs[index];
          if (!productSnap.exists()) {
            throw new Error(`商品 ${item.name} 不存在`);
          }
          
          const productData = productSnap.data();
          if (productData.isAvailable !== true || productData.price !== item.price) {
            throw new Error(`商品 ${item.name} 價格或狀態已變動，請重新確認購物車`);
          }
          
          const currentStock = productData.stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(`商品 ${item.name} 庫存不足 (剩餘: ${currentStock})`);
          }

          snapshotItems.push({
            id: item.id,
            name: productData.name,
            price: productData.price,
            quantity: item.quantity,
            imageUrl: productData.imageUrl
          });
          secureTotalPrice += productData.price * item.quantity;
        });

        // 3. 寫入階段 (Write Phase)
        // 扣減庫存
        cart.forEach((item, index) => {
          const productRef = doc(db, 'products', item.id);
          const currentStock = productDocs[index].data()?.stock || 0;
          transaction.update(productRef, { stock: currentStock - item.quantity });
        });

        // 建立新訂單資料
        const now = new Date();
        const orderMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const orderData = {
          userId: currentUser.uid,
          userEmail: finalBuyerData.email,
          buyer: finalBuyerData,
          items: snapshotItems,
          totalAmount: secureTotalPrice,
          orderMonth: orderMonth,
          createdAt: now,
          status: 'pending'
        };

        const newOrderRef = doc(collection(db, 'orders'));
        transaction.set(newOrderRef, orderData);
        
        return { orderId: newOrderRef.id, totalAmount: secureTotalPrice };
      });
      
      clearCart();

      toast.success('訂單初步建立成功！請準備連線進行加密付款。', { duration: 3000 });
      router.push('/orders');
    } catch (error: any) {
      console.error("Order submission error: ", error);
      toast.error(`訂單建立失敗：${error.message || '請稍後再試'}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TopNav />
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>結帳</h1>
          
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <p>您的購物車裡面沒有商品，無法進行結帳。</p>
              <Link href="/" className={styles.backBtn}>返回選購</Link>
            </div>
          ) : (
            <div className={styles.layout}>
              {/* Left Column: Form */}
              <div>
                <h2 className={styles.sectionTitle}>訂購資訊</h2>
                <form id="checkout-form" className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="name">收件人姓名</label>
                    <input className={styles.input} type="text" id="name" name="name" value={buyerInfo.name} onChange={e => setBuyerInfo({...buyerInfo, name: e.target.value})} placeholder="王大明" />
                    {errors.name && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.name}</p>}
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">聯絡電話</label>
                    <input className={styles.input} type="tel" id="phone" name="phone" value={buyerInfo.phone} onChange={e => setBuyerInfo({...buyerInfo, phone: e.target.value})} placeholder="0912-345-678" />
                    {errors.phone && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.phone}</p>}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="email">聯絡信箱</label>
                    <input className={styles.input} type="email" id="email" name="email" value={buyerInfo.email} onChange={e => setBuyerInfo({...buyerInfo, email: e.target.value})} placeholder="example@manbu.com" />
                    {errors.email && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.email}</p>}
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label}>配送地址</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <select 
                        className={styles.select} 
                        name="city" 
                        value={buyerInfo.city} 
                        onChange={e => setBuyerInfo({...buyerInfo, city: e.target.value, district: ''})}
                        style={{ flex: 1 }}
                      >
                        <option value="">選擇縣市</option>
                        {Object.keys(TAIWAN_DISTRICTS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      
                      <select 
                        className={styles.select} 
                        name="district" 
                        value={buyerInfo.district} 
                        onChange={e => setBuyerInfo({...buyerInfo, district: e.target.value})}
                        style={{ flex: 1 }}
                        disabled={!buyerInfo.city}
                      >
                        <option value="">選擇區域</option>
                        {buyerInfo.city && TAIWAN_DISTRICTS[buyerInfo.city]?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {(errors.city || errors.district) && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.city || errors.district}</p>}
                    
                    <input 
                      className={styles.input} 
                      type="text" 
                      id="detailAddress" 
                      name="detailAddress" 
                      value={buyerInfo.detailAddress} 
                      onChange={e => setBuyerInfo({...buyerInfo, detailAddress: e.target.value})} 
                      placeholder="復興南路一段 100 號 5 樓..." 
                    />
                    {errors.detailAddress && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.detailAddress}</p>}
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="payment">付款方式</label>
                    <select className={styles.select} id="payment" name="payment" required value={buyerInfo.payment} onChange={e => setBuyerInfo({...buyerInfo, payment: e.target.value})}>
                      <option value="credit_card">信用卡</option>
                      <option value="cash_on_delivery">貨到付款</option>
                    </select>
                  </div>
                </form>
              </div>

              {/* Right Column: Order Summary */}
              <div>
                <h2 className={styles.sectionTitle}>訂單摘要</h2>
                <div className={styles.summaryPanel}>
                  <div className={styles.itemList}>
                    {cart.map(item => (
                      <div key={item.id} className={styles.item}>
                        <div className={styles.itemInfo}>
                          <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
                          <div>
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemQty}>數量: {item.quantity}</div>
                          </div>
                        </div>
                        <div className={styles.itemPrice}>
                          NT$ {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.totalSection}>
                    <span className={styles.totalLabel}>總計金額</span>
                    <span className={styles.totalAmount}>NT$ {totalPrice.toLocaleString()}</span>
                  </div>
                  
                  <button type="submit" className={styles.checkoutBtn} disabled={isSubmitting}>
                    {isSubmitting ? '建立結帳程序中...' : '確認結帳並前往付款'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
