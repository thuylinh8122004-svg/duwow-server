// Bảng định tuyến: nối đường dẫn API với Controller và quyền truy cập
const express = require('express');

module.exports = ({ ctl, mw }) => {
  const r = express.Router();
  const wrap = (fn) => (req, res, next) => { try { const p = fn(req, res, next); if (p && p.catch) p.catch(next); } catch (e) { next(e); } };
  const admin = mw.requireRole('admin', 'staff');

  r.get('/health', (req, res) => res.json({ ok: true }));

  // Khách
  r.get('/menu', wrap(ctl.menu.list));
  r.post('/orders', wrap(ctl.order.create));
  r.get('/orders/:code/status', wrap(ctl.order.status));
  r.get('/reviews', wrap(ctl.review.publicList));
  r.post('/reviews', wrap(ctl.review.create));

  // Đăng nhập
  r.post('/auth/login', wrap(ctl.auth.login));
  r.post('/auth/logout', wrap(ctl.auth.logout));
  r.get('/auth/me', wrap(ctl.auth.me));

  // Chủ Shop và nhân viên
  r.get('/admin/orders', admin, wrap(ctl.order.list));
  r.patch('/admin/orders/:code', admin, wrap(ctl.order.update));
  r.delete('/admin/orders/:code', admin, wrap(ctl.order.remove));
  r.put('/admin/availability', admin, wrap(ctl.menu.availability));
  r.post('/admin/menu', admin, wrap(ctl.menu.create));
  r.patch('/admin/menu/:id', admin, wrap(ctl.menu.update));
  r.delete('/admin/menu/:id', admin, wrap(ctl.menu.remove));
  r.get('/admin/reviews', admin, wrap(ctl.review.adminList));
  r.patch('/admin/reviews/:id', admin, wrap(ctl.review.update));
  r.delete('/admin/reviews/:id', admin, wrap(ctl.review.remove));

  r.use((req, res) => res.status(404).json({ error: 'Không có đường dẫn này.' }));
  return r;
};
