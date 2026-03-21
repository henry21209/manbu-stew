"use client";

import { useState, useEffect, Fragment } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

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
};

type ShopProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable?: boolean;
  description?: string;
  tags?: string[];
};

type Category = {
  id: string;
  name: string;
};
import styles from "./Admin.module.css";

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

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  // Add Product State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    tags: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Tab Routing
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');

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

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      setIsLoadingOrders(true);
      try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoadingOrders(false);
      }
    }

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

    fetchOrders();
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

      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", "manbu_preset");
      
      const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dbtrfpmoj/image/upload", {
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
        category: newProduct.category,
        description: newProduct.description,
        imageUrl: secureUrl,
        isAvailable: true,
        tags: newProduct.tags ? newProduct.tags.split(',').map(t => t.trim()).filter(t => t) : []
      };

      await addDoc(collection(db, "products"), productData);
      
      await fetchProducts();
      
      setNewProduct({ name: "", price: "", category: "", description: "", tags: "" });
      setImageFile(null);
      setIsAddingProduct(false);
      alert("商品新增成功！");
    } catch (error: any) {
      console.error("Error adding product:", error);
      alert(`新增商品失敗：${error.message}`);
      setIsUploading(false);
    } finally {
      setIsSubmittingProduct(false);
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
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", "manbu_preset");
        
        const uploadRes = await fetch("https://api.cloudinary.com/v1_1/dbtrfpmoj/image/upload", {
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
      setNewProduct({ name: "", price: "", category: "", description: "", tags: "" });
      alert("商品修改成功！");
    } catch (error: any) {
      console.error("Error updating product:", error);
      alert(`修改商品失敗：${error.message}`);
      setIsUploading(false);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const docRef = await addDoc(collection(db, "categories"), { name: newCategoryName.trim() });
      setCategories(prev => [...prev, { id: docRef.id, name: newCategoryName.trim() }]);
      setNewCategoryName("");
    } catch (error) {
      console.error("Error adding category:", error);
      alert("新增分類失敗");
    } finally {
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
                                  <span className={`${styles.statusBadge} ${order.status === 'shipped' ? styles.statusShipped : order.status === 'cancelled' ? styles.statusCancelled : styles.statusPending}`}>
                                    {order.status === 'shipped' ? '已出貨' : order.status === 'cancelled' ? '已取消' : '處理中'}
                                  </span>
                                </td>
                                <td>
                                  {order.status === 'pending' || !order.status ? (
                                    <div className={styles.actionButtons}>
                                      <button 
                                        className={styles.shipBtn}
                                        disabled={updatingOrderId === order.id}
                                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                                      >
                                        {updatingOrderId === order.id ? '處理中...' : '出貨'}
                                      </button>
                                      <button 
                                        className={styles.toggleBtn}
                                        disabled={updatingOrderId === order.id}
                                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                      >
                                        取消訂單
                                      </button>
                                      {/* 權限分層：只有主帳戶能看到實體刪除按鈕 */}
                                      {isSuperAdmin && (
                                        <button 
                                          className={styles.deleteDangerBtn}
                                          disabled={updatingOrderId === order.id}
                                          onClick={() => handleDeleteOrder(order.id)}
                                        >
                                          永久刪除訂單
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={styles.actionButtons}>
                                      <span className={styles.doneText}>
                                        {order.status === 'cancelled' ? '已終止' : '已完成'}
                                      </span>
                                      {isSuperAdmin && (
                                        <button 
                                          className={styles.deleteDangerBtn}
                                          disabled={updatingOrderId === order.id}
                                          onClick={() => handleDeleteOrder(order.id)}
                                        >
                                          永久刪除訂單
                                        </button>
                                      )}
                                    </div>
                                  )}
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

              {activeTab === 'products' && (
                <div className={styles.dashboardContent}>
                  <div className={styles.actionRow}>
                    <button 
                      onClick={() => {
                        setIsAddingProduct(!isAddingProduct);
                        setEditingProduct(null);
                        setNewProduct({ name: "", price: "", category: "", description: "", tags: "" });
                      }} 
                      className={styles.primaryBtn}
                    >
                      {isAddingProduct ? '取消新增' : '＋ 新增商品'}
                    </button>
                    
                    <div className={styles.categoryManager}>
                      <input 
                        type="text" 
                        placeholder="新分類名稱" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)} 
                        className={styles.smallInput} 
                      />
                      <button onClick={handleAddCategory} disabled={isAddingCategory || !newCategoryName.trim()} className={styles.toggleBtn}>
                        {isAddingCategory ? '...' : '＋ 新增分類'}
                      </button>
                    </div>
                  </div>
                  
                  {(isAddingProduct || editingProduct) && (
                  <div className={styles.addProductFormCard}>
                    <h3 className={styles.formTitle}>{editingProduct ? '編輯商品' : '建立新商品'}</h3>
                    <form className={styles.formRow} onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>商品名稱</label>
                        <input className={styles.input} type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>價格 (NT$)</label>
                        <input className={styles.input} type="number" required min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>分類</label>
                        <select className={styles.input} required value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                          <option value="">請選擇</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>描述</label>
                        <input className={styles.input} type="text" required value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>標籤 (用逗號分隔)</label>
                        <input className={styles.input} type="text" placeholder="例: 最新, 推薦, 熱門" value={newProduct.tags} onChange={e => setNewProduct({...newProduct, tags: e.target.value})} />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>商品圖片</label>
                        <input 
                          className={styles.input} 
                          type="file" 
                          accept="image/*" 
                          required={!editingProduct} 
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setImageFile(e.target.files[0]);
                            }
                          }} 
                        />
                      </div>
                      <div className={styles.formActions}>
                        <button type="button" onClick={() => { setEditingProduct(null); setIsAddingProduct(false); }} className={styles.cancelBtn} style={{marginRight: '1rem'}}>
                          取消
                        </button>
                        <button type="submit" className={styles.submitBtn} disabled={isSubmittingProduct}>
                          {isUploading ? '圖片上傳中...' : isSubmittingProduct ? '處理中...' : (editingProduct ? '儲存修改' : '確認新增')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
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
                              <td>
                                <span className={`${styles.statusBadge} ${p.isAvailable === false ? styles.statusCancelled : styles.statusShipped}`}>
                                  {p.isAvailable === false ? '已下架' : '上架中'}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
                                  <button 
                                    className={styles.shipBtn}
                                    disabled={updatingProductId === p.id}
                                    onClick={() => handleEditPrice(p.id, p.price)}
                                  >
                                    修改價格
                                  </button>
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
