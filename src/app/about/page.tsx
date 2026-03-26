import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <TopNav />
      <main style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--surface-container-low)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--on-surface)', fontFamily: 'var(--font-heading)' }}>關於我們 / 品牌故事</h1>
          <p style={{ lineHeight: '1.8', color: 'var(--on-surface-variant)', fontSize: '1.1rem' }}>
            把日常，煮成時光。漫步食光在這裡用時間為您淬鍊出沒有化學添加的美好滋味。
            <br/><br/>
            我們深信，真正的美味來自於耐心與純粹的食材。從慢燉系列到符合時令的節氣湯品，
            每一口都是為了讓您在繁忙的生活中，也能擁有一段美好的飲食時光。我們致力於打造最高品質的飲食體驗。
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
