"use client";

import styles from './Newsletter.module.css';

export default function Newsletter() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>加入漫步社群</h2>
        <p className={styles.desc}>訂閱我們的電子報，獲取最新節氣食譜與限時優惠。</p>
        
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="您的電子郵件" 
            className={styles.input}
          />
          <button className={styles.btn}>立即訂閱</button>
        </form>
      </div>
    </section>
  );
}
