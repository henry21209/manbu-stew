"use client";

import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';
import Image from 'next/image';

export interface ProductDisplayProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    summary?: string;
    [key: string]: any;
  };
}

export default function ProductDisplay({ product }: ProductDisplayProps) {
  const { addToCart } = useCart();

  return (
    <main className="flex flex-col gap-16 pb-20 pt-24">
      {/* 區塊 A：交易決策區 (上半部) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* 左側：真實商品主圖 */}
          <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden relative">
            {product.imageUrl ? (
              <Image 
                src={product.imageUrl} 
                alt={product.name} 
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <span className="text-gray-400">無圖片</span>
            )}
          </div>
          
          {/* 右側：真實商品資訊 */}
          <div className="flex flex-col">
            {/* 動態綁定商品名稱與價格 */}
            <h1 className="text-3xl font-bold text-[#4a3b32]">{product.name}</h1>
            <p className="text-2xl text-red-700 mt-4">NT$ {product.price}</p>
            {product.summary && (
              <p className="text-gray-500 text-sm mt-4 leading-relaxed whitespace-pre-wrap">{product.summary}</p>
            )}
            
            <hr className="my-6 border-gray-200" />
            

            {/* 實作購物車按鈕，包含庫存判斷與提示 */}
            <button 
              className={`w-full text-white py-4 rounded-xl transition-colors font-bold text-lg ${(product.stock ?? 0) <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4a3b32] hover:bg-[#6b5a4e]'}`}
              disabled={(product.stock ?? 0) <= 0}
              onClick={() => {
                addToCart({ 
                  id: product.id, 
                  name: product.name, 
                  price: product.price,
                  imageUrl: product.imageUrl || ''
                });
                toast.success('商品已加入購物車！');
              }}
            >
              {(product.stock ?? 0) <= 0 ? '已售完' : '加入購物車'}
            </button>
          </div>
        </div>
      </section>

      {/* 區塊 B：深度說服區 (下半部) */}
      <section className="max-w-4xl mx-auto px-4 w-full">
        <div className="flex gap-8 border-b border-gray-200 pb-4">
          <button className="text-lg font-bold text-[#4a3b32] border-b-2 border-[#4a3b32] pb-4 -mb-[17px]">
            商品介紹
          </button>
        </div>
        <div className="mt-8">
          {/* 動態綁定長文案敘述 (解析 HTML) */}
          <div className="prose max-w-none text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description || '目前尚無詳細介紹。' }} />
        </div>
      </section>
    </main>
  );
}
