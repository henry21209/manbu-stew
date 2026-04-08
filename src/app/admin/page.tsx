"use client";

import { useState, useEffect, Fragment } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, query, orderBy, writeBatch, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  buyer: {
    name: string;
    phone: string;
    address: string;
    payment: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: any; 
  orderMonth?: string;
};

type ShopProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string;
  tags?: string[];
  stock?: number;
  isAvailable?: boolean;
};

type Category = {
  id: string;
  name: string;
};
import styles from "./Admin.module.css";

const statusConfig: Record<string, { label: string, color: string, badgeBg: string, badgeText: string }> = {
  pending: { label: '待處理', color: 'bg-yellow-100 text-yellow-800', badgeBg: '#FEF3C7', badgeText: '#92400E' },
  paid: { label: '已付款', color: 'bg-green-100 text-green-800', badgeBg: '#D1FAE5', badgeText: '#065F46' },
  shipped: { label: '已出貨', color: 'bg-blue-100 text-blue-800', badgeBg: '#DBEAFE', badgeText: '#1E40AF' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', badgeBg: '#F3F4F6', badgeText: '#1F2937' },
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  // 權限分層驗證
  const [userRole, setUserRole] = useState<string | null>(null);
  const isSuperAdmin = userRole === 'super_admin';

  // Dashboard Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Revenue Analysis State
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Trend Analysis State
  const [selectedTrendProduct, setSelectedTrendProduct] = useState<string>("");
  const [trendOrders, setTrendOrders] = useState<Order[]>([]);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  // Add Product State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    category: "",
    description: "",
    tags: "",
    stock: 0,
    isAvailable: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Tab Routing
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'products'>('orders');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        try {
          const roleDoc = await getDoc(doc(db, "admin_roles", currentUser.email));
          if (roleDoc.exists()) {
            setUserRole(roleDoc.data().role);
          } else {
            setUserRole('staff');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('staff');
        }
      } else {
        setUserRole(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const fetchedProducts: ShopProduct[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedProducts.push({ id: docSnap.id, ...docSnap.data() } as ShopProduct);
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoadingOrders(true);
    try {
      let q;
      if (activeTab === 'analytics' && selectedMonth) {
        q = query(
          collection(db, "orders"), 
          where('orderMonth', '==', selectedMonth), 
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      setOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      if (error.message && error.message.includes('index')) {
        alert('Firestore 需要建立複合索引才能支援此查詢。請看 Console 的錯誤訊息，點擊連結即可自動在 Firebase 建立該索引。');
      }
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const getLast6Months = () => {
    const months = [];
    const d = new Date();
    d.setDate(1); // Set to 1st to avoid end-of-month skipping issues
    for (let i = 5; i >= 0; i--) {
      const pastDate = new Date(d);
      pastDate.setMonth(d.getMonth() - i);
      months.push(`${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  };
  const last6Months = getLast6Months();

  const fetchTrendOrders = async () => {
    if (!user || activeTab !== 'analytics') return;
    setIsLoadingTrend(true);
    try {
      const sixMonthsAgo = last6Months[0]; // oldest month
      const q = query(
        collection(db, "orders"),
        where('orderMonth', '>=', sixMonthsAgo),
        orderBy('orderMonth', 'asc') // This requires an index possibly, but usually where on str implies order
      );
      const querySnapshot = await getDocs(q);
      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      setTrendOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Error fetching trend orders:", error);
      if (error.message && error.message.includes('index')) {
        alert('Firestore 需要建立複合索引： orderMonth (asc) 才能支援趨勢查詢。');
      }
    } finally {
      setIsLoadingTrend(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user, activeTab, selectedMonth]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchTrendOrders();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!user) return;

    async function fetchCategories() {
      try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const fetchedCategories: Category[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedCategories.push({ id: docSnap.id, ...docSnap.data() } as Category);
        });
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    }

    fetchProducts();
    fetchCategories();
  }, [user]);

  const handleEditPrice = async (productId: string, oldPrice: number) => {
    const newPriceStr = window.prompt("請輸入新價格 NT$：", String(oldPrice));
    if (newPriceStr === null) return;
    
    const newPrice = Number(newPriceStr);
    if (isNaN(newPrice) || newPrice < 0) {
      alert("請輸入有效的數字價格");
      return;
    }

    setUpdatingProductId(productId);
    try {
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, { price: newPrice });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
    } catch (e: any) {
      console.error(e);
      alert(`價格修改失敗：${e.message || '請確認寫入權限'}`);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleToggleAvailability = async (product: ShopProduct) => {
    const newStatus = product.isAvailable === false ? true : false;
    setUpdatingProductId(product.id);
    try {
      const productRef = doc(db, "products", product.id);
      await updateDoc(productRef, { isAvailable: newStatus });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: newStatus } : p));
    } catch (e: any) {
      console.error(e);
      alert(`狀態切換失敗：${e.message || '請確認寫入權限'}`);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleDeleteProduct = async (product: ShopProduct) => {
    const confirmDelete = window.confirm('此操作不可逆，確定要永久刪除此商品嗎？');
    if (!confirmDelete) return;

    if (product.imageUrl && product.imageUrl.includes('cloudinary')) {
      console.log('溫馨提醒：此商品圖片已儲存於 Cloudinary。由於沒有設定自動刪除 Cloudinary 圖片功能，未來若圖片過多需手動前往 Cloudinary 介面清理！');
    }

    setUpdatingProductId(product.id);
    try {
      const productRef = doc(db, "products", product.id);
      await deleteDoc(productRef);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (e: any) {
      console.error(e);
      alert(`刪除失敗：${e.message || '請確認操作權限'}`);
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert("請選擇商品圖片");
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const priceNum = Number(newProduct.price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("價格必須為大於等於 0 的有效數字");
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        const errorMsg = "Cloudinary 環境變數遺失，請檢查設定參數。";
        console.error(errorMsg, { cloudName, uploadPreset });
        throw new Error(errorMsg);
      }

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", uploadPreset);
      
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error("圖片上傳失敗，請稍後再試");
      }
      
      const uploadData = await uploadRes.json();
      const secureUrl = uploadData.secure_url;
      setIsUploading(false);

      const productData = {
        name: newProduct.name,
        price: priceNum,
        stock: Number(newProduct.stock) || 0,
        category: newProduct.category,
        description: newProduct.description,
        imageUrl: secureUrl,
        isAvailable: true,
        tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      await addDoc(collection(db, "products"), productData);
      
      await fetchProducts();
      
      setNewProduct({ name: "", price: 0, category: "", description: "", tags: "", stock: 0, isAvailable: true });
      setImageFile(null);
      setIsAddingProduct(false);
      alert("商品新增成功！");
    } catch (error: any) {
      console.error("Error adding product:", error);
      alert(`新增商品失敗：${error.message}`);
      setIsUploading(false);
    } finally {
      setIsSubmittingProduct(false);
      setUpdatingProductId(null);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsSubmittingProduct(true);
    try {
      const priceNum = Number(newProduct.price);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("價格必須為大於等於 0 的有效數字");
      }

      let finalImageUrl = editingProduct.imageUrl;
      if (imageFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
          const errorMsg = "Cloudinary 環境變數遺失，請檢查設定參數。";
          console.error(errorMsg, { cloudName, uploadPreset });
          throw new Error(errorMsg);
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", uploadPreset);
        
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error("圖片上傳失敗，請稍後再試");
        }
        
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.secure_url;
        setIsUploading(false);
      }

      const updateData = {
        name: newProduct.name,
        price: priceNum,
        stock: Number(newProduct.stock) || 0,
        category: newProduct.category,
        description: newProduct.description,
        imageUrl: finalImageUrl,
        tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      const productRef = doc(db, "products", editingProduct.id);
      await updateDoc(productRef, updateData);
      
      await fetchProducts();
      
      setEditingProduct(null);
      setImageFile(null);
      setNewProduct({ name: "", price: 0, category: "", description: "", tags: "", stock: 0, isAvailable: true });
      alert("商品修改成功！");
    } catch (error: any) {
      console.error("Error updating product:", error);
      alert(`修改商品失敗：${error.message}`);
      setIsUploading(false);
    } finally {
      setIsSubmittingProduct(false);
      setUpdatingProductId(null);
    }
  };

  const handleEditProductClick = (product: ShopProduct) => {
    setUpdatingProductId(product.id);
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description || "",
      tags: product.tags ? product.tags.join(", ") : "",
      stock: product.stock || 0,
      isAvailable: product.isAvailable ?? true,
    });
    setIsAddingProduct(false);
    setImageFile(null);
  };

  const handleAddCategory = async () => {
    const inputValue = newCategoryName.trim();
    if (!inputValue) return;
    
    setIsAddingCategory(true);
    try {
      const namesArray = inputValue
        .split(/[,，\n]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (namesArray.length === 0) {
        setIsAddingCategory(false);
        return;
      }

      const batch = writeBatch(db);
      namesArray.forEach(name => {
        const categoryRef = doc(db, 'categories', name);
        batch.set(categoryRef, { name });
      });
      await batch.commit();

      const querySnapshot = await getDocs(collection(db, "categories"));
      const fetchedCategories: Category[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedCategories.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      setCategories(fetchedCategories);

      setNewProduct(prev => ({ ...prev, category: namesArray[0] }));
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch (error) {
      console.error("Error adding categories:", error);
      alert("新增分類失敗");
      setIsAddingCategory(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmDelete = window.confirm('警告：刪除訂單將導致財務紀錄遺失，確定要刪除嗎？');
    if (!confirmDelete) return;

    setUpdatingOrderId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await deleteDoc(orderRef);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error: any) {
      console.error("Error deleting order:", error);
      alert(`刪除訂單失敗：${error.message || '請確認操作權限'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'cancelled') {
      const confirmCancel = window.confirm('確定要取消此訂單嗎？');
      if (!confirmCancel) return;
    }

    setUpdatingOrderId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("更新狀態失敗");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-TW');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(`登入失敗：${error.message || "發生錯誤，請檢查帳號密碼"}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isAuthChecking) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>正在驗證權限...</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {user && (
        <header className={styles.adminHeader}>
          <div className={styles.adminHeaderInner}>
            <div className={styles.adminLogo}>漫步食光後台</div>
            <div className={styles.adminNavLinks}>
              <Link href="/" className={styles.adminHomeLink}>回前台首頁</Link>
              <button onClick={handleLogout} className={styles.logoutBtn}>登出</button>
            </div>
          </div>
        </header>
      )}

      <div className={styles.container}>
        {!user ? (
            <div className={styles.loginCard}>
              <h1 className={styles.title}>後台登入</h1>
              <p className={styles.subtitle}>請輸入管理員帳號密碼</p>
              <form className={styles.form} onSubmit={handleLogin}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">信箱</label>
                  <input
                    type="email"
                    id="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">密碼</label>
                  <input
                    type="password"
                    id="password"
                    className={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.submitBtn}>
                  登入
                </button>
              </form>
            </div>
          ) : (
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardHeader}>
                <div>
                  <h1 className={styles.title}>系統儀表板</h1>
                  <p className={styles.subtitle}>目前登入者：{user.email}</p>
                </div>
              </div>
              
              <div className={styles.tabsContainer}>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('orders')}
                >
                  訂單管理
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('analytics')}
                >
                  營運分析
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'products' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('products')}
                >
                  商品庫存管理
                </button>
              </div>

              {activeTab === 'orders' && (
                <div className={styles.dashboardContent}>
                  {isLoadingOrders ? (
                    <div className={styles.loadingOrders}>正在載入訂單...</div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>訂單資訊</th>
                          <th>購買人資訊</th>
                          <th>總金額</th>
                          <th>狀態</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr><td colSpan={5} className={styles.noData}>目前尚無訂單資料</td></tr>
                        ) : (
                          orders.map(order => (
                            <Fragment key={order.id}>
                              <tr className={styles.orderRow}>
                                <td>
                                  <div className={styles.orderId}>ID: {order.id}</div>
                                  <div className={styles.orderTime}>{formatDate(order.createdAt)}</div>
                                </td>
                                <td>
                                  <div className={styles.buyerName}>{order.buyer?.name}</div>
                                  <div className={styles.buyerPhone}>{order.buyer?.phone}</div>
                                </td>
                                <td className={styles.totalPrice}>NT$ {order.totalAmount?.toLocaleString()}</td>
                                <td>
                                  <span 
                                    className={statusConfig[order.status]?.color || ''} 
                                    style={{
                                      padding: '0.35rem 0.8rem', 
                                      borderRadius: '9999px', 
                                      fontSize: '0.85rem', 
                                      fontWeight: '600',
                                      backgroundColor: statusConfig[order.status]?.badgeBg || '#f3f4f6', 
                                      color: statusConfig[order.status]?.badgeText || '#374151',
                                      display: 'inline-block'
                                    }}
                                  >
                                    {statusConfig[order.status]?.label || order.status}
                                  </span>
                                </td>
                                <td>
                                  <div className={styles.actionButtons}>
                                    {order.status === 'paid' && (
                                      <button 
                                        style={{
                                          background: '#4a3b32',
                                          color: '#fff',
                                          border: 'none',
                                          padding: '0.4rem 1rem',
                                          borderRadius: '4px',
                                          cursor: updatingOrderId === order.id ? 'not-allowed' : 'pointer',
                                          fontSize: '0.9rem',
                                          opacity: updatingOrderId === order.id ? 0.7 : 1
                                        }}
                                        disabled={updatingOrderId === order.id}
                                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                                      >
                                        {updatingOrderId === order.id ? '更新中...' : '標記為已出貨'}
                                      </button>
                                    )}
                                    
                                    {isSuperAdmin && (
                                      <button 
                                        className={styles.deleteDangerBtn}
                                        disabled={updatingOrderId === order.id}
                                        onClick={() => handleDeleteOrder(order.id)}
                                      >
                                        永久刪除
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              <tr className={styles.itemsRow}>
                                <td colSpan={5}>
                                  <div className={styles.itemsWrapper}>
                                    <strong className={styles.itemsTitle}>購買品項：</strong>
                                    <ul className={styles.itemsList}>
                                      {order.items?.map((item, idx) => (
                                        <li key={idx} className={styles.smallItem}>
                                          <span className={styles.itemName}>{item.name}</span>
                                          <span className={styles.itemQty}>x {item.quantity}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            </Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className={styles.dashboardContent}>
                  {/* Revenue Analysis Panel */}
                  <div className={styles.revenuePanel}>
                    <h2 className={styles.revenueTitle}>營收分析面板</h2>
                    <div className={styles.revenueControls}>
                      <div className={styles.revenueField}>
                        <label>分析月份：</label>
                        <input 
                          type="month" 
                          value={selectedMonth} 
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className={styles.input}
                          style={{ maxWidth: '200px' }}
                        />
                      </div>
                      <div className={styles.revenueCard}>
                        <span className={styles.revenueLabel}>該月總營收 ({selectedMonth || '全部'})</span>
                        <span className={styles.revenueAmount}>
                          NT$ {orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recharts Analytics */}
                  <div className={styles.chartContainer}>
                    <h3 className={styles.chartTitle}>商品銷量統計</h3>
                    {isLoadingOrders ? (
                      <div className={styles.loadingOrders}>載入數據中...</div>
                    ) : (() => {
                      const productSales = orders.reduce((acc, order) => {
                        if (!order.items) return acc;
                        order.items.forEach(item => {
                          if (!acc[item.name]) acc[item.name] = 0;
                          acc[item.name] += item.quantity;
                        });
                        return acc;
                      }, {} as Record<string, number>);
                      
                      const chartData = Object.entries(productSales)
                        .map(([name, sales]) => ({ name, sales }))
                        .sort((a, b) => b.sales - a.sales);
                      
                      if (chartData.length === 0) {
                        return <div className={styles.noData}>此區間尚無商品銷售紀錄</div>;
                      }
                      
                      return (
                        <div style={{ width: '100%', height: 400 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 12}} />
                              <YAxis allowDecimals={false} />
                              <Tooltip cursor={{fill: '#f5f5f5'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                              <Bar dataKey="sales" name="銷量" fill="#d35400" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Recharts Product Trend */}
                  <div className={styles.chartContainer}>
                    <h3 className={styles.chartTitle}>產品趨勢分析 (近半年)</h3>
                    <div className={styles.trendControls}>
                      <select 
                        value={selectedTrendProduct} 
                        onChange={(e) => setSelectedTrendProduct(e.target.value)}
                        className={styles.input}
                      >
                        <option value="">請選擇分析商品...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {isLoadingTrend ? (
                      <div className={styles.loadingOrders}>載入趨勢數據中...</div>
                    ) : selectedTrendProduct ? (
                      (() => {
                        const trendMap = last6Months.reduce((acc, m) => {
                          acc[m] = 0;
                          return acc;
                        }, {} as Record<string, number>);

                        trendOrders.forEach(order => {
                          if (order.orderMonth && trendMap[order.orderMonth] !== undefined && order.items) {
                             const matchingItem = order.items.find(item => item.name === selectedTrendProduct);
                             if (matchingItem) {
                               trendMap[order.orderMonth] += matchingItem.quantity;
                             }
                          }
                        });

                        const trendData = last6Months.map(month => ({
                          month,
                          sales: trendMap[month]
                        }));

                        return (
                          <div style={{ width: '100%', height: 400, marginTop: '20px' }}>
                            <ResponsiveContainer>
                              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="month" tick={{fontSize: 12}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Line type="monotone" dataKey="sales" name="銷量" stroke="#d35400" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()
                    ) : (
                      <div className={styles.noData}>請自上方選單選擇一項產品以查看趨勢</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className={styles.dashboardContent}>
                  <div className={styles.actionRow} style={{ alignItems: 'center' }}>
                    <Link href="/admin/products/new" className={styles.primaryBtn} style={{ textDecoration: 'none' }}>
                      ＋ 新增商品
                    </Link>
                  </div>
                  

                
                {isLoadingProducts ? (
                  <div className={styles.loadingOrders}>正在載入商品...</div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>圖片</th>
                          <th>商品名稱</th>
                          <th>類別</th>
                          <th>價格</th>
                          <th>庫存</th>
                          <th>狀態</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.length === 0 ? (
                          <tr><td colSpan={6} className={styles.noData}>目前尚無商品資料</td></tr>
                        ) : (
                          products.map(p => (
                            <tr key={p.id} className={styles.orderRow}>
                              <td style={{ width: '80px' }}>
                                <img src={p.imageUrl} alt={p.name} className={styles.productImg} />
                              </td>
                              <td><div className={styles.buyerName}>{p.name}</div></td>
                              <td>{p.category}</td>
                              <td className={styles.totalPrice}>NT$ {p.price.toLocaleString()}</td>
                              <td>{p.stock ?? 0}</td>
                              <td>
                                <span className={`${styles.statusBadge} ${p.isAvailable === false ? styles.statusCancelled : styles.statusShipped}`}>
                                  {p.isAvailable === false ? '已下架' : '上架中'}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
                                  <Link 
                                    href={`/admin/products/${p.id}`}
                                    className={styles.shipBtn}
                                    style={{ textDecoration: 'none', textAlign: 'center' }}
                                  >
                                    編輯商品
                                  </Link>
                                  <button 
                                    className={styles.toggleBtn}
                                    disabled={updatingProductId === p.id}
                                    onClick={() => handleToggleAvailability(p)}
                                  >
                                    {updatingProductId === p.id ? '...' : (p.isAvailable === false ? '重新上架' : '手動下架')}
                                  </button>
                                  {/* 權限分層：只有主帳戶能看到實體刪除按鈕 */}
                                  {isSuperAdmin && (
                                    <button 
                                      className={styles.deleteDangerBtn}
                                      disabled={updatingProductId === p.id}
                                      onClick={() => handleDeleteProduct(p)}
                                    >
                                      永久刪除商品
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
  );
}
