# Diễm My Fashion

## Cấu trúc
server.js              Điểm vào: dựng Express, nối các route, kết nối MongoDB
src/config.js          Biến môi trường + phí ship + mã giảm giá (SỬA GIÁ TRỊ ĐƠN HÀNG Ở ĐÂY)
src/db.js              Kết nối MongoDB, các collection, nhập sản phẩm mẫu lần đầu
src/security.js        Token đăng nhập, mã hoá mật khẩu, khoá khi thử sai nhiều lần
src/notify.js          Gửi email (Brevo) và báo đơn mới qua Telegram
src/utils.js           Hàm dùng chung
src/routes/auth.js     Đăng ký, đăng nhập, quên và đặt lại mật khẩu
src/routes/products.js Sản phẩm (khách xem, admin thêm/sửa/xoá)
src/routes/orders.js   Đơn hàng, mã giảm giá, phí ship, quản lý đơn
src/routes/upload.js   Tải ảnh lên và phục vụ ảnh
src/routes/admin.js    Xuất đơn hàng ra Excel (CSV), sao lưu dữ liệu
public/chinh-sach.html Chính sách đổi trả, vận chuyển, bảo mật (nội dung mẫu, cần xem lại)
public/index.html      Trang bán hàng
public/admin.html      Trang quản trị
public/js/             config (tài khoản ngân hàng) | products (sản phẩm mẫu dự phòng) | state | utils |
                       catalog | quickview | cart | wishlist | checkout | main | auth
data/products.json     Sản phẩm mẫu nhập vào MongoDB lần chạy đầu

Thứ tự nạp các file trong public/js được khai báo ở cuối public/index.html, đừng đổi thứ tự.

## Chạy trên máy
npm install
Tạo file .env (xem .env.example), tối thiểu: MONGODB_URI, ADMIN_PASSWORD
npm start  ->  http://localhost:3000

## Đưa lên Render
Build: npm install   Start: npm start
Environment: MONGODB_URI, ADMIN_PASSWORD, (tuỳ chọn) ADMIN_EMAIL, BASE_URL, BREVO_API_KEY, MAIL_FROM,
SEPAY_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
