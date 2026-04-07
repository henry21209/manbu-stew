export default async function ProductDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. 這裡強制等待 Promise 解析完成
  const resolvedParams = await params;
  // 2. 將解開後的 id 存入新的常數 productId 中
  const productId = resolvedParams.id;

  return (
    <main className="flex flex-col gap-16 pb-20 pt-24">
      {/* 區塊 A：交易決策區 (上半部) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 左側：商品主圖佔位 */}
          <div className="aspect-square bg-gray-200 rounded-2xl flex items-center justify-center">
            <span className="text-gray-400 text-xl">商品圖片區</span>
          </div>
          
          {/* 右側：商品資訊 */}
          <div className="flex flex-col">
            {/* ⚠️ 關鍵修復點：這裡必須使用解開後的 productId，絕對不能寫 params.id */}
            <h1 className="text-3xl font-bold text-[#4a3b32]">商品名稱測試 (ID: {productId})</h1>
            <p className="text-2xl text-red-700 mt-4">NT$ 999</p>
            <hr className="my-6 border-gray-200" />
            <div className="h-20 bg-gray-100 rounded-lg mb-6 flex items-center justify-center text-gray-500">
              規格選擇器區塊
            </div>
            <button className="w-full bg-[#4a3b32] text-white py-4 rounded-xl hover:bg-[#6b5a4e] transition-colors font-bold text-lg">
              加入購物車
            </button>
          </div>
        </div>
      </section>

      {/* 區塊 B：深度說服區 (下半部) */}
      <section className="max-w-4xl mx-auto px-4 w-full">
        <div className="flex gap-8 border-b border-gray-200 pb-4">
          <button className="text-lg font-bold text-[#4a3b32] border-b-2 border-[#4a3b32] pb-4 -mb-[17px]">商品介紹</button>
          <button className="text-lg text-gray-500 pb-4">規格說明</button>
        </div>
        <div className="mt-8 space-y-6">
          <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">行銷長圖文 1</div>
          <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">行銷長圖文 2</div>
        </div>
      </section>
    </main>
  );
}