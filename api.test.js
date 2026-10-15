process.env.ADMIN_PASSWORD = 'Test-pass-123';
process.env.DATA_DIR = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'dw-'));
const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server, base, cookie = '';
test.before(async () => {
  const { app } = createApp(':memory:');
  await new Promise((r) => { server = app.listen(0, r); });
  base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => server.close());

async function api(method, url, body, opt = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'duwow', ...(opt.cookie === false ? {} : { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const sc = res.headers.get('set-cookie'); if (sc && opt.save) cookie = sc.split(';')[0];
  let data = null; try { data = await res.json(); } catch (e) { /* không có thân */ }
  return { status: res.status, data };
}
const cust = { name: 'Lan', phone: '0912 345 678', addr: 'Xuân Đỉnh, Hà Nội' };

test('menu có 11 món kèm giá và ảnh', async () => {
  const r = await api('GET', '/api/menu', undefined, { cookie: false });
  assert.equal(r.status, 200);
  assert.equal(r.data.items.length, 11);
  const tc = r.data.items.find((m) => m.id === 'tra-chanh');
  assert.equal(tc.price, 30000); assert.equal(tc.soldOut, false); assert.match(tc.photo, /^\/img\//);
});

test('khách đặt đơn: giá do máy chủ tính, bỏ qua giá gửi lên', async () => {
  const r = await api('POST', '/api/orders', { ...cust, items: [{ id: 'tra-chanh', qty: 2, price: 1 }, { id: 'bo-dua', qty: 1, note: 'ít đá' }] }, { cookie: false });
  assert.equal(r.status, 201);
  assert.equal(r.data.total, 2 * 30000 + 45000);
  assert.match(r.data.code, /^DW\d{6}-\d{4}[A-Z0-9]{3}$/);
  assert.equal(r.data.items.length, 2);
});

test('từ chối đơn sai: số điện thoại, món lạ, số lượng, đơn rỗng', async () => {
  assert.equal((await api('POST', '/api/orders', { ...cust, phone: '123', items: [{ id: 'tra-chanh', qty: 1 }] }, { cookie: false })).status, 400);
  assert.equal((await api('POST', '/api/orders', { ...cust, items: [{ id: 'khong-co', qty: 1 }] }, { cookie: false })).status, 400);
  assert.equal((await api('POST', '/api/orders', { ...cust, items: [{ id: 'tra-chanh', qty: 0 }] }, { cookie: false })).status, 400);
  assert.equal((await api('POST', '/api/orders', { ...cust, items: [] }, { cookie: false })).status, 400);
});

test('API quản lý yêu cầu đăng nhập', async () => {
  assert.equal((await api('GET', '/api/admin/orders', undefined, { cookie: false })).status, 401);
  assert.equal((await api('PUT', '/api/admin/availability', { soldOut: [] }, { cookie: false })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { username: 'shop', password: 'sai' }, { cookie: false })).status, 401);
});

test('chủ Shop đăng nhập và thấy đơn vừa đặt', async () => {
  const l = await api('POST', '/api/auth/login', { username: 'shop', password: 'Test-pass-123' }, { save: true, cookie: false });
  assert.equal(l.status, 200); assert.equal(l.data.role, 'admin');
  const me = await api('GET', '/api/auth/me'); assert.equal(me.data.user, 'shop');
  const r = await api('GET', '/api/admin/orders');
  assert.equal(r.status, 200); assert.ok(r.data.orders.length >= 1);
  const o = r.data.orders[0];
  assert.equal(o.n, 'Lan'); assert.equal(o.ds, 0); assert.equal(o.st, 'new'); assert.equal(o.l.length, 2); assert.equal(o.total, 105000);
});

test('chuyển trạng thái đơn và khách theo dõi được', async () => {
  const code = (await api('GET', '/api/admin/orders')).data.orders[0].c;
  const a = await api('PATCH', '/api/admin/orders/' + code, { ds: 2 });
  assert.equal(a.data.ds, 2); assert.ok(a.data.dt[1] && a.data.dt[2]);
  const s = await api('GET', `/api/orders/${code}/status`, undefined, { cookie: false });
  assert.equal(s.data.ds, 2); assert.ok(s.data.dt[1]); assert.equal(s.data.dt[3], '');
  assert.equal(JSON.stringify(s.data).includes('Lan'), false); // không lộ thông tin khách
  const b = await api('PATCH', '/api/admin/orders/' + code, { ds: 3, paid: true });
  assert.equal(b.data.ds, 3); assert.equal(b.data.st, 'paid');
  const back = await api('PATCH', '/api/admin/orders/' + code, { ds: 1 });
  assert.equal(back.data.ds, 1); assert.equal(back.data.dt[2], '');
  assert.equal((await api('PATCH', '/api/admin/orders/' + code, { ds: 9 })).status, 400);
  assert.equal((await api('GET', '/api/orders/KHONGCO/status', undefined, { cookie: false })).status, 404);
});

test('báo hết hàng: khách thấy và không đặt được', async () => {
  const r = await api('PUT', '/api/admin/availability', { soldOut: ['tra-chanh'] });
  assert.deepEqual(r.data.soldOut, ['tra-chanh']);
  const m = await api('GET', '/api/menu', undefined, { cookie: false });
  assert.equal(m.data.items.find((x) => x.id === 'tra-chanh').soldOut, true);
  const o = await api('POST', '/api/orders', { ...cust, items: [{ id: 'tra-chanh', qty: 1 }] }, { cookie: false });
  assert.equal(o.status, 409); assert.match(o.data.error, /hết hàng/);
  await api('PUT', '/api/admin/availability', { soldOut: [] });
  const ok = await api('POST', '/api/orders', { ...cust, items: [{ id: 'tra-chanh', qty: 1 }] }, { cookie: false });
  assert.equal(ok.status, 201);
});

test('đánh giá: khách gửi, chủ Shop duyệt mới hiện, tính điểm trung bình', async () => {
  assert.equal((await api('POST', '/api/reviews', { level: 5 }, { cookie: false })).status, 400);
  assert.equal((await api('POST', '/api/reviews', { name: 'A', level: 3, text: 'Ngon' }, { cookie: false })).status, 201);
  assert.equal((await api('POST', '/api/reviews', { name: 'B', level: 2, text: 'Ổn' }, { cookie: false })).status, 201);
  assert.equal((await api('GET', '/api/reviews', undefined, { cookie: false })).data.count, 0);
  const all = (await api('GET', '/api/admin/reviews')).data.items;
  for (const r of all) await api('PATCH', '/api/admin/reviews/' + r.id, { show: true, reply: r.name === 'A' ? 'Cảm ơn bạn' : '' });
  const pub = (await api('GET', '/api/reviews', undefined, { cookie: false })).data;
  assert.equal(pub.count, 2); assert.equal(pub.avg, 2.5);
  assert.ok(pub.items.some((r) => r.reply === 'Cảm ơn bạn'));
  await api('DELETE', '/api/admin/reviews/' + all[0].id);
  assert.equal((await api('GET', '/api/reviews', undefined, { cookie: false })).data.count, 1);
});

test('thêm món, sửa giá, tải ảnh, xóa món', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const c = await api('POST', '/api/admin/menu', { name: 'Matcha latte', desc: 'Thơm béo', price: 42000, photo: png });
  assert.equal(c.status, 201); assert.match(c.data.photo, /^\/uploads\//);
  const img = await fetch(base + c.data.photo); assert.equal(img.status, 200);
  assert.equal((await api('PATCH', '/api/admin/menu/' + c.data.id, { price: 45000 })).data.price, 45000);
  assert.equal((await api('POST', '/api/admin/menu', { name: 'X', photo: 'data:image/png;base64,AAAA' })).status, 400);
  assert.equal((await api('POST', '/api/admin/menu', { name: 'X', price: -5 })).status, 400);
  assert.equal((await api('GET', '/api/menu', undefined, { cookie: false })).data.items.length, 12);
  assert.equal((await api('DELETE', '/api/admin/menu/' + c.data.id)).status, 200);
  assert.equal((await api('GET', '/api/menu', undefined, { cookie: false })).data.items.length, 11);
});

test('xóa đơn và đăng xuất', async () => {
  const code = (await api('GET', '/api/admin/orders')).data.orders[0].c;
  assert.equal((await api('DELETE', '/api/admin/orders/' + code)).status, 200);
  assert.equal((await api('GET', `/api/orders/${code}/status`, undefined, { cookie: false })).status, 404);
  await api('POST', '/api/auth/logout');
  const me = await fetch(base + '/api/auth/me', { headers: { Cookie: 'dw_sid=' } });
  assert.equal((await me.json()).user, null);
});

test('chặn yêu cầu ghi không đúng kiểu', async () => {
  const r = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.ok([400, 415].includes(r.status));
});
