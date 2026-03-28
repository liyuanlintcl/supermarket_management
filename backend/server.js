const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3001;

// 允许所有来源访问（包括手机）
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ========== 商品管理 API ==========

// 获取所有商品
app.get('/api/products', (req, res) => {
  db.all(
    `SELECT * FROM products ORDER BY updated_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// 根据条形码获取商品
app.get('/api/products/barcode/:barcode', (req, res) => {
  db.get(
    `SELECT * FROM products WHERE barcode = ?`,
    [req.params.barcode],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: '商品不存在' });
        return;
      }
      res.json(row);
    }
  );
});

// 添加新商品
app.post('/api/products', (req, res) => {
  const { barcode, name, purchase_price, sale_price, stock } = req.body;
  
  db.run(
    `INSERT INTO products (barcode, name, purchase_price, sale_price, stock) 
     VALUES (?, ?, ?, ?, ?)`,
    [barcode, name, purchase_price, sale_price, stock || 0],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: '条形码已存在' });
          return;
        }
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        message: '商品添加成功' 
      });
    }
  );
});

// 更新商品
app.put('/api/products/:id', (req, res) => {
  const { name, purchase_price, sale_price } = req.body;
  
  db.run(
    `UPDATE products 
     SET name = ?, purchase_price = ?, sale_price = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, purchase_price, sale_price, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: '商品不存在' });
        return;
      }
      res.json({ message: '商品更新成功' });
    }
  );
});

// 删除商品
app.delete('/api/products/:id', (req, res) => {
  db.run(
    `DELETE FROM products WHERE id = ?`,
    [req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: '商品不存在' });
        return;
      }
      res.json({ message: '商品删除成功' });
    }
  );
});

// ========== 入库管理 API ==========

// 商品入库
app.post('/api/stock-in', (req, res) => {
  const { barcode, quantity, purchase_price } = req.body;
  
  db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: '商品不存在，请先添加商品' });
      return;
    }

    const totalCost = quantity * purchase_price;
    const newStock = product.stock + quantity;

    db.serialize(() => {
      // 添加入库记录
      db.run(
        `INSERT INTO stock_in (product_id, quantity, purchase_price, total_cost) 
         VALUES (?, ?, ?, ?)`,
        [product.id, quantity, purchase_price, totalCost]
      );

      // 更新商品库存
      db.run(
        `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newStock, product.id],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ 
            message: '入库成功', 
            product: { ...product, stock: newStock }
          });
        }
      );
    });
  });
});

// 获取入库记录
app.get('/api/stock-in', (req, res) => {
  const { start_date, end_date } = req.query;
  let query = `
    SELECT si.*, p.name, p.barcode 
    FROM stock_in si 
    JOIN products p ON si.product_id = p.id 
  `;
  let params = [];

  if (start_date && end_date) {
    query += ` WHERE si.created_at BETWEEN ? AND ?`;
    params = [start_date, end_date];
  }
  
  query += ` ORDER BY si.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// ========== 出库/销售 API ==========

// 商品出库/销售
app.post('/api/stock-out', (req, res) => {
  const { barcode, quantity } = req.body;
  
  db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }
    if (product.stock < quantity) {
      res.status(400).json({ error: `库存不足，当前库存: ${product.stock}` });
      return;
    }

    const totalRevenue = quantity * product.sale_price;
    const totalCost = quantity * product.purchase_price;
    const profit = totalRevenue - totalCost;
    const newStock = product.stock - quantity;

    db.serialize(() => {
      // 添加出库记录
      db.run(
        `INSERT INTO stock_out (product_id, quantity, sale_price, total_revenue, profit) 
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, quantity, product.sale_price, totalRevenue, profit]
      );

      // 更新商品库存
      db.run(
        `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newStock, product.id],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ 
            message: '出库成功', 
            product: { ...product, stock: newStock },
            revenue: totalRevenue,
            profit: profit
          });
        }
      );
    });
  });
});

// 获取出库/销售记录
app.get('/api/stock-out', (req, res) => {
  const { start_date, end_date } = req.query;
  let query = `
    SELECT so.*, p.name, p.barcode 
    FROM stock_out so 
    JOIN products p ON so.product_id = p.id 
  `;
  let params = [];

  if (start_date && end_date) {
    query += ` WHERE so.created_at BETWEEN ? AND ?`;
    params = [start_date, end_date];
  }
  
  query += ` ORDER BY so.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// ========== 统计 API ==========

// 获取统计数据
app.get('/api/statistics', (req, res) => {
  const { start_date, end_date } = req.query;
  
  // 库存统计
  db.get(`SELECT COUNT(*) as total_products, SUM(stock) as total_stock FROM products`, [], (err, stockStats) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // 销售统计
    let salesQuery = `SELECT COALESCE(SUM(quantity), 0) as total_sold, COALESCE(SUM(total_revenue), 0) as total_revenue, COALESCE(SUM(profit), 0) as total_profit FROM stock_out`;
    let salesParams = [];
    
    if (start_date && end_date) {
      salesQuery += ` WHERE created_at BETWEEN ? AND ?`;
      salesParams = [start_date, end_date];
    }

    db.get(salesQuery, salesParams, (err, salesStats) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // 入库统计
      let purchaseQuery = `SELECT COALESCE(SUM(quantity), 0) as total_purchased, COALESCE(SUM(total_cost), 0) as total_cost FROM stock_in`;
      let purchaseParams = [];
      
      if (start_date && end_date) {
        purchaseQuery += ` WHERE created_at BETWEEN ? AND ?`;
        purchaseParams = [start_date, end_date];
      }

      db.get(purchaseQuery, purchaseParams, (err, purchaseStats) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({
          stock: stockStats,
          sales: salesStats,
          purchase: purchaseStats
        });
      });
    });
  });
});

// 获取热销商品排行
app.get('/api/top-products', (req, res) => {
  const { limit = 10 } = req.query;
  
  db.all(
    `SELECT p.name, p.barcode, SUM(so.quantity) as total_sold, SUM(so.total_revenue) as total_revenue
     FROM stock_out so
     JOIN products p ON so.product_id = p.id
     GROUP BY so.product_id
     ORDER BY total_sold DESC
     LIMIT ?`,
    [parseInt(limit)],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
