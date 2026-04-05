import { NextRequest } from 'next/server';
import crypto from 'crypto';
import * as admin from 'firebase-admin';
import resend from '@/lib/resend';

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

    // 3. 驗證成功，透過 CustomField1 尋回丟棄的 Firestore 原始單號
    const actualOrderId = ecpayParams.CustomField1;
    if (!actualOrderId) {
      console.error('ECPay Callback Error: Missing CustomField1 (orderId)');
      return new Response('0|ErrorMessage', { status: 400 });
    }
    
    // 透過 Admin SDK 無條件繞過 Security Rules 覆寫 Firestore 狀態
    const orderRef = db.collection('orders').doc(actualOrderId);
    
    if (ecpayParams.RtnCode === '1') {
      // 成功完成付款
      await orderRef.update({
        status: 'paid',
        tradeNo: ecpayParams.TradeNo,
        paymentDate: ecpayParams.PaymentDate || new Date().toISOString()
      });
      
      // 自動 Email 發送邏輯 (以 try-catch 包覆獨立錯誤，絕對不中斷綠界的 1|OK 確認循環)
      try {
        const orderSnap = await orderRef.get();
        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          if (orderData?.userEmail) {
            
            // 將明細轉換為 HTML 格式
            const itemsList = orderData.items?.map((item: any) => 
               `<li>${item.name} x ${item.quantity} (NT$ ${item.price.toLocaleString()})</li>`
            ).join('') || '<li>（商品明細未定）</li>';

            await resend.emails.send({
              from: 'onboarding@resend.dev',
              to: 'adcpapa@gmail.com', // ⚠️ 沙盒限制：請確認這是否是您的註冊信箱，若不是請務必自行修改
              subject: `[漫步食光測試] 訂單付款成功通知 (編號: ${actualOrderId})`,
              html: `
                <div style="font-family: sans-serif; color: #4a3b32; line-height: 1.6;">
                  <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
                    ⚠️ 這是測試環境代理郵件。真實顧客信箱為：${orderData.userEmail}
                  </h2>
                  <h2 style="color: #6d8c54; margin-top: 20px;">💯 感謝您的購買！</h2>
                  <p>您好，我們已成功收到您透過「綠界科技 ECPay」支付的款項。</p>
                  <p><strong>訂單編號：</strong> ${actualOrderId}</p>
                  <p><strong>刷卡/總金額：</strong> NT$ ${orderData.totalAmount?.toLocaleString() || ecpayParams.TradeAmt}</p>
                  
                  <div style="background-color: #FAFAFA; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <h3 style="margin-top: 0; border-bottom: 1px solid #CCC; padding-bottom: 8px;">🛒 購買明細：</h3>
                    <ul style="padding-left: 20px;">
                      ${itemsList}
                    </ul>
                  </div>
                  
                  <p>我們將盡快為您安排出貨，如需隨時查看進度請登入官方網站「我的訂單」頁面。</p>
                  <p>祝您有美好的一天！</p>
                </div>
              `
            });
            console.log(`[Resend Proxy] Test Success email successfully forwarded on behalf of original recipient ${orderData.userEmail}`);
          }
        }
      } catch (emailError) {
        console.error('Failed to send success email via Resend:', emailError);
      }
      
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
