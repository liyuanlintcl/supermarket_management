const express = require('express');
const db = require('../database');
const { wechatPayService, alipayService } = require('../services/paymentService');

const router = express.Router();

// 自动识别付款码类型
function detectPaymentMethod(paymentCode) {
  if (!paymentCode) return null;
  const code = paymentCode.trim();

  // 微信支付：18位，以 10-15 开头
  if (/^1[0-5]\d{16}$/.test(code)) {
    return 'wechat';
  }

  // 支付宝付款码：16-24位，以 25-30 开头
  if (/^2[5-9]\d{14,23}$/.test(code) || /^30\d{14,23}$/.test(code)) {
    return 'alipay';
  }

  // 其他16位以上数字，根据开头判断
  if (/^\d{16,}$/.test(code)) {
    if (/^1[0-5]/.test(code)) {
      return 'wechat';
    } else if (/^2[5-9]/.test(code) || /^30/.test(code)) {
      return 'alipay';
    }
  }

  return null;
}

// 统一的扫码支付函数
async function processScanPay(paymentMethod, paymentCode, amount, outTradeNo, description) {
  // 如果没有指定支付方式，自动识别
  if (!paymentMethod || paymentMethod === 'scan') {
    paymentMethod = detectPaymentMethod(paymentCode);
    if (!paymentMethod) {
      throw new Error('无法识别付款码类型，请检查码是否正确');
    }
  }

  if (paymentMethod === 'wechat') {
    return await wechatPayService.scanPay(paymentCode, amount, outTradeNo, description);
  } else if (paymentMethod === 'alipay') {
    return await alipayService.scanPay(paymentCode, amount, outTradeNo, description);
  } else {
    throw new Error('不支持的支付方式');
  }
}

// 商品出库/销售（从货架扣减）
router.post('/', async (req, res) => {
  const { barcode, quantity, payment_method = 'cash', payment_code, actual_revenue } = req.body;

  // 验证支付方式
  if (!['cash', 'alipay', 'wechat'].includes(payment_method)) {
    res.status(400).json({ error: '支付方式无效，支持 cash/alipay/wechat' });
    return;
  }

  // 扫码支付需要验证付款码
  if ((payment_method === 'alipay' || payment_method === 'wechat') && !payment_code) {
    res.status(400).json({ error: '扫码支付需要提供付款码' });
    return;
  }

  try {
    // 查询商品
    const product = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM products WHERE barcode = ?`, [barcode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    // 检查货架库存
    const shelf = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM shelf WHERE product_id = ?`, [product.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const shelfQty = shelf ? shelf.quantity : 0;
    if (shelfQty < quantity) {
      res.status(400).json({
        error: `货架库存不足，当前货架库存: ${shelfQty}，请先上架商品`,
        shelf_stock: shelfQty,
        total_stock: product.stock,
        need_stock: quantity
      });
      return;
    }

    // 计算销售额和利润
    const originalRevenue = quantity * product.sale_price;  // 原应收金额（商品标价）
    const receivedAmount = actual_revenue !== undefined ? parseFloat(actual_revenue) : originalRevenue;  // 实际收款金额
    // 销售额逻辑：如果实付 >= 售价，则销售额为售价（多付是找零）；如果实付 < 售价，则销售额为实付（赊账/部分支付）
    const actualRevenue = receivedAmount >= originalRevenue ? originalRevenue : receivedAmount;
    const totalCost = quantity * product.purchase_price;  // 成本
    const profit = actualRevenue - totalCost;  // 利润按实际销售额计算
    const newStock = product.stock - quantity;

    // 如果是扫码支付，先调用支付接口
    let payResult = null;
    if (payment_method === 'alipay' || payment_method === 'wechat') {
      try {
        // 生成订单号
        const outTradeNo = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        payResult = await processScanPay(payment_method, payment_code, actualRevenue, outTradeNo, product.name);
      } catch (payError) {
        res.status(400).json({ error: `支付失败: ${payError.message}` });
        return;
      }
    }

    // 执行出库操作
    console.log('DEBUG: 开始出库，payment_method=', payment_method, 'payment_code=', payment_code, 'actual_revenue=', actualRevenue);
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        // 1. 从货架扣减
        db.run(
          `UPDATE shelf SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
          [quantity, product.id]
        );

        // 2. 查询批次并扣减
        db.all(
          `SELECT * FROM batch WHERE product_id = ? AND remaining_qty > 0 ORDER BY production_date ASC`,
          [product.id],
          (err, batches) => {
            if (err) {
              reject(err);
              return;
            }

            let remainingQty = quantity;

            const updateBatch = (index) => {
              if (index >= batches.length || remainingQty <= 0) {
                // 3. 添加出库记录（包含支付方式）
                console.log('DEBUG: inserting with payment_method=', payment_method, 'payment_code=', payment_code, 'actual_revenue=', actualRevenue);
                db.run(
                  `INSERT INTO stock_out (product_id, quantity, sale_price, total_revenue, profit, payment_method, payment_code)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [product.id, quantity, product.sale_price, actualRevenue, profit, payment_method, payment_code || null],
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    // 4. 更新商品总库存
                    db.run(
                      `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                      [newStock, product.id],
                      (err) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        resolve({
                          message: '出库成功',
                          product: { ...product, stock: newStock },
                          revenue: actualRevenue,
                          original_revenue: originalRevenue,
                          profit: profit,
                          shelf_remaining: shelfQty - quantity,
                          payment_method: payment_method,
                          trade_no: payResult ? payResult.trade_no : null
                        });
                      }
                    );
                  }
                );
                return;
              }

              const batch = batches[index];
              const deductQty = Math.min(remainingQty, batch.remaining_qty);

              db.run(
                `UPDATE batch SET remaining_qty = remaining_qty - ? WHERE id = ?`,
                [deductQty, batch.id],
                (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  remainingQty -= deductQty;
                  updateBatch(index + 1);
                }
              );
            };

            updateBatch(0);
          }
        );
      });
    });

    res.json({
      message: payment_method === 'cash' ? '收款成功' : `${payment_method === 'alipay' ? '支付宝' : '微信'}收款成功`,
      product: { ...product, stock: newStock },
      revenue: actualRevenue,
      original_revenue: originalRevenue,
      profit: profit,
      shelf_remaining: shelfQty - quantity,
      payment_method: payment_method,
      trade_no: payResult ? payResult.trade_no : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取出库/销售记录
router.get('/', (req, res) => {
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

module.exports = router;
