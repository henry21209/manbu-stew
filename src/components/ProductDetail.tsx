"use client";

import { useState } from "react";

// ----------------------------------------------------------------------
// 區塊 A：交易決策區 (Buy Box - 上半部)
// ----------------------------------------------------------------------
function ProductHero() {
  const [quantity, setQuantity] = useState(1);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* 左側：商品主圖 */}
        <div className="aspect-square bg-gray-100 rounded-2xl w-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 relative">
           <span className="text-gray-400 font-medium tracking-widest">商品主圖佔位符</span>
        </div>

        {/* 右側：交易與資訊區 */}
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-[#4a3b32] font-serif tracking-wide leading-tight">
            慢熬老母雞厚白湯禮盒
          </h1>
          <p className="mt-4 text-2xl font-extrabold text-red-700">
            NT$ 1,280
          </p>

          <hr className="my-6 border-gray-200" />

          {/* 數量選擇器佔位符 */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
              數量
            </h3>
            <div className="flex items-center w-max border border-gray-300 rounded-lg overflow-hidden bg-white">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="減少數量"
              >
                -
              </button>
              <div className="px-6 py-2 text-[#4a3b32] font-bold border-x border-gray-300 min-w-[3rem] text-center">
                {quantity}
              </div>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="增加數量"
              >
                +
              </button>
            </div>
          </div>

          {/* 滿版主 CTA 按鈕 */}
          <button className="mt-auto md:mt-0 w-full bg-[#4a3b32] text-white py-4 rounded-xl hover:bg-[#6b5a4e] transition-colors font-bold text-lg shadow-md flex justify-center items-center gap-2 group">
             <span className="material-symbols-outlined group-hover:scale-110 transition-transform">shopping_cart</span>
             加入購物車
          </button>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 區塊 B：深度說服區 (Rich Content - 下半部)
// ----------------------------------------------------------------------
function ProductDetails() {
  const [activeTab, setActiveTab] = useState("商品介紹");
  const tabs = ["商品介紹", "規格說明", "退換貨須知"];

  return (
    <section className="max-w-4xl mx-auto px-4 w-full">
      {/* 頁籤導覽 (Tabs) 視覺骨架 */}
      <div className="flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-lg font-medium transition-colors relative ${
              activeTab === tab
                ? "text-[#4a3b32]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#4a3b32] rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>

      {/* 佔位符：模擬未來長圖文或規格表 */}
      <div className="mt-8 flex flex-col gap-6">
        <div className="h-96 bg-gray-50 rounded-xl w-full flex items-center justify-center border border-gray-100 shadow-inner">
           <span className="text-gray-400 font-medium tracking-wide">行銷長圖文區塊 1 ({activeTab})</span>
        </div>
        <div className="h-96 bg-gray-50 rounded-xl w-full flex items-center justify-center border border-gray-100 shadow-inner">
           <span className="text-gray-400 font-medium tracking-wide">行銷長圖文區塊 2 ({activeTab})</span>
        </div>
        <div className="h-96 bg-gray-50 rounded-xl w-full flex items-center justify-center border border-gray-100 shadow-inner">
           <span className="text-gray-400 font-medium tracking-wide">行銷長圖文區塊 3 ({activeTab})</span>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------
// 最外層主頁面 (Main Page Component)
// ----------------------------------------------------------------------
export default function ProductDetailPage() {
  return (
    <main className="flex flex-col gap-16 pb-20 pt-8 bg-white min-h-screen">
      <ProductHero />
      <ProductDetails />
    </main>
  );
}
