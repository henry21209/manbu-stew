import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandInfo}>
          <div className={styles.brandTitle}>漫步食光 Stroll & Eat</div>
          <p className={styles.brandSlogan}>
            把日常，煮成時光。<br/>
            堅持天然，無添加的慢燉美學。
          </p>
        </div>

        <div className={styles.navGroup}>
          <div className={styles.groupTitle}>探索</div>
          <ul className={styles.links}>
            <li><a href="#">品牌故事</a></li>
            <li><a href="#">配送政策</a></li>
            <li><a href="#">聯絡我們</a></li>
            <li><a href="#">隱私權服務</a></li>
          </ul>
        </div>

        <div className={styles.socialGroup}>
          <div className={styles.groupTitle}>關注我們</div>
          <div className={styles.socialIcons}>
            <span className="material-symbols-outlined">public</span>
            <span className="material-symbols-outlined">share</span>
            <span className="material-symbols-outlined">mail</span>
          </div>
        </div>

        <div className={styles.copyright}>
          <p>© 2024 漫步食光 Stroll & Eat. 把日常，煮成時光。</p>
        </div>
      </div>
      
      {/* Floating Action Button */}
      <div className={styles.fab}>
        <button className={styles.fabBtn}>
          <span className="material-symbols-outlined material-icons-filled">chat_bubble</span>
        </button>
      </div>
    </footer>
  );
}
