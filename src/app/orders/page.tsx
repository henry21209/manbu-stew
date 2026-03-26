"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import OrdersList from '@/components/OrdersList';
import styles from './Orders.module.css';

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
