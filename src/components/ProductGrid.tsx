"use client";

import { useState, useEffect } from 'react';
import styles from './ProductGrid.module.css';
import { useCart } from '@/context/CartContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
};

export default function ProductGrid() {
  const { addToCart } = useCart();
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, 'products'),
          where('isAvailable', '==', true)
        );
        const querySnapshot = await getDocs(q);
        const productsList: Product[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          productsList.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            price: data.price,
            imageUrl: data.imageUrl,
            category: data.category,
          });
        });
        setProductsData(productsList);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.subtitle}>Seasonal Selection</span>
            <h2 className={styles.title}>本月嚴選</h2>
          </div>
          <div className={styles.divider}></div>
          <a href="#" className={styles.link}>查看全部</a>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            商品載入中...
          </div>
        ) : productsData.length === 0 ? (
          <div className={styles.loadingState} style={{ gridColumn: '1 / -1', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
            目前暫無商品
          </div>
        ) : (
          <div className={styles.grid}>
            {productsData.map((p, index) => {
              // 將商業邏輯動態轉換為 UI 渲染邏輯
            const isOffsetY = index % 2 !== 0; // 利用索引讓奇數項產生高低交錯的排版效果
            const tagType = p.category === '年節禮盒' ? 'primary' : 'secondary';

            return (
              <div key={p.id} className={`${styles.card} ${isOffsetY ? styles.offsetY : ''}`}>
                <div className={styles.imageWrapper}>
                  {/* 注意這裡改成了 imageUrl */}
                  <img src={p.imageUrl} alt={p.name} className={styles.image} />
                  <div className={styles.tagWrapper}>
                    <span className={`${styles.tag} ${tagType === 'primary' ? styles.tagPrimary : styles.tagSecondary}`}>
                      {p.category}
                    </span>
                  </div>
                </div>
                {/* 替換為真實的屬性名稱 */}
                <h3 className={styles.cardTitle}>{p.name}</h3>
                <p className={styles.cardDesc}>{p.description}</p>
                <div className={styles.cardFooter}>
                  {/* 將數字價格轉換為帶有千分位的字串，例如 1280 變成 1,280 */}
                  <span className={styles.price}>NT$ {p.price.toLocaleString()}</span>
                  <button 
                    className={styles.addBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart({ 
                        id: p.id, 
                        name: p.name, 
                        price: p.price,
                        imageUrl: p.imageUrl 
                      });
                    }}
                  >
                    <span className="material-symbols-outlined material-icons-filled">add_circle</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}