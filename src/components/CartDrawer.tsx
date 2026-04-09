"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './CartDrawer.module.css';
import { useCart } from '@/context/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function QuantityInput({ item, setQuantity }: { item: { id: string, quantity: number }, setQuantity: (id: string, qty: number) => void }) {
  const [inputValue, setInputValue] = useState(item.quantity.toString());

  useEffect(() => {
    setInputValue(item.quantity.toString());
  }, [item.quantity]);

  return (
    <input 
      type="number"
      className={styles.qtyInput}
      value={inputValue}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const val = e.target.value;
        setInputValue(val); // 允許使用者暫時將值清空為字串 '' 方便重打
        
        const numeric = parseInt(val);
        if (!isNaN(numeric) && numeric > 0) {
          setQuantity(item.id, Math.min(999, numeric));
        }
      }}
      onBlur={() => {
        const numeric = parseInt(inputValue);
        if (isNaN(numeric) || numeric < 1) {
          setInputValue('1');
          setQuantity(item.id, 1);
        } else {
          setInputValue(Math.min(999, numeric).toString());
        }
      }}
    />
  );
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, updateQuantity, setQuantity, removeFromCart, totalPrice } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} 
        onClick={onClose}
      />
      
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>購物車</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.content}>
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <p>購物車內還沒有商品喔～</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className={styles.item}>
                <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemPrice}>NT$ {item.price.toLocaleString()}</div>
                  <div className={styles.quantityControl}>
                    <button 
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
                    </button>
                    
                    <QuantityInput item={item} setQuantity={setQuantity} />

                    <button 
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button 
                      className={styles.rmBtn}
                      onClick={() => removeFromCart(item.id)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>總計</span>
              <span className={styles.totalAmount}>NT$ {totalPrice.toLocaleString()}</span>
            </div>
            <Link href="/checkout" className={styles.checkoutBtn} onClick={onClose}>
              前往結帳
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
