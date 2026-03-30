import { NextRequest } from 'next/server';
import crypto from 'crypto';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}
const db = admin.firestore();

export async function POST(req: NextRequest) {
  try {
    // 1. 取得 x-www-form-urlencoded 的 formData
    const formData = await req.formData();
    const params: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const { CheckMacValue, ...ecpayParams } = params;

    // 2. 驗證 CheckMacValue 
    const HashKey = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
    const HashIV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';

    const sortedKeys = Object.keys(ecpayParams).sort();
    let macString = `HashKey=${HashKey}`;
    sortedKeys.forEach(key => {
      macString += `&${key}=${ecpayParams[key]}`;
    });
    macString += `&HashIV=${HashIV}`;

    // 進行與 checkout 相同的 URL Encode 與特定符號處理
    let encodedString = encodeURIComponent(macString)
      .replace(/%20/g, '+')
      .replace(/%2d/gi, '-')
      .replace(/%5f/gi, '_')
      .replace(/%2e/gi, '.')
      .replace(/%21/gi, '!')
      .replace(/%2a/gi, '*')
      .replace(/%28/gi, '(')
      .replace(/%29/gi, ')')
      .toLowerCase();

    const calculatedCheckMacValue = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();

    // 如果驗證失敗，阻擋非法或偽造請求
    if (calculatedCheckMacValue !== CheckMacValue) {
      console.error('ECPay CheckMacValue verification failed');
      return new Response('0|ErrorMessage', { status: 400 });
    }

    // 3. 驗證成功，透過 Admin SDK 無條件繞過 Security Rules 覆寫 Firestore 狀態
    const orderRef = db.collection('orders').doc(ecpayParams.MerchantTradeNo);
    
    if (ecpayParams.RtnCode === '1') {
      // 成功完成付款
      await orderRef.update({
        status: 'paid',
        tradeNo: ecpayParams.TradeNo,
        paymentDate: ecpayParams.PaymentDate || new Date().toISOString()
      });
    } else {
      // 付款失敗、逾期、或其他異常錯誤
      // 將資料庫紀錄為 failed (付款失敗)，方便日後系統或財務查帳抓漏
      await orderRef.update({
        status: 'failed',
        rtnMsg: ecpayParams.RtnMsg || '交易失敗'
      });
    }

    // 4. 固定規格回傳 1|OK 給綠界科技告知執行完畢，否則綠界會不斷自動重新打 API
    return new Response('1|OK', { status: 200 });
    
  } catch (error) {
    console.error('ECPay Callback Error:', error);
    // 捕捉任意內部拋出的異常避免伺服器 Crash，並讓綠界知道接收失敗
    return new Response('0|ErrorMessage', { status: 500 });
  }
}
