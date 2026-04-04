"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AdminOrders.module.css';

// 狀態對應的樣式與標籤 (支援 Tailwind 與傳統 Inline 行內樣式做雙保險)
const statusConfig: Record<string, { label: string, color: string, badgeBg: string, badgeText: string }> = {
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800', badgeBg: '#FEF3C7', badgeText: '#92400E' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800', badgeBg: '#D1FAE5', badgeText: '#065F46' },
  shipped: { label: '已出貨', color: 'bg-blue-100 text-blue-800', badgeBg: '#DBEAFE', badgeText: '#1E40AF' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', badgeBg: '#F3F4F6', badgeText: '#475569' },
};

export default function AdminOrdersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(fetched);
      } catch (error) {
        console.error("Error fetching admin orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser !== undefined) {
      if (currentUser === null) {
        router.replace('/');
      } else {
        // RBI (Role-Based Identity) Guard
        const checkRoleAndLoad = async () => {
          try {
            if (!currentUser.email) throw new Error('Missing Email');
            
            const roleDoc = await getDoc(doc(db, 'admin_roles', currentUser.email));
            if (!roleDoc.exists()) throw new Error('Unauthorized');
            
            const role = roleDoc.data().role;
            if (role !== 'admin' && role !== 'super_admin') throw new Error('Forbidden');
            
            setUserRole(role);
            fetchOrders();
          } catch (e) {
            console.error("RBAC 攔截:", e);
            router.replace('/');
          }
        };
        checkRoleAndLoad();
      }
    }
  }, [currentUser, router]);

  // 更新出貨狀態
  const handleShipOrder = async (orderId: string) => {
    if (!window.confirm('確定要將此訂單標記為已出貨嗎？系統將即時更新狀態。')) return;
    
    setUpdatingId(orderId);
    try {
      const orderRef = doc(db, 'orders', orderId);
      // 覆寫 Server Database
      await updateDoc(orderRef, { status: 'shipped' });
      
      // 即時更新 Client UI，給予 0 延遲的流暢視覺回饋
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
    } catch (error) {
      console.error("Error updating order status:", error);
      alert('更新狀態失敗，可能權限不足或連線異常。');
    } finally {
      setUpdatingId(null);
    }
  };

  // 物理刪除指令
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('警告：您即將把此訂單從資料庫中永遠抹除。此操作無法還原，確定執行？')) return;
    
    setUpdatingId(orderId);
    try {
      const idToken = await currentUser!.getIdToken();
      
      const response = await fetch(`/api/admin/orders/${orderId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        let errMsg = '刪除失敗';
        try { errMsg = JSON.parse(text).error; } catch {}
        throw new Error(errMsg);
      }
      
      // 從 UI 徹底移除
      setOrders(prev => prev.filter(o => o.id !== orderId));
      alert('該筆訂單檔案已經被實體粉碎。');
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || currentUser === undefined) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.2rem', color: '#666', animation: 'pulse 2s infinite ease-in-out' }}>正在驗證管理員憑證並載入所有訂單...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>訂單總覽管理後台</h1>
          <button 
            onClick={() => router.push('/')}
            style={{ 
              padding: '0.6rem 1.2rem', 
              background: '#fff', 
              border: '1px solid #ccc', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            返回前台首頁
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>訂單日期</th>
                <th className={styles.th}>訂單編號</th>
                <th className={styles.th}>購買人信箱</th>
                <th className={styles.th}>總金額</th>
                <th className={styles.th}>目前狀態</th>
                <th className={styles.th}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>尚無任何訂單紀錄資料</td>
                </tr>
              )}
              {orders.map(order => {
                const dateStr = order.createdAt?.toDate 
                  ? order.createdAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                  : '未知時間';
                
                // 動態取得預設設定值
                const statusInfo = statusConfig[order.status] || { label: order.status, badgeBg: '#f3f4f6', badgeText: '#374151' };

                return (
                  <tr key={order.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontSize: '0.9rem', color: '#64748b' }}>
                      {dateStr}
                    </td>
                    <td className={styles.td} style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#4a3b32', fontWeight: 500 }}>
                      {order.id}
                    </td>
                    <td className={styles.td}>
                      {order.userEmail || order.buyer?.email || 'N/A'}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 600, color: '#0f172a' }}>
                      NT$ {order.totalAmount?.toLocaleString() ?? 0}
                    </td>
                    <td className={styles.td}>
                      <span 
                        className={statusInfo.color} 
                        style={{ 
                          padding: '0.35rem 0.8rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          backgroundColor: statusInfo.badgeBg, 
                          color: statusInfo.badgeText,
                          letterSpacing: '0.05em'
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handleShipOrder(order.id)}
                            disabled={updatingId === order.id}
                            style={{
                              background: '#4a3b32',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1.2rem',
                              borderRadius: '4px',
                              cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              opacity: updatingId === order.id ? 0.7 : 1,
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            {updatingId === order.id ? '作業中...' : '標記為已出貨'}
                          </button>
                        )}

                        {userRole === 'super_admin' && (order.status === 'cancelled' || order.status === 'failed') && (
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={updatingId === order.id}
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #ef4444',
                              padding: '0.45rem 1rem',
                              borderRadius: '4px',
                              cursor: updatingId === order.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              opacity: updatingId === order.id ? 0.5 : 1,
                              transition: 'all 0.2s'
                            }}
                          >
                            實體粉碎
                          </button>
                        )}

                        {order.status !== 'paid' && !(userRole === 'super_admin' && (order.status === 'cancelled' || order.status === 'failed')) && (
                          <span style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0.5rem 0' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
