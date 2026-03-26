"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import styles from './Profile.module.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import OrdersList from '@/components/OrdersList';

interface UserProfile {
  name: string;
  phone: string;
  address: string;
}

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile Tab States
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    address: ''
  });
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Security Tab States
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || '',
            phone: data.phone || '',
            address: data.address || ''
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsFetching(false);
      }
    };
    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    setMessage('');
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        updatedAt: new Date()
      }, { merge: true });
      
      setMessage('會員資料更新成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage(`更新失敗：${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmNewPassword) {
      setSecurityMessage('兩次輸入的密碼不一致！');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityMessage('新密碼長度必須至少為 6 個字元。');
      return;
    }

    setIsUpdatingPassword(true);
    setSecurityMessage('');
    try {
      await updatePassword(currentUser, newPassword);
      setSecurityMessage('密碼更新成功！');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setSecurityMessage(''), 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert('為了您的帳號安全，請登出後重新登入再修改密碼');
      } else {
        setSecurityMessage(`密碼更新失敗：${error.message}`);
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading || isFetching) {
    return (
      <>
        <TopNav />
        <main className={styles.page}>
          <div className={styles.loading}>載入中...</div>
        </main>
        <Footer />
      </>
    );
  }

  if (!currentUser) return null;

  const isGoogleUser = currentUser.providerData?.some(
    (provider) => provider.providerId === 'google.com'
  );

  return (
    <>
      <TopNav />
      <main className={styles.page}>
        <div className={styles.profileLayout}>
          
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.header}>
              <h1 className={styles.title}>會員中心</h1>
              <p className={styles.subtitle}>{currentUser.email}</p>
            </div>
            
            <div className={styles.tabList}>
              <button 
                className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                個人資料
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('security')}
              >
                帳號安全
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'orders' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                我的訂單 
              </button>
            </div>
          </aside>

          {/* Content */}
          <section className={styles.content}>
            
            {activeTab === 'profile' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>基本資料</h2>
                
                {message && (
                  <div className={`${styles.message} ${message.includes('失敗') ? styles.error : styles.success}`}>
                    {message}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="name" className={styles.label}>姓名</label>
                    <input 
                      id="name" 
                      type="text" 
                      className={styles.input} 
                      value={profile.name} 
                      onChange={e => setProfile({...profile, name: e.target.value})} 
                      placeholder="請輸入您的真實姓名"
                    />
                  </div>
                  
                  <div className={styles.field}>
                    <label htmlFor="phone" className={styles.label}>手機號碼</label>
                    <input 
                      id="phone" 
                      type="tel" 
                      className={styles.input} 
                      value={profile.phone} 
                      onChange={e => setProfile({...profile, phone: e.target.value})} 
                      placeholder="例如: 0912345678"
                    />
                  </div>
                  
                  <div className={styles.field}>
                    <label htmlFor="address" className={styles.label}>預設收件地址</label>
                    <input 
                      id="address" 
                      type="text" 
                      className={styles.input} 
                      value={profile.address} 
                      onChange={e => setProfile({...profile, address: e.target.value})} 
                      placeholder="請輸入您的完整收件地址"
                    />
                  </div>
                  
                  <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                    {isSaving ? '儲存中...' : '儲存資料'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>帳號安全</h2>
                
                {isGoogleUser ? (
                  <div className={styles.googleNotice}>
                    <div className={styles.googleIconWrapper}>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="24" height="24" />
                    </div>
                    <p>您目前使用 Google 帳號綁定登入，如需修改密碼請至 Google 帳戶中心設定。</p>
                  </div>
                ) : (
                  <>
                    {securityMessage && (
                      <div className={`${styles.message} ${securityMessage.includes('失敗') || securityMessage.includes('不一致') || securityMessage.includes('長度') ? styles.error : styles.success}`}>
                        {securityMessage}
                      </div>
                    )}
                    
                    <form onSubmit={handlePasswordUpdate} className={styles.form}>
                      <div className={styles.field}>
                        <label htmlFor="newPassword" className={styles.label}>新密碼</label>
                        <input 
                          id="newPassword" 
                          type="password" 
                          className={styles.input} 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                          placeholder="請輸入新密碼 (至少 6 個字元)"
                          required
                        />
                      </div>
                      
                      <div className={styles.field}>
                        <label htmlFor="confirmNewPassword" className={styles.label}>確認新密碼</label>
                        <input 
                          id="confirmNewPassword" 
                          type="password" 
                          className={styles.input} 
                          value={confirmNewPassword} 
                          onChange={e => setConfirmNewPassword(e.target.value)} 
                          placeholder="請再次輸入新密碼"
                          required
                        />
                      </div>
                      
                      <button type="submit" className={styles.submitBtn} disabled={isUpdatingPassword}>
                        {isUpdatingPassword ? '處理中...' : '更新密碼'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className={styles.card} style={{ padding: '1.5rem' }}>
                <h2 className={styles.cardTitle}>我的訂單</h2>
                <OrdersList />
              </div>
            )}

          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
