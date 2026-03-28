# 🏪 超市货物管理系统

一个基于 React + Node.js + SQLite 的超市货物管理系统，支持条形码扫描进行商品入库、出库，库存管理，销售统计等功能。

## ✨ 功能特性

- 📦 **商品管理**：添加、编辑、删除商品，设置条形码、名称、进价、售价
- 📥 **入库管理**：扫描条形码快速入库，记录入库数量和成本
- 📤 **销售出库**：扫描条形码进行销售，自动计算销售额和利润
- 📊 **统计报表**：查看库存量、销售量、销售额、利润等数据
- 🏆 **热销排行**：查看热销商品TOP10
- ⚠️ **库存预警**：自动标记库存不足的商品

## 🚀 快速开始

### 环境要求
- Node.js 14+
- npm 或 yarn

### 安装步骤

1. **安装后端依赖**
```bash
cd backend
npm install
```

2. **安装前端依赖**
```bash
cd frontend
npm install
```

3. **启动后端服务**
```bash
cd backend
npm start
```
后端服务将运行在 http://localhost:3001

4. **启动前端应用**
```bash
cd frontend
npm start
```
前端应用将运行在 http://localhost:3000

## 📖 使用说明

### 1. 商品管理
- 点击"📦 商品管理"标签
- 点击"➕ 添加商品"按钮添加新商品
- 输入条形码、商品名称、进价、售价等信息
- 可以通过条形码搜索商品
- 支持编辑和删除商品

### 2. 入库管理
- 点击"📥 入库管理"标签
- 扫描或输入商品条形码，按回车确认
- 系统自动显示商品信息
- 输入入库数量和进价
- 点击"确认入库"完成操作

### 3. 销售出库
- 点击"📤 销售出库"标签
- 扫描或输入商品条形码，按回车确认
- 系统自动显示商品信息和当前库存
- 输入销售数量
- 点击"确认销售"完成操作
- 系统自动计算销售额和利润

### 4. 统计报表
- 点击"📊 统计报表"标签
- 查看商品种类、总库存、销售额、利润等统计信息
- 可以按日期范围筛选数据
- 查看热销商品排行榜
- 查看经营概况

## 🔌 扫码枪使用

系统支持USB/蓝牙扫码枪，使用方法：
1. 将扫码枪连接到电脑
2. 在入库或出库页面，点击条形码输入框
3. 使用扫码枪扫描商品条形码
4. 扫码枪会自动输入条形码并触发查询

## 🗄️ 数据存储

系统使用 SQLite 数据库存储数据，数据库文件位于：
```
backend/supermarket.db
```

包含以下数据表：
- `products` - 商品信息表
- `stock_in` - 入库记录表
- `stock_out` - 出库/销售记录表

## 🛠️ 技术栈

- **前端**：React 18 + TypeScript + Bootstrap 5 + React-Bootstrap
- **后端**：Node.js + Express
- **数据库**：SQLite3
- **HTTP客户端**：Axios

## 📁 项目结构

```
supermarket_management/
├── backend/                 # 后端代码
│   ├── database.js         # 数据库连接和初始化
│   ├── server.js           # Express服务器和API
│   ├── package.json
│   └── supermarket.db      # SQLite数据库文件
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── ProductManagement.tsx
│   │   │   ├── StockIn.tsx
│   │   │   ├── StockOut.tsx
│   │   │   └── Statistics.tsx
│   │   ├── services/
│   │   │   └── api.ts      # API服务
│   │   ├── App.tsx
│   │   └── App.css
│   └── package.json
└── README.md
```

## 🔧 API接口

### 商品管理
- `GET /api/products` - 获取所有商品
- `GET /api/products/barcode/:barcode` - 根据条形码获取商品
- `POST /api/products` - 添加商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 入库管理
- `POST /api/stock-in` - 商品入库
- `GET /api/stock-in` - 获取入库记录

### 出库管理
- `POST /api/stock-out` - 商品出库/销售
- `GET /api/stock-out` - 获取出库记录

### 统计
- `GET /api/statistics` - 获取统计数据
- `GET /api/top-products` - 获取热销商品排行

## 📝 注意事项

1. 首次使用前需要先添加商品信息
2. 入库前请确保商品已存在于系统中
3. 出库时会检查库存，库存不足时无法出库
4. 数据库文件会自动创建，无需手动配置
5. 建议定期备份 `supermarket.db` 文件

## 🔒 安全提示

- 系统仅供本地使用，未做安全认证
- 请勿将系统部署到公网环境
- 定期备份数据库文件以防数据丢失

## 📄 许可证

MIT License
