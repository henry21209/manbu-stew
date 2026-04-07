"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 路由守衛機制：不在 loading 狀態中且查無 user 時踢除
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  // 全螢幕 Loading 防止 FOUC (畫面閃爍)
  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a3b32]"></div>
        <p className="mt-4 text-gray-500 font-medium">後台權限驗證中...</p>
      </div>
    );
  }

  // 驗證成功，正常渲染 Admin 下的子頁籤
  return <>{children}</>;
}
