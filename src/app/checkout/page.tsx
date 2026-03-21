"use client";

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import styles from './Checkout.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const orderData = {
        buyer: {
          name: formData.get('name'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          payment: formData.get('payment'),
        },
        items: cart,
        totalAmount: totalPrice,
        createdAt: new Date(),
        status: 'pending' // Optional status field
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      alert('訂單建立成功！');
      clearCart();
      router.push('/');
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
                    <input className={styles.input} type="text" id="name" name="name" required placeholder="王大明" />
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="phone">聯絡電話</label>
                    <input className={styles.input} type="tel" id="phone" name="phone" required placeholder="0912-345-678" />
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="address">配送地址</label>
                    <input className={styles.input} type="text" id="address" name="address" required placeholder="台北市信義區..." />
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="payment">付款方式</label>
                    <select className={styles.select} id="payment" name="payment" required>
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
