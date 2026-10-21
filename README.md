# Diễm My Fashion — cấu trúc dự án

public/index.html, css/, js/  Giao diện khách; public/admin.html là trang quản trị
css/style.css     Giao diện tuỳ chỉnh
js/config.js      Cấu hình shop (ship, voucher, tài khoản VietQR)  <-- sửa ở đây trước
js/products.js    Danh sách sản phẩm (sửa giá, ảnh, tên ở đây)
js/app.js         Logic giỏ hàng, lọc, thanh toán, lưu đơn

## Chạy thử
VS Code -> cài extension "Live Server" -> chuột phải index.html -> Open with Live Server.

## Đẩy lên GitHub rồi Netlify
git init && git add . && git commit -m "Diem My Fashion v1"
git branch -M main && git remote add origin <link-repo-cua-ban> && git push -u origin main
Netlify: Import from GitHub, Publish directory để trống hoặc ".", KHÔNG để index.html nằm trong thư mục con.

## Lưu ý quan trọng
Đơn hàng hiện lưu trong trình duyệt của khách (localStorage), chủ shop CHƯA nhận được đơn.
Phần backend nhận đơn + trang quản trị là giai đoạn tiếp theo.

## Báo đơn mới qua Telegram (miễn phí)
1. Telegram -> chat với @BotFather -> gõ /newbot -> lấy TOKEN.
2. Nhắn tin bất kỳ cho bot vừa tạo, mở https://api.telegram.org/bot<TOKEN>/getUpdates, tìm "chat":{"id": SỐ} -> đó là CHAT_ID.
3. Điền TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID vào .env (và vào Environment trên Render).

## Danh sách kiểm tra trước khi bán thật
- [ ] Thay số tài khoản thật: js/config.js
- [ ] Thay hotline, địa chỉ, email cuối public/index.html (hiện là số mẫu)
- [ ] Thay ảnh Unsplash bằng ảnh sản phẩm của bạn
- [ ] Đặt ADMIN_PASSWORD mạnh trên Render
- [ ] Chạy thử 1 đơn COD và 1 đơn VietQR (quét thử mã QR)
- [ ] Giải quyết lưu trữ dữ liệu bền vững (xem phần cảnh báo)
"# diemmy-fashion-store" 
