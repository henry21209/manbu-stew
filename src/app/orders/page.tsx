"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import OrdersList from '@/components/OrdersList';
import styles from './Orders.module.css';

const statusConfig = {
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800' },
  shipped: { label: '已出貨', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

export default function OrdersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null; 
  }

  return (
    <>
      <TopNav />
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>我的訂單</h1>
          <OrdersList />
        </div>
      </main>
      <Footer />
    </>
  );
}
