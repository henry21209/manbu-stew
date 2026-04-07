"use client";

import { useState, useRef, useEffect } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from './CartDrawer';
import styles from './TopNav.module.css';

// 1. 定義共用資料 (DRY 原則：桌面與手機版共用資料來源)
const navLinks = [
  { label: '慢燉系列', href: '/?category=慢燉系列' },
  { label: '節氣湯品', href: '/?category=節氣湯品' },
  { label: '年節禮盒', href: '/?category=年節禮盒' },
  { label: '關於我們', href: '/about' },
];

/**
 * 右側互動圖示共用元件 (購物車、會員下拉)
 * 接受 setIsCartOpen 控制最底層的 CartDrawer 抽屜
 */
const ActionIcons = ({ setIsCartOpen }: { setIsCartOpen: (open: boolean) => void }) => {
  const { totalItems } = useCart();
  const { currentUser, isAdmin, logout } = useAuth();
  const router = useRouter();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    <div className="flex items-center gap-4 text-[#4a3b32]">
      {/* 後台入口條件渲染 (僅電腦版顯示，手機版移至漢堡選單內) */}
      {isAdmin && (
        <Link href="/admin" className="hidden md:flex items-center gap-1 text-sm font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors">
          <span className="material-symbols-outlined text-[1.1rem]">admin_panel_settings</span>
          管理後台
        </Link>
      )}

      {/* 購物車觸發按鈕 */}
      <button className={styles.iconBtn} onClick={() => setIsCartOpen(true)}>
        <span className="material-symbols-outlined text-[1.6rem]">shopping_bag</span>
        {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
      </button>
      
      {/* 會員中心 / 登出來源 */}
      {!currentUser ? (
        <Link href="/login" className="transition-transform hover:scale-105">
          <span className="material-symbols-outlined text-[1.6rem]">person</span>
        </Link>
      ) : (
        <div className="relative" ref={dropdownRef}>
          {currentUser.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt="Profile" 
              className="w-8 h-8 rounded-full cursor-pointer object-cover" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full bg-[#4a3b32] text-white flex items-center justify-center cursor-pointer font-bold text-sm" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          
          {isDropdownOpen && (
            <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-md shadow-lg rounded-md overflow-hidden min-w-[120px] flex flex-col z-50">
              <Link href="/profile" className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-[#e5e0d8]/50" onClick={() => setIsDropdownOpen(false)}>
                會員中心
              </Link>
              <Link href="/orders" className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-[#e5e0d8]/50" onClick={() => setIsDropdownOpen(false)}>
                我的訂單
              </Link>
              <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left w-full">
                登出
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 2. 獨立子元件：電腦版 (DesktopNav)
const DesktopNav = ({ links, setIsCartOpen }: { links: typeof navLinks, setIsCartOpen: (open: boolean) => void }) => {
  return (
    // 最外層絕對限制： hidden md:flex
    <div className="hidden md:flex justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto">
      <Link 
        href="/" 
        style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          letterSpacing: '0.1em', 
          color: '#4a3b32', 
          textDecoration: 'none',
          fontFamily: "'Noto Serif TC', serif"
        }}
      >
        漫步食光
      </Link>
      
      {/* 橫向排列的導覽列 */}
      <nav className="flex items-center gap-8">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="text-[#2f3430]/70 hover:text-[#4a3b32] font-medium transition-colors">
            {link.label}
          </Link>
        ))}
      </nav>
      
      <ActionIcons setIsCartOpen={setIsCartOpen} />
    </div>
  );
};

// 2. 獨立子元件：手機版 (MobileNav)
const MobileNav = ({ links, setIsCartOpen }: { links: typeof navLinks, setIsCartOpen: (open: boolean) => void }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    // 最外層絕對限制： block md:hidden
    <div className="block md:hidden w-full relative">
      <div className="flex justify-between items-center px-6 py-4 w-full">
        <Link 
          href="/" 
          style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            letterSpacing: '0.1em', 
            color: '#4a3b32', 
            textDecoration: 'none',
            fontFamily: "'Noto Serif TC', serif"
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          漫步食光
        </Link>
        
        <div className="flex items-center gap-4">
          <ActionIcons setIsCartOpen={setIsCartOpen} />
          {/* 漢堡按鈕 - 透明背景、移除邊框 */}
          <button 
            className="bg-transparent p-1 text-[#4a3b32] hover:bg-gray-100/50 rounded-md transition-colors flex items-center focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* 區塊四：手機版下拉選單 - 毛玻璃質感 */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-md shadow-xl flex flex-col py-4 px-6 z-40 border-t border-[#e5e0d8]/50 rounded-b-2xl">
          {isAdmin && (
            <Link 
              href="/admin" 
              className="flex items-center gap-2 py-4 text-lg text-red-700 font-bold border-b border-[#e5e0d8]/50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-[1.4rem]">admin_panel_settings</span>
              管理後台
            </Link>
          )}
          {links.map((link) => (
            <Link 
              key={link.label} 
              href={link.href} 
              className="block py-4 text-lg text-[#4a3b32] font-medium border-b border-[#e5e0d8]/50 last:border-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. 組合至主元件 (Main Component)
export default function TopNav() {
  const [isScrolled, setIsScrolled] = useState(false); 
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* 主導覽列：套用半透明毛玻璃效果 */}
      <header className={`fixed top-0 w-full flex flex-col z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <DesktopNav links={navLinks} setIsCartOpen={setIsCartOpen} />
      <MobileNav links={navLinks} setIsCartOpen={setIsCartOpen} />
      </header>
      
      {/* 獨立抽屜不受 Navbar 佈局影響 */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}