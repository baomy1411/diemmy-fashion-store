// ====== CẤU HÌNH CỬA HÀNG: chỉ cần sửa file này ======
// Các giá trị dưới đây là MẪU, hãy thay bằng thông tin thật của bạn trước khi bán.
const SHOP = {
    name: 'Diễm My Fashion',
    freeShipThreshold: 2000000,   // đơn từ mức này trở lên: miễn phí vận chuyển
    shippingFee: 30000,           // phí ship khi chưa đủ mức miễn phí
    vouchers: { DIEMMY10: 0.10, DIEMMYVIP: 0.20 },   // mã giảm giá: tên mã -> % giảm
    bank: {                       // VietQR (tra mã ngân hàng tại vietqr.io)
        bin: 'MB',
        account: '0900123456789', // <-- THAY bằng số tài khoản thật
        owner: 'CTY DIEM MY FASHION'
    }
};
