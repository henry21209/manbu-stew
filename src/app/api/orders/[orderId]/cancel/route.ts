import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    } as any)
  });
}

const db = admin.firestore();

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  try {
    // 高資安檢查 1：擷取並核對 JWT 登入憑證 (Authentication)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未經授權：無效的登入憑證' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: '未經授權：憑證已過期或失效' }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // 原子化操作：啟動後端最高權限 Transaction，保證訂單與庫存同步升降，絕不會卡在半空中
    await db.runTransaction(async (t) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await t.get(orderRef);

      // 高資安檢查 2：防呆與防爬蟲
      if (!orderSnap.exists) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const orderData = orderSnap.data();

      // 高資安檢查 3：嚴格防禦跨帳號越權操作 (Authorization / IDOR 防護)
      if (orderData?.userId !== uid) {
        throw new Error('FORBIDDEN');
      }

      // 高資安檢查 4：確認訂單狀態處於可操作的起點
      if (orderData?.status !== 'pending') {
        throw new Error('INVALID_STATUS');
      }

      // Step B & D (Read & Write)：利用最高效的 increment 操作無損退回實體庫存
      const items = orderData?.items || [];
      items.forEach((item: any) => {
        if (item.id && item.quantity) {
          const productRef = db.collection('products').doc(item.id);
          // 使用相對遞增來還原庫存，不受到其他併發交易干擾
          t.update(productRef, {
            stock: admin.firestore.FieldValue.increment(item.quantity)
          });
        }
      });

      // Step C (Write)：鎖死訂單，使其成為已取消
      t.update(orderRef, { status: 'cancelled' });
    });

    return NextResponse.json({ success: true, message: '訂單已成功取消且庫存已退回' }, { status: 200 });

  } catch (error: any) {
    console.error('Cancel order Error:', error);
    
    // 轉換特定的內部錯誤為人類可讀 HTTP status code
    if (error.message === 'ORDER_NOT_FOUND') return NextResponse.json({ error: '查無此訂單' }, { status: 404 });
    if (error.message === 'FORBIDDEN') return NextResponse.json({ error: '無權限取消他人的訂單' }, { status: 403 });
    if (error.message === 'INVALID_STATUS') return NextResponse.json({ error: '該訂單的狀態已經無法執行取消動作' }, { status: 400 });
    
    return NextResponse.json({ error: '伺服器內部錯誤，請聯絡管理員' }, { status: 500 });
  }
}
