-- Cơ sở dữ liệu ĐỦ WOW CHƯA (SQLite). Đặt tên bảng theo kiểu báo cáo mẫu: tai_khoan, mon, don_hang...
PRAGMA foreign_keys = ON;

-- Tài khoản chủ Shop / nhân viên (phân quyền RBAC: admin, staff)
CREATE TABLE IF NOT EXISTS tai_khoan (
  ma_tk          INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap  TEXT NOT NULL UNIQUE,
  mat_khau       TEXT NOT NULL,                       -- scrypt$muối$băm, không lưu mật khẩu thô
  quyen          TEXT NOT NULL CHECK (quyen IN ('admin','staff')),
  trang_thai     INTEGER NOT NULL DEFAULT 1           -- 1: hoạt động, 0: bị khóa
);

-- Thực đơn
CREATE TABLE IF NOT EXISTS mon (
  ma_mon    TEXT PRIMARY KEY,
  ten       TEXT NOT NULL,
  ten_en    TEXT NOT NULL DEFAULT '',
  mo_ta     TEXT NOT NULL DEFAULT '',
  mo_ta_en  TEXT NOT NULL DEFAULT '',
  gia       INTEGER CHECK (gia IS NULL OR gia >= 0),
  best      INTEGER NOT NULL DEFAULT 0,
  nhan      TEXT NOT NULL DEFAULT '',                 -- nhãn nhỏ, ví dụ Healthy
  anh       TEXT NOT NULL DEFAULT '',                 -- đường dẫn ảnh
  het_hang  INTEGER NOT NULL DEFAULT 0,               -- 1: hết hàng, khách không chọn được
  hien      INTEGER NOT NULL DEFAULT 1,               -- 0: đã xóa khỏi menu
  thu_tu    INTEGER NOT NULL DEFAULT 0,
  meta      TEXT NOT NULL DEFAULT '{}'                -- JSON hình vẽ dự phòng
);

-- Đơn hàng
CREATE TABLE IF NOT EXISTS don_hang (
  ma_don        TEXT PRIMARY KEY,
  ten_khach     TEXT NOT NULL,
  sdt           TEXT NOT NULL,
  dia_chi       TEXT NOT NULL,
  ghi_chu       TEXT NOT NULL DEFAULT '',
  tong_tien     INTEGER NOT NULL DEFAULT 0,
  thanh_toan    INTEGER NOT NULL DEFAULT 0,           -- 1: Shop đã nhận tiền
  tg_thanh_toan TEXT NOT NULL DEFAULT '',
  trang_thai    INTEGER NOT NULL DEFAULT 0 CHECK (trang_thai BETWEEN 0 AND 3),
                                                      -- 0 Đã đặt, 1 Đã lấy đơn, 2 Đang giao, 3 Giao thành công
  tg_tao        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_don_tg ON don_hang (tg_tao);

CREATE TABLE IF NOT EXISTS chi_tiet_don (
  ma_ct     INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_don    TEXT NOT NULL REFERENCES don_hang (ma_don) ON DELETE CASCADE,
  ma_mon    TEXT NOT NULL REFERENCES mon (ma_mon),
  ten_mon   TEXT NOT NULL,                            -- lưu lại tên và giá tại thời điểm đặt
  don_gia   INTEGER,
  so_luong  INTEGER NOT NULL CHECK (so_luong BETWEEN 1 AND 99),
  ghi_chu   TEXT NOT NULL DEFAULT ''
);

-- Nhật ký chuyển trạng thái đơn (hiện giờ trên màn theo dõi của khách)
CREATE TABLE IF NOT EXISTS nhat_ky_don (
  ma      INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_don  TEXT NOT NULL REFERENCES don_hang (ma_don) ON DELETE CASCADE,
  trang_thai INTEGER NOT NULL,
  tg      TEXT NOT NULL,
  ma_tk   INTEGER REFERENCES tai_khoan (ma_tk)
);

-- Đánh giá của khách (ba mức wow tương ứng 1 đến 3 sao)
CREATE TABLE IF NOT EXISTS danh_gia (
  ma_dg     INTEGER PRIMARY KEY AUTOINCREMENT,
  ten       TEXT NOT NULL DEFAULT '',
  muc       INTEGER NOT NULL CHECK (muc BETWEEN 1 AND 3),
  noi_dung  TEXT NOT NULL DEFAULT '',
  ma_don    TEXT,
  hien      INTEGER NOT NULL DEFAULT 0,               -- 1: chủ Shop cho hiện công khai
  phan_hoi  TEXT NOT NULL DEFAULT '',
  tg        TEXT NOT NULL
);
