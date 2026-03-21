import styles from './BrandStory.module.css';


export default function BrandStory() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.subtitle}>Our Philosophy</span>
          <h2 className={styles.title}>把日常，煮成時光</h2>
          <div className={styles.textWrapper}>
            <p>在漫步食光，我們相信食物不只是溫飽，更是一種生活的慢節奏。細心挑選每一份天然食材，以慢火溫潤燉煮，將四季的豐饒鎖進每一份冷凍餐點中。</p>
            <p>讓您在快節奏的都市生活中，只需片刻加熱，就能重拾家的溫度與安心。每一口，都是對身體與心靈的細心呵護。</p>
          </div>
          <div className={styles.signature}>
            <div className={styles.line}></div>
            <span>Stroll & Eat Team</span>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.visualWrapper}>
            <div className={styles.frame}></div>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIM7q-ZDkKfnY6qhMYA3QSh-fJSmgBjkxo46MRmmfTvGdXWrqgacENsXss7qJl3F1SuyHll2wTusW4FgTO-TqeClxw7pv9BqjbQ2V5I1iPURUmKyi4pjihnDfmp3LhABwYpaFeT8JsHmLfmOyk41VPMUO2NnPAhXvQmpEKaHLNG46X5DTiST6DHcH7uel1rQMDAWqWPfR8uxU56TwHVkAjIRVIcE0LYRnUxtIJ4oZZWDj5hSOG4d-dkBRj9Zdl6TvCRoavqc35UA"
              alt="Calm hands sorting fresh green herbs"
              className={styles.image}
            />
            <div className={styles.quoteCard}>
              <p>"讓忙碌暫停，與自己好好對話。"</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
