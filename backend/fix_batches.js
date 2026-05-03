const db = require('./database');

// 为已有库存但没有批次记录的商品创建批次
function fixBatches() {
  console.log('开始修复批次数据...');

  // 查找所有有库存但没有批次的商品
  db.all(
    `SELECT p.* FROM products p
     WHERE p.stock > 0
     AND NOT EXISTS (
       SELECT 1 FROM batch b WHERE b.product_id = p.id
     )`,
    [],
    (err, products) => {
      if (err) {
        console.error('查询失败:', err);
        return;
      }

      console.log(`找到 ${products.length} 个需要修复的商品`);

      if (products.length === 0) {
        console.log('没有需要修复的商品');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      products.forEach(product => {
        // 如果保质期为0，设置默认365天
        const shelfLifeDays = product.shelf_life_days > 0 ? product.shelf_life_days : 365;

        // 创建批次记录
        db.run(
          `INSERT INTO batch (product_id, quantity, remaining_qty, production_date, shelf_life_days)
           VALUES (?, ?, ?, ?, ?)`,
          [product.id, product.stock, product.stock, today, shelfLifeDays],
          (err) => {
            if (err) {
              console.error(`为商品 ${product.name} 创建批次失败:`, err);
            } else {
              console.log(`已为 ${product.name} 创建批次: 数量=${product.stock}, 生产日期=${today}, 保质期=${shelfLifeDays}天`);

              // 同时更新商品的保质期（如果原来是0）
              if (product.shelf_life_days === 0) {
                db.run(
                  `UPDATE products SET shelf_life_days = ? WHERE id = ?`,
                  [365, product.id]
                );
              }
            }
          }
        );
      });

      console.log('批次修复完成');
    }
  );
}

// 执行修复
fixBatches();

// 等待所有数据库操作完成
setTimeout(() => {
  console.log('关闭数据库连接');
  db.close();
}, 2000);
