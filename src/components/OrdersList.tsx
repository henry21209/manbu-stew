"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, orderBy, getDocs, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from '@/app/orders/Orders.module.css';

const statusConfig: Record<string, { label: string, color: string, badgeBg: string, badgeText: string }> = {
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800', badgeBg: '#FEF3C7', badgeText: '#92400E' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800', badgeBg: '#D1FAE5', badgeText: '#065F46' },
  shipped: { label: '已出貨', color: 'bg-blue-100 text-blue-800', badgeBg: '#DBEAFE', badgeText: '#1E40AF' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', badgeBg: '#F3F4F6', badgeText: '#1F2937' },
};

export default function OrdersList() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
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
  }, [currentUser]);

  useEffect(() => {
    // 雙重保險：監聽 BFCache (上一頁) 恢復事件，強制解除卡死的 Loading 狀態
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  if (!currentUser) return null;



  if (loading) return <p style={{textAlign: 'center', color: '#666', padding: '2rem'}}>載入中...</p>;
  if (orders.length === 0) return <p style={{textAlign: 'center', color: '#666', padding: '2rem'}}>目前沒有訂單紀錄</p>;

  const handlePayment = async (order: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ecpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          totalAmount: order.totalAmount,
          itemName: '漫步食光線上購物'
        })
      });

      if (!response.ok) {
        throw new Error('API Responded with ' + response.status);
      }

      const html = await response.text();
      
      // 建立隱藏的容器安置跳轉表單，徹底摒避 document.write 帶來的 DOM 毀滅效應
      const tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);
      
      const form = document.getElementById('ecpay-form') as HTMLFormElement;
      if (form) {
        form.submit();
        
        // Timeout 防禦：確保若是使用者在新頁面終止或按上一頁回來，React state 也能被還原
        setTimeout(() => {
          setLoading(false);
          if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
          }
        }, 1000);
      } else {
        throw new Error('無法載入綠界跳轉表單');
      }
    } catch (err) {
      console.error("ECPay connection error:", err);
      alert('金流連線異常，請稍後再試');
      setLoading(false);
    }
  };

  const handleCancel = async (order: any) => {
    if (!window.confirm('確定要取消這筆訂單嗎？取消後庫存將被還原，如需重新購買請再次下單。')) return;
    
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', order.id);
        const orderSnap = await transaction.get(orderRef);
        
        if (!orderSnap.exists()) throw new Error('發生異常：訂單資料庫查無此筆紀錄');
        if (orderSnap.data().status !== 'pending') throw new Error('該訂單目前狀態已經無法取消');

        // Safely execute positive stock restoration iteratively mapping to current products
        if (order.items && order.items.length > 0) {
          const productRefs = order.items.map((item: any) => doc(db, 'products', item.id));
          const productSnaps = await Promise.all(productRefs.map((ref: any) => transaction.get(ref)));
          
          order.items.forEach((item: any, index: number) => {
            const productSnap = productSnaps[index];
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stock || 0;
              transaction.update(productRefs[index], { stock: currentStock + item.quantity });
            }
          });
        }

        // Finalize transaction explicitly enforcing cancellation parameter
        transaction.update(orderRef, { status: 'cancelled' });
      });

      // Synchronously update local react hook overriding remote fetch needs
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
      alert('訂單已順利取消！您購買的商品庫存已退回。');
    } catch (error: any) {
      console.error('Cancellation error:', error);
      alert(`取消失敗：${error.message || '請稍後重試'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.orderList}>
      {orders.map(order => (
        <div key={order.id} className={styles.orderCard}>
          <div className={styles.orderHeader}>
            <span className={styles.orderId}>訂單編號: {order.id}</span>
            <span 
              className={statusConfig[order.status]?.color || ''} 
              style={{
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.875rem', 
                fontWeight: '600',
                backgroundColor: statusConfig[order.status]?.badgeBg || '#f3f4f6', 
                color: statusConfig[order.status]?.badgeText || '#374151',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {statusConfig[order.status]?.label || order.status}
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

          <div className={styles.orderBody} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            
            {order.status === 'pending' && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', width: '100%', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleCancel(order)}
                  style={{ background: 'transparent', border: '1px solid #d32f2f', color: '#d32f2f', padding: '0.6rem 1.2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', fontWeight: 'bold' }}
                >
                  取消訂單
                </button>
                <button 
                  onClick={() => handlePayment(order)}
                  style={{ background: '#4a3b32', border: 'none', color: '#fff', padding: '0.6rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                >
                  立即付款
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
