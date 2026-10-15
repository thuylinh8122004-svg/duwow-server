const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

// Khóa ký cookie: lấy từ biến môi trường, nếu chưa có thì tạo một lần và lưu trong thư mục dữ liệu.
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(DATA_DIR, 'secret.key');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch (e) { /* tạo mới */ }
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DATA_DIR,
  DB_FILE: process.env.DB_FILE || path.join(DATA_DIR, 'duwow.sqlite'),
  SECRET: loadSecret(),
  ADMIN_USER: process.env.ADMIN_USER || 'shop',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  SESSION_HOURS: 24 * 7,
  SECURE_COOKIE: process.env.NODE_ENV === 'production',
  SHOP: { phone: '0865538174' },
};
