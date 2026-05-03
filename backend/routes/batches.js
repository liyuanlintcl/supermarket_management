const express = require('express');
const db = require('../database');

const router = express.Router();

// 获取商品批次列表
router.get('/', (req, res) => {
  const { product_id } = req.query;
  let query = `
    SELECT b.*, p.name, p.barcode
    FROM batch b
    JOIN products p ON b.product_id = p.id
  `;
  let params = [];

  if (product_id) {
    query += ` WHERE b.product_id = ?`;
    params = [product_id];
  }

  query += ` ORDER BY b.production_date ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // 计算到期日期和状态
    const batches = rows.map(batch => {
      const expDate = new Date(batch.production_date);
      expDate.setDate(expDate.getDate() + batch.shelf_life_days);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      return {
        ...batch,
        expiry_date: expDate.toISOString().split('T')[0],
        days_until_expiry: daysUntilExpiry,
        is_expired: daysUntilExpiry < 0,
        is_near_expiry: daysUntilExpiry >= 0 && daysUntilExpiry <= 30
      };
    });

    res.json(batches);
  });
});

// 获取临期商品（30 天内到期）
router.get('/near-expiry', (req, res) => {
  const { days = 30 } = req.query;
  const thresholdDays = parseInt(days);

  db.all(
    `SELECT b.*, p.name, p.barcode
     FROM batch b
     JOIN products p ON b.product_id = p.id
     WHERE b.remaining_qty > 0
     ORDER BY b.production_date ASC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const today = new Date();
      const nearExpiryProducts = [];

      rows.forEach(batch => {
        const expDate = new Date(batch.production_date);
        expDate.setDate(expDate.getDate() + batch.shelf_life_days);
        const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry >= 0 && daysUntilExpiry <= thresholdDays && batch.remaining_qty > 0) {
          nearExpiryProducts.push({
            ...batch,
            expiry_date: expDate.toISOString().split('T')[0],
            days_until_expiry: daysUntilExpiry
          });
        }
      });

      res.json(nearExpiryProducts);
    }
  );
});

// 删除批次（当批次剩余数量为 0 时）
router.delete('/:id', (req, res) => {
  db.get(`SELECT * FROM batch WHERE id = ?`, [req.params.id], (err, batch) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!batch) {
      res.status(404).json({ error: '批次不存在' });
      return;
    }
    if (batch.remaining_qty > 0) {
      res.status(400).json({ error: '批次仍有库存，无法删除' });
      return;
    }

    db.run(`DELETE FROM batch WHERE id = ?`, [req.params.id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: '批次删除成功' });
    });
  });
});

module.exports = router;
