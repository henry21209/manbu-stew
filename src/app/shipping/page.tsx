import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function ShippingPage() {
  return (
    <>
      <TopNav />
      <main style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--surface-container-low)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--on-surface)', fontFamily: 'var(--font-heading)' }}>配送政策</h1>
          
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>1. 配送範圍與方式</h2>
          <p style={{ lineHeight: '1.8', color: 'var(--on-surface-variant)', fontSize: '1rem' }}>
            我們目前提供全台冷凍低溫宅配服務，確保餐點的新鮮度與最佳風味。針對偏遠地區或離島將有額外的運費規範。
          </p>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>2. 出貨時程</h2>
          <p style={{ lineHeight: '1.8', color: 'var(--on-surface-variant)', fontSize: '1rem' }}>
            在確認您的訂單與款項後，我們將於 1-3 個工作天內安排出貨。遇節慶檔期將另行公告異動時間，物流配送實際所需時間依照宅配公司為主。
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
