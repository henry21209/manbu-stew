// src/app/product/[id]/page.tsx
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cache } from 'react';
import { Metadata } from 'next';
import ProductDisplay from '@/components/ProductDisplay';
import TopNav from '@/components/TopNav';

// 被快取的資料獲取函式 (React Cache)，確保在 Server Components 與 Metadata 產生中不會重複呼叫 DB
const getProduct = cache(async (id: string) => {
  const docRef = doc(db, 'products', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    price: data.price,
    imageUrl: data.imageUrl,
    description: data.description || '',
    summary: data.summary || '',
    category: data.category || '',
    stock: data.stock || 0,
  };
});

// 動態 Meta Tags
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) return { title: '商品不存在 | 漫步食光' };

  return {
    title: `${product.name} | 漫步食光`,
    description: product.summary || '漫步食光精心熬煮',
    openGraph: {
      title: product.name,
      description: product.summary || '漫步食光精心熬煮',
      images: [product.imageUrl || ''],
    },
  };
}

export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    return notFound();
  }

  return (
    <>
      <TopNav />
      <ProductDisplay product={product} />
    </>
  );
}