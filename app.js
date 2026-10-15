// Lắp ráp ứng dụng: Model -> Service -> Controller -> Routes (kiến trúc MVC nhiều lớp)
const path = require('path');
const express = require('express');
const config = require('./config');
const { open, seedMenu } = require('./db');
const security = require('./middleware/security');
const makeAuthMw = require('./middleware/auth');

function createApp(dbFile) {
  const db = open(dbFile);
  seedMenu(db);

  const model = {
    taiKhoan: require('./models/taiKhoanModel')(db),
    mon: require('./models/monModel')(db),
    donHang: require('./models/donHangModel')(db),
    danhGia: require('./models/danhGiaModel')(db),
  };
  const svc = {
    auth: require('./services/authService')(model.taiKhoan),
    menu: require('./services/menuService')(model.mon),
    order: require('./services/orderService')(db, model.donHang, model.mon),
    review: require('./services/reviewService')(model.danhGia),
  };
  const ctl = {
    auth: require('./controllers/authController')(svc.auth),
    menu: require('./controllers/menuController')(svc.menu),
    order: require('./controllers/orderController')(svc.order),
    review: require('./controllers/reviewController')(svc.review),
  };
  const mw = makeAuthMw(svc.auth);
  const firstAdmin = svc.auth.ensureAdmin();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(security.headers);
  app.use(express.json({ limit: '3mb' }));
  app.use('/api', mw.loadUser, security.jsonOnly, require('./routes')({ ctl, mw }));
  app.use('/uploads', express.static(path.join(config.DATA_DIR, 'uploads'), { maxAge: '7d', index: false }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '5m' }));

  // View/Controller xử lý lỗi cuối cùng: luôn trả JSON gọn cho giao diện
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không đúng.' });
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu quá lớn.' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Máy chủ gặp lỗi, vui lòng thử lại.' : err.message });
  });
  return { app, db, firstAdmin };
}

module.exports = { createApp };
