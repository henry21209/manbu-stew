"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import styles from './Orders.module.css';

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We allow the render below until checking, but redirect out if no auth
    if (!currentUser) {
      // Delay push to avoid Next.js error of pushing during render sometimes
      router.push('/');
      return;
    }

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, router]);

  if (!currentUser) {
    return null; // Prevents flashing content
  }

  // Helper to translate status safely
  const translateStatus = (status: string) => {
    switch (status) {
      case 'pending': return '待處理';
      case 'shipped': return '已出貨';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status || '未知';
    }
  };

  return (
    <>
      <TopNav />
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>我的訂單</h1>
          
          {loading ? (
            <p style={{textAlign: 'center', color: '#666'}}>載入中...</p>
          ) : orders.length === 0 ? (
            <p style={{textAlign: 'center', color: '#666'}}>目前沒有訂單紀錄</p>
          ) : (
            <div className={styles.orderList}>
              {orders.map(order => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderId}>訂單編號: {order.id}</span>
                    <span 
                      className={styles.orderStatus} 
                      data-status={order.status}
                    >
                      {translateStatus(order.status)}
                    </span>
                  </div>
                  
                  <div className={styles.orderItems}>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item: any, index: number) => (
                        <div key={item.id || index} className={styles.orderItem}>
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
                          )}
                          <div className={styles.itemDetails}>
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemMeta}>NT$ {item.price?.toLocaleString()} x {item.quantity}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.legacyNote}>（早期訂單，無詳細商品明細）</p>
                    )}
                  </div>

                  <div className={styles.orderBody}>
                    <span className={styles.orderTotal}>
                      總金額: NT$ {order.totalAmount?.toLocaleString() ?? 0}
                    </span>
                    <span className={styles.orderDate}>
                      訂購日期: {
                        order.createdAt?.toDate 
                          ? order.createdAt.toDate().toLocaleDateString() 
                          : order.createdAt 
                            ? new Date(order.createdAt).toLocaleDateString()
                            : '未知'
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
