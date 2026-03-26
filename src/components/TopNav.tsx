"use client";

import styles from './TopNav.module.css';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from './CartDrawer';
// 1. 確保 useState 和 useEffect 有被引入
import { useState, useRef, useEffect } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const { totalItems } = useCart();
  const { currentUser, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 2. 新增一個 State：用來記住現在是不是「已經往下滾動了」
  const [isScrolled, setIsScrolled] = useState(false); 
  
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點擊外部關閉下拉選單的 useEffect (保留不動)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. 新增一個 useEffect：專門用來監聽滑鼠滾動
  useEffect(() => {
    const handleScroll = () => {
      // 如果往下滾動超過 20px，就設定為 true，反之為 false
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // 把監聽器掛載到 window 上
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup function：離開頁面時一定要移除，這是資工系的好習慣
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
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
    // 4. 最關鍵的修改：用 Template Literal 動態組合 ClassName
    // 如果 isScrolled 是 true，就多加一個 styles.scrolled 的 class 給它
    <nav className={`${styles.nav} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* 5. 順便幫你把 LOGO 的字體加上了襯線體 (serif)，提升高級感 */}
        <Link 
          href="/" 
          className={styles.logo} 
          style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            letterSpacing: '0.1em', 
            color: '#4a3b32', 
            textDecoration: 'none',
            fontFamily: "'Noto Serif TC', serif" // 加上這行，質感瞬間提升
          }}
        >
          漫步食光
        </Link>
        
        <div className={styles.links}>
          <Link href="/?category=慢燉系列">慢燉系列</Link>
          <Link href="/?category=節氣湯品">節氣湯品</Link>
          <Link href="/?category=年節禮盒">年節禮盒</Link>
          <Link href="/about">關於我們</Link>
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