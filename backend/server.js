require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

// 导入路由模块
const productsRouter = require('./routes/products');
const stockInRouter = require('./routes/stockIn');
const stockOutRouter = require('./routes/stockOut');
const batchesRouter = require('./routes/batches');
const statisticsRouter = require('./routes/statistics');
const shelfRouter = require('./routes/shelf');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// API 路由挂载
app.use('/api/products', productsRouter);
app.use('/api/stock-in', stockInRouter);
app.use('/api/stock-out', stockOutRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/shelf', shelfRouter);
app.use('/api/payment', paymentRouter);

// 临期商品 API 别名（兼容前端旧路径）
app.get('/api/near-expiry-products', (req, res) => {
  const { days = 30 } = req.query;
  const thresholdDays = parseInt(days);

  // 查询所有有货架库存的商品批次
  db.all(
    `SELECT b.*, p.name, p.barcode, s.quantity as shelf_quantity
     FROM batch b
     JOIN products p ON b.product_id = p.id
     LEFT JOIN shelf s ON b.product_id = s.product_id
     WHERE s.quantity > 0 OR b.remaining_qty > 0
     ORDER BY b.production_date ASC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // 重置时间为00:00:00

      const nearExpiryProducts = [];
      const processedProducts = new Set();

      rows.forEach(batch => {
        // 避免同一商品重复显示
        if (processedProducts.has(batch.product_id)) return;

        const expDate = new Date(batch.production_date);
        expDate.setDate(expDate.getDate() + batch.shelf_life_days);
        expDate.setHours(0, 0, 0, 0); // 重置时间为00:00:00

        const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry >= 0 && daysUntilExpiry <= thresholdDays) {
          processedProducts.add(batch.product_id);
          // 使用货架库存(如果有)或批次剩余库存
          const availableQty = batch.shelf_quantity !== null && batch.shelf_quantity !== undefined
            ? batch.shelf_quantity
            : batch.remaining_qty;

          nearExpiryProducts.push({
            id: batch.id,
            product_id: batch.product_id,
            product_name: batch.name,
            barcode: batch.barcode,
            name: batch.name,
            quantity: batch.quantity,
            remaining_qty: availableQty,
            production_date: batch.production_date,
            shelf_life_days: batch.shelf_life_days,
            expiry_date: expDate.toISOString().split('T')[0],
            days_until_expiry: daysUntilExpiry
          });
        }
      });

      res.json(nearExpiryProducts);
    }
  );
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
