const express = require('express');
const db = require('../database');

const router = express.Router();

// 获取统计数据
router.get('/', (req, res) => {
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
router.get('/top-products', (req, res) => {
  const { limit = 10, start_date, end_date } = req.query;

  let query = `SELECT p.name, p.barcode, SUM(so.quantity) as total_sold, SUM(so.total_revenue) as total_revenue
     FROM stock_out so
     JOIN products p ON so.product_id = p.id`;
  let params = [];

  if (start_date && end_date) {
    query += ` WHERE so.created_at BETWEEN ? AND ?`;
    params = [start_date, end_date];
  }

  query += ` GROUP BY so.product_id ORDER BY total_sold DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

module.exports = router;
