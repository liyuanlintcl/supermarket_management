const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'supermarket.db');

// 打开数据库连接，确保使用 UTF-8 编码
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

// 设置数据库编码为 UTF-8
db.run('PRAGMA encoding = "UTF-8"');

// 初始化数据库表
db.serialize(() => {
  // 商品表
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    sale_price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    shelf_life_days INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 检查并添加 shelf_life_days 字段（迁移）
  db.all("PRAGMA table_info(products)", [], (err, rows) => {
    if (err) {
      console.error('检查表结构失败:', err);
      return;
    }
    const hasShelfLifeDays = rows.some(row => row.name === 'shelf_life_days');
    if (!hasShelfLifeDays) {
      db.run("ALTER TABLE products ADD COLUMN shelf_life_days INTEGER DEFAULT 0", [], (err) => {
        if (err) {
          console.error('添加 shelf_life_days 字段失败:', err);
        } else {
          console.log('已添加 shelf_life_days 字段到 products 表');
        }
      });
    }

    // 检查并添加 min_shelf_stock 字段（迁移）
    const hasMinShelfStock = rows.some(row => row.name === 'min_shelf_stock');
    if (!hasMinShelfStock) {
      db.run("ALTER TABLE products ADD COLUMN min_shelf_stock INTEGER DEFAULT 10", [], (err) => {
        if (err) {
          console.error('添加 min_shelf_stock 字段失败:', err);
        } else {
          console.log('已添加 min_shelf_stock 字段到 products 表');
        }
      });
    }
  });

  // 入库记录表
  db.run(`CREATE TABLE IF NOT EXISTS stock_in (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price REAL NOT NULL,
    total_cost REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // 出库/销售记录表
  db.run(`CREATE TABLE IF NOT EXISTS stock_out (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    sale_price REAL NOT NULL,
    total_revenue REAL NOT NULL,
    profit REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // 检查并添加 payment_method 和 payment_code 字段（迁移）
  db.all("PRAGMA table_info(stock_out)", [], (err, rows) => {
    if (err) {
      console.error('检查 stock_out 表结构失败:', err);
      return;
    }
    const hasPaymentMethod = rows.some(row => row.name === 'payment_method');
    const hasPaymentCode = rows.some(row => row.name === 'payment_code');

    if (!hasPaymentMethod) {
      db.run("ALTER TABLE stock_out ADD COLUMN payment_method TEXT DEFAULT 'cash'", [], (err) => {
        if (err) {
          console.error('添加 payment_method 字段失败:', err);
        } else {
          console.log('已添加 payment_method 字段到 stock_out 表');
        }
      });
    }

    if (!hasPaymentCode) {
      db.run("ALTER TABLE stock_out ADD COLUMN payment_code TEXT", [], (err) => {
        if (err) {
          console.error('添加 payment_code 字段失败:', err);
        } else {
          console.log('已添加 payment_code 字段到 stock_out 表');
        }
      });
    }
  });

  // 批次表（存储同一种商品的不同批次信息）
  db.run(`CREATE TABLE IF NOT EXISTS batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    remaining_qty INTEGER NOT NULL,
    production_date TEXT NOT NULL,
    shelf_life_days INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);

  // 货架库存表（存储货架上的商品数量）
  db.run(`CREATE TABLE IF NOT EXISTS shelf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
});

module.exports = db;
