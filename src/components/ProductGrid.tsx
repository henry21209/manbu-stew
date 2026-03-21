"use client";

// 匯入 CSS 模組
import styles from './ProductGrid.module.css';
// 匯入我們剛才建立的真實 Mock 資料 (請確認相對路徑是否正確，通常是往上兩層)
import productsData from '../../data/products.json';
import { useCart } from '@/context/CartContext';

export default function ProductGrid() {
  const { addToCart } = useCart();
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

        <div className={styles.grid}>
          {/* 改用匯入的 productsData，並加入 index 參數 */}
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
      </div>
    </section>
  );
}