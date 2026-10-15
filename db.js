// Kết nối cơ sở dữ liệu SQLite (module sqlite có sẵn trong Node 22) và nạp dữ liệu ban đầu.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

function open(file = config.DB_FILE) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  return db;
}

// Chạy nhiều lệnh trong một giao dịch: lỗi giữa chừng thì hủy hết (tính toàn vẹn ACID).
function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch (x) { /* đã hủy */ } throw e; }
}

function seedMenu(db) {
  const n = db.prepare('SELECT COUNT(*) AS n FROM mon').get().n;
  if (n > 0) return;
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', 'menu.json'), 'utf8'));
  const ins = db.prepare(`INSERT INTO mon (ma_mon, ten, ten_en, mo_ta, mo_ta_en, gia, best, nhan, anh, thu_tu, meta)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  tx(db, () => items.forEach((m) => ins.run(m.id, m.name, m.en || '', m.desc || '', m.den || '', m.price ?? null,
    m.best ? 1 : 0, m.tag || '', m.photo || '', m.order || 0, JSON.stringify({ art: m.art || null }))));
}

module.exports = { open, tx, seedMenu };
