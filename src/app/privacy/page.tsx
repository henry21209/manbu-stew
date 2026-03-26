import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <TopNav />
      <main style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--surface-container-low)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--surface)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--on-surface)', fontFamily: 'var(--font-heading)' }}>隱私權服務政策</h1>
          
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>隱私權保護聲明</h2>
          <p style={{ lineHeight: '1.8', color: 'var(--on-surface-variant)', fontSize: '1rem' }}>
            漫步食光非常重視您的隱私權。我們所收集的個人資料（包含姓名、電話、電子郵件、地址等）僅用於提供訂單處理、出貨服務以及客戶支援。我們絕對不會將您的資料任意出售、交換或出租給其他團體、個人或私人企業，除非有法律依據或合約義務。
          </p>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: '2rem' }}>資料安全機制</h2>
          <p style={{ lineHeight: '1.8', color: 'var(--on-surface-variant)', fontSize: '1rem' }}>
            我們採用了高度安全的 Firebase Firestore 資料庫進行加密保護。如果您希望刪除帳號或調閱資料，隨時可透過客服信箱與我們聯繫。
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
