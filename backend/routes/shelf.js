const express = require('express');
const db = require('../database');

const router = express.Router();

// 获取货架商品列表
router.get('/', (req, res) => {
  db.all(
    `SELECT s.*, p.name, p.barcode, p.stock as total_stock, p.min_shelf_stock,
            CASE WHEN s.quantity <= p.min_shelf_stock THEN 1 ELSE 0 END as is_low_stock
     FROM shelf s
     JOIN products p ON s.product_id = p.id
     ORDER BY s.updated_at DESC`,
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

// 获取库存不足的商品列表
router.get('/low-stock', (req, res) => {
  db.all(
    `SELECT s.*, p.name, p.barcode, p.stock as total_stock, p.min_shelf_stock
     FROM shelf s
     JOIN products p ON s.product_id = p.id
     WHERE s.quantity <= p.min_shelf_stock
     ORDER BY s.quantity ASC`,
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

// 获取指定商品的批次信息（用于上架时选择）
router.get('/batches/:barcode', (req, res) => {
  const { barcode } = req.params;

  db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    // 获取该商品的所有批次（按生产日期排序，先进先出）
    db.all(
      `SELECT * FROM batch
       WHERE product_id = ? AND remaining_qty > 0
       ORDER BY production_date ASC`,
      [product.id],
      (err, batches) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // 计算每个批次的到期日期
        const batchesWithExpiry = batches.map(batch => {
          const expDate = new Date(batch.production_date);
          expDate.setDate(expDate.getDate() + batch.shelf_life_days);
          const today = new Date();
          const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

          return {
            ...batch,
            expiry_date: expDate.toISOString().split('T')[0],
            days_until_expiry: daysUntilExpiry,
            is_expired: daysUntilExpiry < 0
          };
        });

        // 获取当前货架库存
        db.get(`SELECT * FROM shelf WHERE product_id = ?`, [product.id], (err, shelf) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          res.json({
            product,
            shelf: shelf || { quantity: 0 },
            batches: batchesWithExpiry
          });
        });
      }
    );
  });
});

// 上架操作（从批次到货架）
router.post('/stock', (req, res) => {
  const { barcode, quantity } = req.body;

  if (!barcode || !quantity || quantity <= 0) {
    res.status(400).json({ error: '请提供有效的条形码和数量' });
    return;
  }

  db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    // 检查总库存是否足够
    if (product.stock < quantity) {
      res.status(400).json({ error: `总库存不足，当前总库存: ${product.stock}` });
      return;
    }

    // 获取该商品的所有批次（按生产日期排序）
    db.all(
      `SELECT * FROM batch WHERE product_id = ? AND remaining_qty > 0 ORDER BY production_date ASC`,
      [product.id],
      (err, batches) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        // 计算可用批次库存
        const totalAvailable = batches.reduce((sum, batch) => sum + batch.remaining_qty, 0);
        if (totalAvailable < quantity) {
          res.status(400).json({ error: `批次库存不足，可用批次库存: ${totalAvailable}` });
          return;
        }

        // 开始事务：从批次扣减，增加到货架
        db.serialize(() => {
          let remainingQty = quantity;

          // 依次从各批次扣减
          const updateBatch = (index, callback) => {
            if (index >= batches.length || remainingQty <= 0) {
              callback();
              return;
            }

            const batch = batches[index];
            const deductQty = Math.min(remainingQty, batch.remaining_qty);

            db.run(
              `UPDATE batch SET remaining_qty = remaining_qty - ? WHERE id = ?`,
              [deductQty, batch.id],
              (err) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                remainingQty -= deductQty;
                updateBatch(index + 1, callback);
              }
            );
          };

          // 执行批次扣减
          updateBatch(0, () => {
            // 更新货架库存
            db.get(`SELECT * FROM shelf WHERE product_id = ?`, [product.id], (err, shelf) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }

              if (shelf) {
                // 更新现有货架记录
                db.run(
                  `UPDATE shelf SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                  [quantity, shelf.id],
                  (err) => {
                    if (err) {
                      res.status(500).json({ error: err.message });
                      return;
                    }
                    res.json({
                      message: '上架成功',
                      product: product.name,
                      quantity: quantity,
                      shelf_quantity: shelf.quantity + quantity
                    });
                  }
                );
              } else {
                // 创建新的货架记录
                db.run(
                  `INSERT INTO shelf (product_id, quantity) VALUES (?, ?)`,
                  [product.id, quantity],
                  (err) => {
                    if (err) {
                      res.status(500).json({ error: err.message });
                      return;
                    }
                    res.json({
                      message: '上架成功',
                      product: product.name,
                      quantity: quantity,
                      shelf_quantity: quantity
                    });
                  }
                );
              }
            });
          });
        });
      }
    );
  });
});

// 下架操作（从货架退回，增加到批次）
router.post('/remove', (req, res) => {
  const { barcode, quantity } = req.body;

  if (!barcode || !quantity || quantity <= 0) {
    res.status(400).json({ error: '请提供有效的条形码和数量' });
    return;
  }

  db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    // 检查货架库存
    db.get(`SELECT * FROM shelf WHERE product_id = ?`, [product.id], (err, shelf) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!shelf || shelf.quantity < quantity) {
        res.status(400).json({ error: `货架库存不足，当前货架库存: ${shelf ? shelf.quantity : 0}` });
        return;
      }

      db.serialize(() => {
        // 从货架扣减
        db.run(
          `UPDATE shelf SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [quantity, shelf.id],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }

            // 创建一个新的批次记录（下架回仓库）
            const today = new Date().toISOString().split('T')[0];
            db.run(
              `INSERT INTO batch (product_id, quantity, remaining_qty, production_date, shelf_life_days)
               VALUES (?, ?, ?, ?, ?)`,
              [product.id, quantity, quantity, today, product.shelf_life_days || 30],
              (err) => {
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
                res.json({
                  message: '下架成功',
                  product: product.name,
                  quantity: quantity,
                  shelf_quantity: shelf.quantity - quantity
                });
              }
            );
          }
        );
      });
    });
  });
});

module.exports = router;
