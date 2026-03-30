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
import TopNav from '@/components/TopNav';

// 企業級聯防：嚴格的表單驗證 Schema
const checkoutSchema = z.object({
  name: z.string().min(2, '請輸入完整的收件人姓名'),
  phone: z.string().regex(/^09\d{8}$/, '請輸入有效的手機號碼 (例如: 0912345678)'),
  email: z.string().email('請輸入有效的電子信箱'),
  address: z.string().min(5, '請輸入完整的收件地址 (含縣市區)'),
  payment: z.string()
});
import Footer from '@/components/Footer';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buyerInfo, setBuyerInfo] = useState({ name: '', phone: '', email: '', address: '', payment: 'credit_card' });
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
            address: data.address || ''
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
    const buyerData = {
      name: formData.get('name') as string || '',
      phone: formData.get('phone') as string || '',
      email: formData.get('email') as string || '',
      address: formData.get('address') as string || '',
      payment: formData.get('payment') as string || '',
    };

    const result = checkoutSchema.safeParse(buyerData);
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
          userEmail: buyerData.email,
          buyer: buyerData,
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

      alert('訂單建立成功！請於會員中心完成後續結帳作業。');
      router.push('/orders');
    } catch (error: any) {
      console.error("Order submission error: ", error);
      alert(`訂單建立失敗：${error.message || '請稍後再試'}`);
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
                    <label className={styles.label} htmlFor="address">配送地址</label>
                    <input className={styles.input} type="text" id="address" name="address" value={buyerInfo.address} onChange={e => setBuyerInfo({...buyerInfo, address: e.target.value})} placeholder="台北市信義區..." />
                    {errors.address && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.address}</p>}
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
                  
                  <button 
                    type="submit" 
                    form="checkout-form" 
                    className={styles.submitBtn}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '處理中...' : '確認送出訂單'}
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
