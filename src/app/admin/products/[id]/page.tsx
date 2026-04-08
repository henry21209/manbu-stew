"use client";

import { useState, useEffect, use, useMemo, useRef, useCallback } from "react";
// 引入我們剛才抽離的純展示分離元件！
import ProductDisplay from '@/components/ProductDisplay';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
const ReactQuill: any = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <p className="text-sm text-gray-500 font-bold py-4">載入編輯器中...</p> 
});
import { doc, getDoc, collection, query, where, getDocs, writeBatch, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function AdminProductLivePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  const reactQuillRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    id: productId === 'new' ? '預覽ID' : productId,
    name: '',
    price: 0,
    imageUrl: '',
    description: '',
    summary: '',
    stock: 0,
    category: '',
    tags: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['慢燉系列', '節氣湯品', '年節禮盒']);

  // 輔助函式：攔截 Input 並轉入 state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddCategory = () => {
    const newCat = window.prompt("請輸入新分類名稱");
    if (newCat && newCat.trim()) {
      const trimmedCat = newCat.trim();
      setCategories(prev => {
        if (!prev.includes(trimmedCat)) {
          return [...prev, trimmedCat];
        }
        return prev;
      });
      setFormData(prev => ({ ...prev, category: trimmedCat }));
    }
  };

  const handleDeleteCategory = async () => {
    if (!formData.category) {
      toast.error('請先選擇要刪除的分類');
      return;
    }

    const confirmDelete = window.confirm(`確定要刪除「${formData.category}」分類嗎？系統將會把原屬於此分類的商品自動設為「未分類」。`);
    if (!confirmDelete) return;

    const toastId = toast.loading('正在同步更新關聯商品並刪除分類...');

    try {
      const q = query(collection(db, 'products'), where('category', '==', formData.category));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      
      snapshot.forEach((productDoc) => {
        batch.update(productDoc.ref, { category: '未分類' });
      });

      // 註記：如果你有後端集合 (Collection) 專門儲存分類，可在此呼叫 batch.delete
      // batch.delete(doc(db, 'categories', formData.category));

      await batch.commit();

      setCategories(prev => prev.filter(c => c !== formData.category));
      setFormData(prev => ({ ...prev, category: '未分類' }));
      toast.success('分類已成功刪除！', { id: toastId });
    } catch (error) {
      console.error("刪除分類並同步商品狀態發生錯誤:", error);
      toast.error('同步更新過程中發生錯誤，請稍後再試', { id: toastId });
    }
  };

  // 自定義圖片攔截器 (Custom Image Handler)
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const toastId = toast.loading('圖片上傳至 Cloudinary 中...');

      try {
        const formData = new FormData();
        // Cloudinary 規定的 key 是 'file'
        formData.append('file', file); 
        // 帶入你的 Unsigned Upload Preset
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        
        // 發送 POST 請求到 Cloudinary 的 REST API
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || '圖床 API 拒絕請求');
        }

        const data = await response.json();
        
        // Cloudinary 會回傳一個 secure_url (HTTPS 網址)，這就是我們要的！
        const downloadURL = data.secure_url; 

        // 將 URL 塞回 Quill 編輯器
        const quill = reactQuillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', downloadURL);
        quill.setSelection(range.index + 1);

        toast.success('圖片上傳成功！', { id: toastId });
        
      } catch (error) {
        console.error("Cloudinary 上傳失敗:", error);
        toast.error('上傳失敗，請檢查環境變數與 Preset 設定', { id: toastId });
      }
    };
  }, []);

  // Quill 編輯器的自定義工具列與模組設定
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler // 綁定原生攔截器
      }
    }
  }), []);

  // 主圖上傳邏輯處理 (切換為 Cloudinary API)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('主圖上傳至 Cloudinary 中...');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '圖床 API 拒絕請求');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
      toast.success('主圖上傳成功！', { id: toastId });
    } catch (error) {
      console.error("Cloudinary 主圖上傳發生非預期錯誤:", error);
      toast.error('上傳失敗，請檢查環境變數與 Preset 設定', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.price <= 0) {
      toast.error('請填寫完整商品名稱以及有效的價格');
      return;
    }
    
    setIsUploading(true);
    const toastId = toast.loading('儲存商品資料中...');

    try {
      const productData = {
        name: formData.name,
        price: Number(formData.price),
        imageUrl: formData.imageUrl,
        description: formData.description,
        summary: formData.summary,
        stock: Number(formData.stock),
        category: formData.category || '未分類',
        tags: formData.tags,
        updatedAt: new Date().toISOString(),
      };

      if (productId === 'new') {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date().toISOString(),
          isAvailable: true,
        });
        toast.success('商品已成功新增！', { id: toastId });
      } else {
        const docRef = doc(db, 'products', productId);
        await updateDoc(docRef, productData);
        toast.success('商品資訊更新成功！', { id: toastId });
      }

      router.push('/admin');

    } catch (error) {
      console.error('儲存商品失敗:', error);
      toast.error('儲存發生錯誤，請稍後重試', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (productId === 'new') {
        setIsLoading(false);
        return;
      }
      
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData(prev => ({
            ...prev,
            name: data.name || '',
            price: data.price || 0,
            imageUrl: data.imageUrl || '',
            description: data.description || '',
            summary: data.summary || '',
            stock: data.stock || 0,
            category: data.category || '',
            tags: data.tags || '',
          }));
        } else {
          toast.error('找不到該商品資料');
        }
      } catch (error) {
        console.error('讀取商品資料失敗:', error);
        toast.error('讀取資料發生錯誤');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl font-bold text-[#4a3b32] flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin">sync</span>
          載入商品資料中...
        </p>
      </div>
    );
  }

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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">分類</label>
                <div className="flex gap-2">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white"
                  >
                    <option value="">請選擇</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleAddCategory}
                    className="px-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    + 新增
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDeleteCategory}
                    className="px-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap flex items-center justify-center p-0"
                    title="刪除當前分類"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">庫存數量</label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  value={formData.stock === undefined ? '' : formData.stock}
                  onChange={handleChange}
                  placeholder="例如：100"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">標籤 (用逗號分隔)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="例如：最新, 推薦, 熱門"
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
              <label className="text-sm font-bold text-gray-700">商品概述 (顯示於首頁卡片，建議 50 字內)</label>
              <textarea
                name="summary"
                rows={3}
                maxLength={100}
                value={formData.summary}
                onChange={handleChange}
                placeholder="在此輸入簡短的商品特色，吸引顧客點擊..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4a3b32] outline-none transition-shadow bg-gray-50 focus:bg-white resize-none"
              />
            </div>


            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">商品詳細描述</label>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-[#4a3b32] transition-shadow">
                <ReactQuill 
                  ref={reactQuillRef as any}
                  theme="snow" 
                  value={formData.description} 
                  onChange={(content: string) => setFormData({ ...formData, description: content })} 
                  modules={quillModules}
                />
              </div>
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
