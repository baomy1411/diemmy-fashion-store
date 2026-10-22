// ====== CẤU HÌNH CỬA HÀNG: chỉ cần sửa file này ======
// Các giá trị dưới đây là MẪU, hãy thay bằng thông tin thật của bạn trước khi bán.
const SHOP = {
    name: 'Diễm My Fashion',
    freeShipThreshold: 2000000,   // giá trị mặc định; server (src/config.js) gửi giá trị thật qua /api/config
    shippingFee: 30000,           // phí ship khi chưa đủ mức miễn phí
    bank: {                       // VietQR (tra mã ngân hàng tại vietqr.io)
        bin: 'MB',
        account: '0900123456789', // <-- THAY bằng số tài khoản thật
        owner: 'CTY DIEM MY FASHION'
    }
};
