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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  try {
    // 1. 驗證 JWT Token 是否存在且合法
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

    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ error: '無效的憑證：缺少 Email 屬性' }, { status: 403 });
    }

    // 2. 嚴格權限比對 (RBAC): 前往 admin_roles 查詢是否為 'super_admin'
    const roleDoc = await db.collection('admin_roles').doc(email).get();
    if (!roleDoc.exists || roleDoc.data()?.role !== 'super_admin') {
      return NextResponse.json({ error: '權限不足：僅有超級管理員 (Super Admin) 能執行實體刪除' }, { status: 403 });
    }

    // 3. 執行職責分離與狀態機保護：防禦正在運行或尚待退庫存的有效訂單
    const orderRef = db.collection('orders').doc(orderId);
    
    await db.runTransaction(async (t) => {
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const status = orderSnap.data()?.status;
      // 唯有已確實停損的訂單才允許物理拔除，確保不會出現庫存永遠退不回去的漏洞
      if (status !== 'cancelled' && status !== 'failed') {
        throw new Error('INVALID_STATUS');
      }

      // 4. 執行物理數據抹除
      t.delete(orderRef);
    });

    return NextResponse.json({ success: true, message: '訂單已被伺服器徹底粉碎移除' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete order error:', error);
    if (error.message === 'ORDER_NOT_FOUND') return NextResponse.json({ error: '查無此訂單' }, { status: 404 });
    if (error.message === 'INVALID_STATUS') return NextResponse.json({ error: '僅允許物理刪除狀態為「已取消」或「失敗」的訂單，請先完成取消流程。' }, { status: 400 });
    
    return NextResponse.json({ error: '伺服器內部錯誤，請聯絡管理員' }, { status: 500 });
  }
}
