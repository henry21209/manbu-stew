"use client";

import styles from './TopNav.module.css';
import { useCart } from '@/context/CartContext';
import CartDrawer from './CartDrawer';
import { useState } from 'react';
import Link from 'next/link';

export default function TopNav() {
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>漫步食光</Link>
        
        <div className={styles.links}>
          <a href="#">慢燉系列</a>
          <a href="#">節氣湯品</a>
          <a href="#">年節禮盒</a>
          <a href="#">關於我們</a>
        </div>

        <div className={styles.actions}>
          <button className={styles.iconBtn} onClick={() => setIsCartOpen(true)}>
            <span className="material-symbols-outlined">shopping_bag</span>
            {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
          </button>
          <button className={styles.iconBtn}>
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </div>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </nav>
  );
}
