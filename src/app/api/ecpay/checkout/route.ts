import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dayjs from 'dayjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, totalAmount, itemName } = body;

    const MerchantID = process.env.ECPAY_MERCHANT_ID || '2000132';
    const HashKey = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
    const HashIV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';
    const BaseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const params: Record<string, string | number> = {
      MerchantID,
      MerchantTradeNo: 'TS' + Date.now().toString() + Math.floor(Math.random() * 100).toString().padStart(2, '0'),
      CustomField1: orderId || '',
      MerchantTradeDate: dayjs().format('YYYY/MM/DD HH:mm:ss'),
      PaymentType: 'aio',
      TotalAmount: totalAmount || 0,
      TradeDesc: '漫步食光線上購物',
      ItemName: itemName || '漫步食光多項商品',
      ReturnURL: `${BaseURL}/api/ecpay/callback`,
      ClientBackURL: `${BaseURL}/orders`,
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    // 1. 將排序後的參數與值串接，最前方加上 HashKey=，最後方加上 &HashIV=
    const sortedKeys = Object.keys(params).sort();
    let macString = `HashKey=${HashKey}`;
    sortedKeys.forEach(key => {
      macString += `&${key}=${params[key]}`;
    });
    macString += `&HashIV=${HashIV}`;

    // 2. 進行綠界特規的 URL Encode
    let encodedString = encodeURIComponent(macString);

    // 3. 取代 %20 為 +，並將 %2d, %5f, %2e, %21, %2a, %28, %29 取代為對應的符號
    encodedString = encodedString
      .replace(/%20/g, '+')
      .replace(/%2d/gi, '-')
      .replace(/%5f/gi, '_')
      .replace(/%2e/gi, '.')
      .replace(/%21/gi, '!')
      .replace(/%2a/gi, '*')
      .replace(/%28/gi, '(')
      .replace(/%29/gi, ')')
      .toLowerCase();

    // 4. 使用 crypto.createHash('sha256') 將字串加密，並轉換為大寫的 Hex 字串
    const CheckMacValue = crypto.createHash('sha256').update(encodedString).digest('hex').toUpperCase();

    // 組合最終參數
    const finalParams = {
      ...params,
      CheckMacValue
    };

    // 建立 SSR HTML Form 參數標籤
    let formInputs = '';
    for (const [key, value] of Object.entries(finalParams)) {
      formInputs += `        <input type="hidden" name="${key}" value="${value}" />\n`;
    }

    // 回傳 SSR 自動跳轉表單 (HTML)
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>漫步食光 | 綠界金流連線中...</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #FAFAFA;
      color: #4a3b32;
    }
    .loader {
      border: 4px solid #eaeaea;
      border-top: 4px solid #8e9a82;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      animation: spin 1s linear infinite;
      margin-bottom: 24px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader"></div>
  <p>正在前往綠界科技安全付款頁面，請稍候...</p>
  <form id="ecpay-form" method="POST" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5">
${formInputs}  </form>
  <script>
    setTimeout(() => {
      document.getElementById("ecpay-form").submit();
    }, 500);
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('ECPay Checkout API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
