// Đọc và kiểm tra biến môi trường một lần duy nhất; mọi file khác chỉ require file này.
require('dotenv').config();
const env = process.env;

const config = {
  port: env.PORT || 3000,
  mongoUri: env.MONGODB_URI,
  mongoDb: env.MONGODB_DB || 'diemmy',
  adminPassword: env.ADMIN_PASSWORD,
  adminEmail: String(env.ADMIN_EMAIL || 'admin').trim().toLowerCase(),
  sessionSecret: env.SESSION_SECRET,
  baseUrl: env.BASE_URL || env.RENDER_EXTERNAL_URL,
  brevoKey: env.BREVO_API_KEY,
  mailFrom: env.MAIL_FROM,
  telegramToken: env.TELEGRAM_BOT_TOKEN,
  telegramChat: env.TELEGRAM_CHAT_ID,
  // Giá trị đơn hàng: CHỈ sửa ở đây (trang web tự lấy phí ship từ /api/config)
  shop: {
    freeShipThreshold: 2000000,
    shippingFee: 30000,
    vouchers: { DIEMMY10: 0.10, DIEMMY99: 0.10, DIEMMYVIP: 0.20 }
  }
};

config.assert = () => {
  if (!config.mongoUri) throw new Error('Thiếu MONGODB_URI');
  if (!config.adminPassword || config.adminPassword.length < 8) throw new Error('Thiếu ADMIN_PASSWORD (tối thiểu 8 ký tự)');
};
module.exports = config;
