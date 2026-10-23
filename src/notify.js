const config = require('./config');
const { escHtml } = require('./utils');

async function sendMail(to, subject, html) {
  if (!config.brevoKey || !config.mailFrom) { console.error('Chưa cấu hình BREVO_API_KEY / MAIL_FROM nên không gửi được email'); return false; }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': config.brevoKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Diễm My Fashion', email: config.mailFrom }, to: [{ email: to }], subject, htmlContent: html })
  });
  if (!r.ok) console.error('Brevo lỗi', r.status, await r.text());
  return r.ok;
}
const resetMailHtml = (name, link) =>
  `<p>Chào ${escHtml(name)},</p><p>Bấm vào liên kết dưới đây để đặt mật khẩu mới (có hiệu lực 1 giờ):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;

const vnd = n => Number(n).toLocaleString('vi-VN') + ' đ';
const orderMailHtml = o => `<p>Chào ${escHtml(o.name)}, cảm ơn bạn đã đặt hàng tại Diễm My Fashion!</p>
<p><b>Mã đơn: #${escHtml(o.id)}</b></p>
<table cellpadding="6" style="border-collapse:collapse">${o.items.map(i => `<tr><td>${escHtml(i.name)} (${escHtml(i.size)}/${escHtml(i.color)}) x${i.qty}</td><td align="right">${vnd(i.price * i.qty)}</td></tr>`).join('')}
<tr><td>Phí vận chuyển</td><td align="right">${o.shipping ? vnd(o.shipping) : 'Miễn phí'}</td></tr>
${o.discount ? `<tr><td>Giảm giá</td><td align="right">-${vnd(o.discount)}</td></tr>` : ''}
<tr><td><b>Tổng cộng</b></td><td align="right"><b>${vnd(o.total)}</b></td></tr></table>
<p>Giao đến: ${escHtml(o.address)} (${escHtml(o.phone)})</p>
<p>${o.payment === 'VIETQR' ? `Vui lòng chuyển khoản đúng số tiền, nội dung chuyển khoản: <b>${escHtml(o.id)}</b>. Đơn sẽ được xác nhận sau khi shop nhận được tiền.` : 'Thanh toán khi nhận hàng (COD).'}</p>
<p>Shop sẽ liên hệ bạn để xác nhận đơn.</p>`;

// Báo đơn mới qua Telegram (tuỳ chọn). Không bao giờ làm hỏng việc đặt hàng nếu lỗi.
function notifyOrder(o) {
  if (!config.telegramToken || !config.telegramChat) return;
  const text = `ĐƠN MỚI #${o.id}\n${o.name} - ${o.phone}\n${o.address}\n` +
    o.items.map(i => `- ${i.name} (${i.size}/${i.color}) x${i.qty}`).join('\n') +
    `\nTổng: ${o.total.toLocaleString('vi-VN')} đ (${o.payment === 'VIETQR' ? 'chuyển khoản' : 'COD'})` + (o.notes ? `\nGhi chú: ${o.notes}` : '');
  fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: config.telegramChat, text })
  }).catch(e => console.error('Telegram lỗi:', e.message));
}
module.exports = { sendMail, resetMailHtml, orderMailHtml, notifyOrder };
