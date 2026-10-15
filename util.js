const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const nowIso = () => new Date().toISOString();

// Giờ Việt Nam (UTC+7) dùng cho mã đơn
function vnParts(d = new Date()) {
  const t = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return { yy: String(t.getUTCFullYear()).slice(2), mm: p(t.getUTCMonth() + 1), dd: p(t.getUTCDate()), HH: p(t.getUTCHours()), MI: p(t.getUTCMinutes()) };
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newOrderCode(d = new Date()) {
  const { yy, mm, dd, HH, MI } = vnParts(d);
  let r = '';
  for (let i = 0; i < 3; i++) r += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return `DW${yy}${mm}${dd}-${HH}${MI}${r}`;
}

function cleanText(v, max, field) {
  const s = String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (s.length > max) throw new HttpError(400, `${field} quá dài (tối đa ${max} ký tự).`);
  return s;
}

function cleanPhone(v) {
  const s = String(v ?? '').replace(/[\s.\-()]/g, '');
  if (!/^(\+84|0)\d{8,10}$/.test(s)) throw new HttpError(400, 'Số điện thoại chưa đúng, ví dụ 0912345678.');
  return s;
}

// Giới hạn số lần gọi theo địa chỉ IP trong một khoảng thời gian
function limiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return false; }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return true;
  };
}

module.exports = { HttpError, nowIso, newOrderCode, cleanText, cleanPhone, limiter, vnParts };
