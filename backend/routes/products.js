const express = require('express');
const db = require('../database');

const router = express.Router();

// 获取所有商品
router.get('/', (req, res) => {
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
router.get('/barcode/:barcode', (req, res) => {
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
router.post('/', (req, res) => {
  const { barcode, name, purchase_price, sale_price, stock, shelf_life_days, min_shelf_stock } = req.body;

  // 验证必填字段
  if (!shelf_life_days || parseInt(shelf_life_days) <= 0) {
    res.status(400).json({ error: '保质期天数为必填项，且必须大于0' });
    return;
  }

  db.run(
    `INSERT INTO products (barcode, name, purchase_price, sale_price, stock, shelf_life_days, min_shelf_stock)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [barcode, name, purchase_price, sale_price, stock || 0, parseInt(shelf_life_days), min_shelf_stock || 10],
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
router.put('/:id', (req, res) => {
  const { name, purchase_price, sale_price, shelf_life_days, min_shelf_stock } = req.body;

  const parsedShelfLifeDays = parseInt(shelf_life_days) || 0;
  const parsedMinShelfStock = parseInt(min_shelf_stock) || 10;

  db.run(
    `UPDATE products
     SET name = ?, purchase_price = ?, sale_price = ?, shelf_life_days = ?, min_shelf_stock = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, purchase_price, sale_price, parsedShelfLifeDays, parsedMinShelfStock, req.params.id],
    function(err) {
      if (err) {
        console.error('更新商品错误:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: '商品更新成功' });
    }
  );
});

// 删除商品
router.delete('/:id', (req, res) => {
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

module.exports = router;
