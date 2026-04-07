"use client";

import { useState, useEffect, use } from "react";
// 引入我們剛才抽離的純展示分離元件！
import ProductDisplay from '@/components/ProductDisplay';
// Firebase Storage
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function AdminProductLivePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [formData, setFormData] = useState({
    id: productId === 'new' ? '預覽ID' : productId,
    name: '',
    price: 0,
    imageUrl: '',
    description: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  // 輔助函式：攔截 Input 並轉入 state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 圖片上傳邏輯處理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 建立對應 Storage 的唯二 ref
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // 可在此處實作進度條
        },
        (error) => {
          console.error("圖片上傳失敗:", error);
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error("圖片上傳發生非預期錯誤:", error);
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("準備儲存商品資料：", formData);
    // TODO: 呼叫 Firebase API 寫入 Database
  };

  useEffect(() => {
    if (productId !== 'new') {
      console.log(`偵測到編輯模式，準備撈取 ID: ${productId} 舊資料...`);
    }
  }, [productId]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      
      <div className="max-w-[1600px] mx-auto flex justify-between items-center bg-white p-4 px-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-[#4a3b32] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6d8c54]">edit_document</span>
            {productId === 'new' ? '新增商品' : '編輯商品資訊'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            資料即時綁定：在左側輸入，馬上於右側檢視前台真實呈現樣貌。
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="px-8 py-3 bg-[#4a3b32] text-white font-bold rounded-xl shadow-md hover:bg-[#6b5a4e] transition-colors active:scale-[0.98] flex gap-2 items-center"
        >
          <span className="material-symbols-outlined text-[1.2rem]">cloud_upload</span>
          儲存商品
        </button>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        
        <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-3">資料填寫區</h2>
          
          <form className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">商品名稱</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="例如：老母雞厚白湯"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">售價 (NT$)</label>
              <input
                type="number"
                name="price"
                min="0"
                value={formData.price || ''}
                onChange={handleChange}
                placeholder="例如：1280"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white"
              />
            </div>

            {/* 修改為主圖上傳區塊 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">主圖上傳</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="w-full p-2 border border-gray-300 rounded-lg outline-none transition-shadow bg-gray-50 focus:bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#4a3b32] file:text-white hover:file:bg-[#6b5a4e] cursor-pointer disabled:opacity-50"
              />
              {isUploading && (
                <p className="text-sm text-[#6d8c54] font-bold mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  圖片上傳中...
                </p>
              )}
              {formData.imageUrl && !isUploading && (
                <p className="text-xs text-gray-500 mt-1 truncate">目前圖片: {formData.imageUrl}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">商品詳細描述</label>
              <textarea
                name="description"
                rows={8}
                value={formData.description}
                onChange={handleChange}
                placeholder="這段文字將無縫對推至前台的商品介紹區..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white resize-y leading-relaxed"
              ></textarea>
            </div>

          </form>
        </section>

        <section className="border-4 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-white shadow-sm relative min-h-[800px] h-fit">
          <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-xs font-extrabold px-4 py-1.5 rounded-br-lg z-50 flex items-center gap-1 shadow-sm tracking-wider uppercase">
             <span className="material-symbols-outlined text-[16px]">visibility</span>
             LIVE 顧客視角預覽
          </div>
          
          <div className="w-full h-full lg:scale-95 origin-top relative z-0">
             <ProductDisplay product={formData} />
          </div>
          
          {!formData.name && !formData.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <span className="text-5xl font-bold text-gray-300 transform -rotate-12">LIVE PREVIEW</span>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
