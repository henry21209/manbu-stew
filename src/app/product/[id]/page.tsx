// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; 
import ProductDisplay from '@/components/ProductDisplay';

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. 解開動態路由參數
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  // 2. 在伺服器端向 Firestore 發起請求 (SSR)
  const docRef = doc(db, 'products', productId);
  const docSnap = await getDoc(docRef);

  // 3. 處理 404 找不到商品的情況
  if (!docSnap.exists()) {
    return notFound(); // 自動導向 Next.js 的 404 頁面，SEO 友善
  }

  // 4. 提取真實商品資料整合入強型別格式
  const data = docSnap.data();
  const product = {
    id: docSnap.id,
    name: data.name,
    price: data.price,
    imageUrl: data.imageUrl,
    description: data.description || '',
    category: data.category || '',
  };

  // 5. 渲染純展示元件，完美分離前後端權責
  return <ProductDisplay product={product} />;
}