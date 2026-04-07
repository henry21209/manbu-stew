"use client";

export interface ProductDisplayProps {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    [key: string]: any;
  };
}

export default function ProductDisplay({ product }: ProductDisplayProps) {
  return (
    <main className="flex flex-col gap-16 pb-20 pt-24">
      {/* 區塊 A：交易決策區 (上半部) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* 左側：真實商品主圖 */}
          <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover object-center"
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
            
            <hr className="my-6 border-gray-200" />
            
            {/* 這裡先保留規格選擇器骨架 */}
            <div className="h-20 bg-gray-100 rounded-lg mb-6 flex items-center justify-center text-gray-500">
              規格選擇器區塊
            </div>
            
            {/* // 未來會在此處接上 onClick={() => addToCart(...)} 邏輯 */}
            <button className="w-full bg-[#4a3b32] text-white py-4 rounded-xl hover:bg-[#6b5a4e] transition-colors font-bold text-lg">
              加入購物車
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
          {/* 動態綁定長文案敘述 */}
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
            {product.description || '目前尚無詳細介紹。'}
          </p>
        </div>
      </section>
    </main>
  );
}
