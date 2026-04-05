"use client";

import { useState, useEffect } from 'react';
import styles from './ProductGrid.module.css';
import { useCart } from '@/context/CartContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock?: number;
};

export default function ProductGrid() {
  const { addToCart } = useCart();
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 分類相關 state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // 排序相關 state
  const [sortOrder, setSortOrder] = useState<string>('default');

  // 抓取所有分類
  useEffect(() => {
    async function fetchCategories() {
      try {
        const q = query(collection(db, 'categories')); // 可視需求改為 query(..., orderBy('order'))
        const querySnapshot = await getDocs(q);
        const categoriesList: { id: string; name: string }[] = [];
        querySnapshot.forEach((doc) => {
          // 若分類有 name 欄位則使用，否則使用 doc.id
          const name = doc.data().name || doc.id;
          categoriesList.push({ id: doc.id, name });
        });
        setCategories(categoriesList);
      } catch (error) {
        // 靜默處理：若尚未建立 categories 集合，則僅返回預設空陣列，維持 Console 乾淨專業
        setCategories([]);
      }
    }

    fetchCategories();
  }, []);

  // 抓取商品並依賴 activeCategory 與 sortOrder
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const constraints: any[] = [
          where('isAvailable', '==', true)
        ];

        if (activeCategory !== 'All') {
          constraints.push(where('category', '==', activeCategory));
        }

        if (sortOrder === 'price_asc') {
          constraints.push(orderBy('price', 'asc'));
        } else if (sortOrder === 'price_desc') {
          constraints.push(orderBy('price', 'desc'));
        }

        const q = query(collection(db, 'products'), ...constraints);
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
            stock: data.stock || 0,
          });
        });
        setProductsData(productsList);
      } catch (error: any) {
        console.error("Failed to fetch products. This might be due to a missing Firestore composite index:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [activeCategory, sortOrder]);
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

        {/* 分類切換按鈕與排序 */}
        <div className={styles.controlsContainer}>
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tabBtn} ${activeCategory === 'All' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              全部商品
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.tabBtn} ${activeCategory === cat.name ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className={styles.sortContainer}>
            <select
              className={styles.sortSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="default">預設排序</option>
              <option value="price_asc">價格：由低到高</option>
              <option value="price_desc">價格：由高到低</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            商品載入中...
          </div>
        ) : productsData.length === 0 ? (
          <div className={styles.loadingState} style={{ gridColumn: '1 / -1', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
            目前此分類暫無商品
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
                    className={`${styles.addBtn} ${(p.stock ?? 0) <= 0 ? styles.disabledBtn : ''}`}
                    disabled={(p.stock ?? 0) <= 0}
                    style={{ opacity: (p.stock ?? 0) <= 0 ? 0.6 : 1, cursor: (p.stock ?? 0) <= 0 ? 'not-allowed' : 'pointer', transition: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((p.stock ?? 0) <= 0) return;
                      addToCart({ 
                        id: p.id, 
                        name: p.name, 
                        price: p.price,
                        imageUrl: p.imageUrl 
                      });
                    }}
                  >
                    {(p.stock ?? 0) <= 0 ? <span style={{fontSize: '0.8rem', fontWeight: 600, padding: '0 8px'}}>售完補貨中</span> : <span className="material-symbols-outlined material-icons-filled">add_circle</span>}
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