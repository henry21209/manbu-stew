"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsLoading(true);
      await loginWithGoogle();
      router.push('/');
    } catch (err: any) {
      setError('Google 登入失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setIsLoading(true);
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError((isRegistering ? '註冊' : '登入') + '失敗：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <TopNav />
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>{isRegistering ? '註冊新帳號' : '會員登入'}</h1>
          
          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            className={styles.googleBtn}
            disabled={isLoading}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className={styles.googleIcon} />
            使用 Google 登入
          </button>

          <div className={styles.divider}>
            <span>或使用 Email</span>
          </div>

          <form onSubmit={handleEmailAuth} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>電子信箱</label>
              <input 
                id="email" 
                type="email" 
                className={styles.input} 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>密碼</label>
              <input 
                id="password" 
                type="password" 
                className={styles.input} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? '處理中...' : (isRegistering ? '立即註冊' : '登入')}
            </button>
          </form>

          <div className={styles.toggleText}>
            {isRegistering ? '已經有帳號了？' : '還沒有帳號？'}
            <button 
              type="button" 
              className={styles.toggleBtn} 
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? '點此登入' : '點此註冊'}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
