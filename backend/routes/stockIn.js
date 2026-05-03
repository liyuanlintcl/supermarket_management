const express = require('express');
const db = require('../database');

const router = express.Router();

// 商品入库（支持批次管理）
router.post('/', (req, res) => {
  const { barcode, quantity, purchase_price, production_date, shelf_life_days } = req.body;

  // 验证生产日期必填
  if (!production_date) {
    res.status(400).json({ error: '生产日期为必填项' });
    return;
  }

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

      // 创建批次记录（使用提供的保质期或商品默认保质期）
      const finalShelfLifeDays = shelf_life_days || product.shelf_life_days || 365;
      db.run(
        `INSERT INTO batch (product_id, quantity, production_date, shelf_life_days, remaining_qty)
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, quantity, production_date, finalShelfLifeDays, quantity]
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
router.get('/', (req, res) => {
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

module.exports = router;
