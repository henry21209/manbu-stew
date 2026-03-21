import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.bgWrapper}>
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSwcvQrgC94_V7pR4EQgps3nRue9NKNou8-esSmJh0xcxRRuBWIm56iAWqLH-4vnYNQ6NMnvyFYWUHnPh8MNUwP4tI9jZoxxZeRlpPJf4MoSkAYlv41bOznXcvi_twgWQYAC1mwHnFDlNmAbiZKa_cwskYjlhr-QxN8wIHCmEIS3t_XjLQaU6dEHQV_b5-o8MO2RM_rYEfRG7LK3m8NfiN4abue7PbzU6etqmc_lP2tMP7KFhcTucnDKNCLc7Uztcm0oJ7Hfy0Zw"
          alt="Minimalist kitchen scene with warm sunlight and organic vegetables"
          className={styles.bgImage}
        />
        <div className={styles.overlay}></div>
      </div>
      
      <div className={styles.content}>
        <h1 className={styles.title}>
          慢慢生活，<br/>好好吃飯。
        </h1>
        <p className={styles.subtitle}>
          選用在地小農食材，慢燉入味。讓忙碌的日常，也能品味純淨滋味。
        </p>
        <div>
          <button className="btn-primary">
            探索慢燉系列
          </button>
        </div>
      </div>
    </section>
  );
}
