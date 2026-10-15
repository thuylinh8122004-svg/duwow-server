// Dùng: node scripts/reset-password.js "mật khẩu mới"   (đặt lại mật khẩu của tài khoản chủ quán)
const config = require('../src/config');
const { open } = require('../src/db');
const makeAuth = require('../src/services/authService');
const model = require('../src/models/taiKhoanModel');

const pw = process.argv[2];
if (!pw || pw.length < 8) { console.error('Hãy nhập mật khẩu mới từ 8 ký tự trở lên.'); process.exit(1); }
const tk = model(open());
const auth = makeAuth(tk);
const u = tk.byUsername(config.ADMIN_USER);
if (!u) { console.error('Chưa có tài khoản ' + config.ADMIN_USER + '. Hãy chạy máy chủ một lần trước.'); process.exit(1); }
tk.setPassword(u.ma_tk, auth.hashPassword(pw));
console.log('Đã đổi mật khẩu cho tài khoản ' + u.ten_dang_nhap + '.');
