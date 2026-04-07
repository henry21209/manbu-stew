"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock?: number;
};

export default function ProductGrid() {
  const { addToCart } = useCart();
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 分類相關 state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // 排序相關 state
  const [sortOrder, setSortOrder] = useState<string>('default');

  // 抓取所有分類
  useEffect(() => {
    async function fetchCategories() {
      try {
        const q = query(collection(db, 'categories'));
        const querySnapshot = await getDocs(q);
        const categoriesList: { id: string; name: string }[] = [];
        querySnapshot.forEach((doc) => {
          const name = doc.data().name || doc.id;
          categoriesList.push({ id: doc.id, name });
        });
        setCategories(categoriesList);
      } catch (error) {
        setCategories([]);
      }
    }

    fetchCategories();
  }, []);

  // 抓取商品定邏輯
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const constraints: any[] = [
          where('isAvailable', '==', true)
        ];

        if (activeCategory !== 'All') {
          constraints.push(where('category', '==', activeCategory));
        }

        if (sortOrder === 'price_asc') {
          constraints.push(orderBy('price', 'asc'));
        } else if (sortOrder === 'price_desc') {
          constraints.push(orderBy('price', 'desc'));
        }

        const q = query(collection(db, 'products'), ...constraints);
        const querySnapshot = await getDocs(q);
        const productsList: Product[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          productsList.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            price: data.price,
            imageUrl: data.imageUrl,
            category: data.category,
            stock: data.stock || 0,
          });
        });
        setProductsData(productsList);
      } catch (error: any) {
        console.error("Failed to fetch products. This might be due to a missing Firestore composite index:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [activeCategory, sortOrder]);

  return (
    <section className="w-full py-20 bg-white">
      <div className="max-w-[1440px] mx-auto px-6">
        
        {/* Header 區塊 */}
        <div className="flex justify-between items-end mb-10">
          <div className="flex flex-col gap-1">
            <span className="text-sm tracking-widest text-[#6d8c54] uppercase font-bold">Seasonal Selection</span>
            <h2 className="text-4xl font-bold text-[#4a3b32] font-serif tracking-wide border-l-4 border-[#6d8c54] pl-4">本月嚴選</h2>
          </div>
          <div className="h-[1px] bg-[#e5e0d8] flex-1 mx-8 mb-3 hidden md:block"></div>
          <a href="#" className="hidden md:inline-block text-[#4a3b32] hover:text-[#6d8c54] font-medium transition-colors border-b border-[#4a3b32] hover:border-[#6d8c54] pb-1">查看全部</a>
        </div>

        {/* 控制面板：分類切換與排序 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-5 py-2 rounded-full border border-[#e5e0d8] text-sm font-medium transition-all duration-300 ${activeCategory === 'All' ? 'bg-[#4a3b32] text-white border-transparent shadow-md' : 'text-[#4a3b32] hover:bg-[#fafafa]'}`}
              onClick={() => setActiveCategory('All')}
            >
              全部商品
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`px-5 py-2 rounded-full border border-[#e5e0d8] text-sm font-medium transition-all duration-300 ${activeCategory === cat.name ? 'bg-[#4a3b32] text-white border-transparent shadow-md' : 'text-[#4a3b32] hover:bg-[#fafafa]'}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-auto">
            <select
              className="w-full appearance-none bg-white border border-[#e5e0d8] rounded-full px-6 py-2.5 pr-10 text-sm text-[#4a3b32] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6d8c54]/30 focus:border-[#6d8c54] cursor-pointer transition-all"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="default">預設排序設定</option>
              <option value="price_asc">價格：由低到高</option>
              <option value="price_desc">價格：由高到低</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#4a3b32]">
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: '1.2rem' }}>expand_more</span>
            </div>
          </div>
        </div>

        {/* 1. 父容器 (Grid Container)：遵循 Tailwind RWD 嚴格規範 */}
        {isLoading ? (
          <div className="w-full py-32 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4a3b32]"></div>
          </div>
        ) : productsData.length === 0 ? (
          <div className="col-span-full py-32 text-center text-gray-400 font-medium tracking-widest bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            目前此分類暫無商品
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {productsData.map((p) => {
              const tagType = p.category === '年節禮盒' ? 'primary' : 'secondary';

              return (
                // 2. 商品卡片子元素 (Product Card)
                <Link key={p.id} href={`/product/${p.id}`} className="flex flex-col group cursor-pointer transition-all duration-300 hover:-translate-y-1">
                  
                  {/* 圖片區塊：固定長寬比 4:5，外層 overflow-hidden 呈現遮罩 */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100 shadow-sm border border-gray-100">
                    {/* Badge 標籤 */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`px-4 py-1.5 text-xs font-bold rounded-full tracking-wider ${tagType === 'primary' ? 'bg-[#d32f2f] text-white shadow-md' : 'bg-white/90 backdrop-blur-sm text-[#4a3b32] shadow-sm'}`}>
                        {p.category}
                      </span>
                    </div>

                    {/* 圖片本身：設定 object-cover 並且加上 hover 放大互動 */}
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-500" 
                      loading="lazy"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>

                  {/* 文字區塊：確保高度排版整齊 */}
                  <div className="mt-5 flex justify-between flex-col flex-1 px-1">
                    <div>
                      <h3 className="text-xl font-bold text-[#4a3b32] transition-colors group-hover:text-[#6d8c54]">{p.name}</h3>
                      <p className="mt-2 text-sm text-[#8c827a] line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>

                    {/* 售價與追蹤按鈕 */}
                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                      <span className="text-lg font-extrabold text-[#4a3b32]">
                        NT$ {p.price.toLocaleString()}
                      </span>
                      
                      <button 
                        className={`flex items-center justify-center p-2 rounded-full transition-all duration-300 active:scale-95 ${(p.stock ?? 0) <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#f4efe9] text-[#4a3b32] hover:bg-[#6d8c54] hover:text-white hover:shadow-md'}`}
                        disabled={(p.stock ?? 0) <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((p.stock ?? 0) <= 0) return;
                          addToCart({ 
                            id: p.id, 
                            name: p.name, 
                            price: p.price,
                            imageUrl: p.imageUrl 
                          });
                        }}
                        aria-label="加入購物車"
                      >
                        {(p.stock ?? 0) <= 0 ? (
                          <span className="text-xs font-bold px-2 whitespace-nowrap">售完</span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_shopping_cart</span>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}