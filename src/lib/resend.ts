import { Resend } from 'resend';

// 初始化 Resend 客戶端，API Key 自動抓取環境變數
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export default resend;
