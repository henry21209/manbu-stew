"use client";

import styles from './TopNav.module.css';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from './CartDrawer';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const { totalItems } = useCart();
  const { currentUser, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      router.push('/');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

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
          
          {!currentUser ? (
            <Link href="/login" className={styles.iconBtn}>
              <span className="material-symbols-outlined">person</span>
            </Link>
          ) : (
            <div className={styles.profileWrapper} ref={dropdownRef}>
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt="Profile" 
                  className={styles.avatar} 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                />
              ) : (
                <div 
                  className={styles.avatarInitial} 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              
              {isDropdownOpen && (
                <div className={styles.dropdown}>
                  <Link href="/profile" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    會員中心
                  </Link>
                  <Link href="/orders" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                    我的訂單
                  </Link>
                  <button onClick={handleLogout} className={styles.dropdownItem}>
                    登出
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </nav>
  );
}
