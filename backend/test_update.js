const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'supermarket.db');
const db = new sqlite3.Database(dbPath);

// 测试更新
const testUpdate = () => {
  const id = 2;
  const shelf_life_days = 365;

  console.log('测试更新商品:', id, '保质期:', shelf_life_days);

  db.run(
    `UPDATE products
     SET shelf_life_days = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [shelf_life_days, id],
    function(err) {
      if (err) {
        console.error('更新错误:', err);
        return;
      }
      console.log('更新成功, changes:', this.changes);

      // 查询验证
      db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('查询错误:', err);
          return;
        }
        console.log('更新后的数据:', row);
      });
    }
  );
};

testUpdate();
