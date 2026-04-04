# 漫步食光 (Manbu Stew) - 專案狀態文件 (PROJECT_STATE)

## 1. 技術堆疊 (Tech Stack)

### Frontend (前端)
- **Framework**: Next.js (App Router)
- **Styling**: Vanilla CSS Modules & Tailwind CSS
- **State Management**: React Context (`AuthContext`, `CartContext`)
- **Validation**: Zod (企業級表單驗證與資料寬容轉換 pipeline)

### Backend (後端)
- **Architecture**: Next.js Route Handlers (`/app/api/*`)
- **Database**: Firebase Firestore (NoSQL)
- **Backend SDK**: Firebase Admin SDK (繞過 Security Rules 執行最高權限交易)
- **Payment Gateway**: 綠界科技 (ECPay)
- **Transactional Email**: Resend

---

## 2. 資料庫結構 (Database Schema)

### `users` Collection (使用者)
- `name` (string): 真實姓名
- `email` (string): 登入信箱
- `phone` (string): 手機號碼 (經 Zod 驗證後的純數字格式)
- `city` (string): 縣市 (例如: '台北市')
- `district` (string): 行政區 (例如: '信義區')
- `detailAddress` (string): 街道門牌細節
- `createdAt` (timestamp): 帳號建立時間

### `orders` Collection (訂單)
- `userId` (string): 購買者的 UID
- `userEmail` (string): 購買者信箱 (用於 Resend 寄信)
- `items` (array): 購買商品清單 `[{ id, name, price, quantity, imageUrl }]`
- `totalAmount` (number): 訂單總金額
- `status` (string): 訂單狀態
  - `'pending'` (待處理)
  - `'paid'` (已付款)
  - `'shipped'` (已出貨)
  - `'cancelled'` (已取消)
  - `'failed'` (前端或金流回調標記之失敗)
- `tradeNo` (string): 綠界交易序號 (付款成功後寫入)
- `paymentDate` (string/timestamp): 付款時間
- `createdAt` (timestamp): 建立時間

### `products` Collection (商品)
- `name` (string): 商品名稱
- `price` (number): 價格
- `stock` (number): 庫存數量 (會隨訂單建立與取消進行 Atomic 加減)
- `imageUrl` (string): 商品圖片位址

---

## 3. 已實作的核心功能 (Implemented Features)

### 會員與個人資料系統
- **結構化地址與 Zod 聯防**: 透過 `@/lib/taiwan-data` 實作全台灣本島縣市/區域連動下拉選單。
- **手機號碼正規化**: 使用 Zod `.transform` 自動過濾橫槓與空白後進行 Regex 安全驗證。
- **資料雙向綁定**: 會員中心修改的地址資料會自動連動填入結帳頁面 `Auto-fill` 中。

### 購物車與結帳基礎設施
- **前端預建立訂單**: 在結帳頁面攔截表單並產生帶有 `pending` 狀態的訂單寫入 Firestore，透過安全防護清除購物車。
- **防偽造地理驗證**: 結帳時透過 Zod `.superRefine` 驗證傳入的 `district` 是否確實存在於該 `city` 陣列中。

### 綠界金流系統 (ECPay Integration)
- **BFCache 防禦機制**: 清除 `document.write` 並改用隱藏 DOM 表單進行綠界跳轉，加上 `pageshow` 事件監聽消除上一頁卡住 Loading 的災情。
- **商戶訂單號 (MerchantTradeNo) 動態生成**: 解決綠界重複點擊導致 `10300028` 錯誤，將真實 Firestore ID 挪至 `CustomField1` 中安全偷渡至回調並找回。
- **Webhook 回調更新**: `/api/ecpay/callback` 透過 Firebase Admin 賦權，無條件更新訂單狀態為 `paid`。

### 後端訂單退還系統 (Cancellation Transaction)
- ** JWT 安全認證**: 透過擷取 `Authorization: Bearer <Token>` 進行 API 端點防禦未登入與越權操作 (IDOR)。
- **核心庫存 Atomic 交易**: 使用 `admin.firestore().runTransaction` 與 `FieldValue.increment` 綁定訂單取消與庫存退回，確保高併發下資料一致。

### 管理員後台 (Admin Panel)
- **全站訂單儀表板**: 掛載專用管理頁面呈現所有用戶紀錄，提供標記為『已出貨 (shipped)』的實體發貨按鈕。

---

## 4. 暫停中 / 待完成的技術債 (Pending Tasks / Tech Debt)

- **Resend Email 通知系統**: 基礎程式碼架構與 `try-catch` 已經完成並放入 ECPay Webhook 中，但因無專屬商用網域暫緩寄信觸發。預計日後改採代理網域或個人信箱綁定後再重啟。
- **RBAC 角色權限管理**: 目前管理員儀表板缺乏 `super_admin` 角色判定機制阻擋，預設需在正式發布前建立 Firebase Custom Claims 以阻絕非管理團隊存取 `/admin` 路由。

---

## 5. 關鍵目錄結構 (Key Directory Structure)

```text
/src
├── app/
│   ├── api/
│   │   ├── ecpay/
│   │   │   ├── checkout/route.ts          (生成綠界跳轉表單)
│   │   │   └── callback/route.ts          (接收綠界付款 Webhook)
│   │   └── orders/[orderId]/cancel/route.ts (退單還庫存事務 API)
│   ├── admin/
│   │   └── orders/page.tsx                (後台管理員訂單面板)
│   ├── checkout/page.tsx                  (結帳防呆頁面)
│   ├── orders/page.tsx                    (前台會員訂單列表)
│   └── profile/page.tsx                   (會員中心資料管理頁)
│
├── components/
│   ├── OrdersList.tsx                     (負責渲染訂單清單與觸發取消 API元件)
│   ├── TopNav.tsx                         (導覽列元件)
│   └── Footer.tsx                         (頁尾元件)
│
├── lib/
│   ├── firebase.ts                        (與 Firebase Client 初始化連線)
│   ├── resend.ts                          (Resend SDK 封裝)
│   └── taiwan-data.ts                     (台灣縣市區域地理靜態擴展字典)
│
└── context/
    ├── AuthContext.tsx                    (用戶狀態全局傳遞)
    └── CartContext.tsx                    (購物車狀態全局傳遞)
```
