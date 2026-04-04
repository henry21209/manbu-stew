"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { z } from 'zod';
import { TAIWAN_DISTRICTS } from '@/lib/taiwan-data';
import styles from './Profile.module.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import OrdersList from '@/components/OrdersList';

// 企業級聯防：嚴格的表單驗證 Schema，包含 Transform 寬容轉換與連動校驗邏輯
const profileSchema = z.object({
  name: z.string().min(2, '請輸入完整的真實姓名'),
  phone: z.string()
          .transform(val => val.replace(/[-_ ]/g, ''))
          .pipe(z.string().regex(/^09\d{8}$/, '請輸入有效的手機號碼 (例如: 0912345678)')),
  city: z.string().refine(val => Object.keys(TAIWAN_DISTRICTS).includes(val), { message: '無效的縣市選項' }),
  district: z.string().min(1, '請選擇行政區'),
  detailAddress: z.string().min(5, '請輸入完整的聯絡街道門牌 (不含縣市區)'),
}).superRefine((data, ctx) => {
  if (data.city) {
    const validDistricts = TAIWAN_DISTRICTS[data.city];
    if (!validDistricts || !validDistricts.includes(data.district)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['district'],
        message: '您選擇的行政區不存在於該縣市中，請勿竄改資料'
      });
    }
  }
});

interface UserProfile {
  name: string;
  phone: string;
  city: string;
  district: string;
  detailAddress: string;
}

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile Tab States
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    city: '',
    district: '',
    detailAddress: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
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
            city: data.city || '',
            district: data.district || '',
            detailAddress: data.detailAddress || data.address || '' // 容忍對接到舊欄位
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
    // Zod Validation 進行資料淨化檢核
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      for (const [key, val] of Object.entries(result.error.flatten().fieldErrors)) {
        if (val && val.length > 0) formattedErrors[key] = val[0];
      }
      setErrors(formattedErrors);
      return;
    }
    
    setErrors({});
    setIsSaving(true);
    setMessage('');
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const validData = result.data;
      
      await setDoc(userRef, {
        name: validData.name,
        phone: validData.phone,
        city: validData.city,
        district: validData.district,
        detailAddress: validData.detailAddress,
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
                    {errors.name && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.name}</p>}
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
                    {errors.phone && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.phone}</p>}
                  </div>
                  
                  <div className={styles.field}>
                    <label className={styles.label}>預設收件地址</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <select 
                        className={styles.select || styles.input} 
                        name="city" 
                        value={profile.city} 
                        onChange={e => setProfile({...profile, city: e.target.value, district: ''})}
                        style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        <option value="">選擇縣市</option>
                        {Object.keys(TAIWAN_DISTRICTS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      
                      <select 
                        className={styles.select || styles.input} 
                        name="district" 
                        value={profile.district} 
                        onChange={e => setProfile({...profile, district: e.target.value})}
                        style={{ flex: 1, padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
                        disabled={!profile.city}
                      >
                        <option value="">選擇區域</option>
                        {profile.city && TAIWAN_DISTRICTS[profile.city]?.map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {(errors.city || errors.district) && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.city || errors.district}</p>}
                    
                    <input 
                      id="detailAddress" 
                      type="text" 
                      className={styles.input} 
                      value={profile.detailAddress} 
                      onChange={e => setProfile({...profile, detailAddress: e.target.value})} 
                      placeholder="復興南路一段 100 號 5 樓..." 
                    />
                    {errors.detailAddress && <p className="text-red-500 text-sm mt-1" style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.detailAddress}</p>}
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
