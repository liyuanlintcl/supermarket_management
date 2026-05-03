# AGENTS.md — 超市货物管理系统

> 本文档面向 AI 编程助手。如果你正在阅读此文件，说明你可能需要在这个代码库上进行开发、调试或维护工作。以下信息全部基于项目实际代码，而非假设。

---

## 项目概述

这是一个基于 **React + Node.js + SQLite** 的超市货物管理单页应用（SPA）。系统支持条形码扫描驱动的商品入库、货架上架、销售出库、库存预警、批次追踪（保质期）和统计报表。前后端分离，通过 REST API 通信。

项目的主要使用场景是本地单机或局域网内的收银台/库房管理，**未设计任何安全认证机制**。

---

## 技术栈

### 后端 (`backend/`)
- **运行时**：Node.js (CommonJS 模块)
- **框架**：Express 5.x
- **数据库**：SQLite3 (`sqlite3` npm 包)
- **跨域**：`cors`（已配置 `origin: '*'`）
- **环境变量**：`dotenv`
- **支付相关**：预留了微信支付（`wxpay-v3`）和支付宝（`alipay-sdk`）接口，但默认使用模拟支付

### 前端 (`frontend/`)
- **框架**：React 19.x + TypeScript 4.9.x
- **构建工具**：Create React App (`react-scripts` 5.0.1)
- **UI 组件库**：Bootstrap 5 + React-Bootstrap 2.x
- **HTTP 客户端**：Axios
- **扫码库**：`html5-qrcode`（已集成但当前未在业务流中使用，所有扫码均通过物理扫码枪或手动输入+回车实现）

---

## 项目结构

```
supermarket_management/
├── backend/
│   ├── server.js                  # Express 入口，挂载所有路由
│   ├── database.js                # SQLite 连接、建表、字段迁移
│   ├── package.json               # 后端依赖
│   ├── .env.example               # 支付配置模板
│   ├── supermarket.db             # SQLite 数据库文件（运行时生成）
│   ├── fix_batches.js             # 数据修复脚本（如有需要可手动运行）
│   ├── routes/                    # Express 路由模块（按业务划分）
│   │   ├── products.js            # 商品 CRUD
│   │   ├── stockIn.js             # 入库 + 创建批次
│   │   ├── stockOut.js            # 销售出库 + 支付
│   │   ├── batches.js             # 批次查询、临期预警
│   │   ├── statistics.js          # 统计报表 + 热销排行
│   │   ├── shelf.js               # 货架库存（上架/下架/低库存预警）
│   │   └── payment.js             # 支付回调/状态查询
│   ├── services/
│   │   └── paymentService.js      # 微信支付 & 支付宝服务封装（含开发模式模拟）
│   └── config/
│       └── payment.js             # 支付配置读取与环境判断
│
├── frontend/
│   ├── package.json               # 前端依赖
│   ├── tsconfig.json              # TypeScript 配置（CRA 标准）
│   ├── public/
│   └── src/
│       ├── App.tsx                # 根组件：顶部导航栏 + Tab 切换
│       ├── App.css                # 全局样式
│       ├── index.tsx              # React 渲染入口
│       ├── components/            # 业务组件（每个对应一个导航 Tab）
│       │   ├── ProductManagement.tsx   # 商品管理（CRUD、批次查看）
│       │   ├── StockIn.tsx             # 入库管理（扫码入库、录入生产日期）
│       │   ├── ShelfManagement.tsx     # 货架管理（上架、下架、低库存预警）
│       │   ├── StockOut.tsx            # 销售出库（购物车、收银、支付）
│       │   ├── Statistics.tsx          # 统计报表（销售统计、临期/低库存预警）
│       │   └── BarcodeScanner.tsx      # 摄像头扫码组件（当前未挂载到 App）
│       └── services/
│           └── api.ts             # Axios 实例 + 各模块 API 封装
│
├── start.ps1                      # PowerShell 一键启动脚本（推荐）
├── test_api.ps1                   # 外部 API 测试脚本（与项目主逻辑无关）
├── PAYMENT_SETUP.md               # 微信支付/支付宝接入指南
└── README.md                      # 面向用户的项目说明
```

---

## 启动与运行命令

### 推荐方式（Windows）
项目根目录提供了 `start.ps1`，它会：
1. 检测并停止已占用 3000/3001 端口的 Node 进程（**只杀特定端口，不杀所有 node 进程**）
2. 后台启动后端 (`node server.js`)
3. 独立窗口启动前端 (`npm start`)
4. 轮询检测服务就绪后输出访问地址

```powershell
# 启动
.\start.ps1

# 停止
.\start.ps1 -Stop

# 重启
.\start.ps1 -Restart
```

### 手动启动
```bash
# 后端
cd backend
npm install
node server.js        # http://localhost:3001

# 前端（另开终端）
cd frontend
npm install
npm start             # http://localhost:3000
```

**重要警告**：在 Windows 上停止服务时，**永远不要**使用 `taskkill /F /IM node.exe` 或 `Get-Process node | Stop-Process`。Claude Code 自身也运行在 Node 进程中，杀全部 node 进程会导致会话崩溃。正确做法是只终止占用 3000/3001 端口的进程。

---

## 数据库设计

数据库文件为 `backend/supermarket.db`，由 `database.js` 在首次启动时自动创建。所有表和字段迁移（如新增列）都在 `database.js` 中通过 `PRAGMA table_info` 检查并自动执行。

### 核心表

| 表名 | 作用 |
|------|------|
| `products` | 商品主数据（条形码、名称、进价、售价、总库存 `stock`、保质期天数 `shelf_life_days`、最低货架库存 `min_shelf_stock`） |
| `batch` | 批次表。同一商品不同生产日期/保质期会产生不同批次，记录入库时的 `quantity` 和当前 `remaining_qty` |
| `shelf` | 货架库存表。记录已从仓库上架到货架上的商品数量。销售只扣减货架库存 |
| `stock_in` | 入库记录（日志） |
| `stock_out` | 销售/出库记录（日志），含 `payment_method`（cash/wechat/alipay）和 `payment_code` |

### 库存流转逻辑

```
商品入库  →  创建 batch（仓库库存 / products.stock）
                ↓
            商品上架  →  从 batch 扣减（FIFO）→ 增加 shelf.quantity
                ↓
            销售出库  →  扣减 shelf.quantity  →  扣减 batch.remaining_qty（FIFO）
```

- **`products.stock`**：仓库总库存（入库累加，不会直接因销售而减少；上架时从批次扣减，批次才是实际库存）。
- **`shelf.quantity`**：货架库存，顾客能买到的数量。
- **FIFO**：上架和销售时，都优先扣减生产日期最早的批次（`ORDER BY production_date ASC`）。

---

## API 路由概览

所有 API 前缀为 `/api`，由 `server.js` 统一挂载。另有一个兼容旧前端的别名端点 `/api/near-expiry-products` 直接写在 `server.js` 中。

| 路由文件 | 挂载路径 | 核心功能 |
|----------|----------|----------|
| `routes/products.js` | `/api/products` | 商品增删改查、条形码查询 |
| `routes/stockIn.js` | `/api/stock-in` | 入库（自动创建批次）、入库记录查询 |
| `routes/stockOut.js` | `/api/stock-out` | 销售出库（支持现金/微信/支付宝）、销售记录查询 |
| `routes/batches.js` | `/api/batches` | 批次列表、临期批次查询、删除空批次 |
| `routes/statistics.js` | `/api/statistics` | 汇总统计、热销排行 |
| `routes/shelf.js` | `/api/shelf` | 货架列表、低库存预警、上架、下架 |
| `routes/payment.js` | `/api/payment` | 微信/支付宝回调占位、支付状态查询 |

### 支付集成
- `stockOut.js` 的 `POST /api/stock-out` 支持 `payment_method` 字段。
- 如果传入的 `payment_code` 符合微信/支付宝条形码规则，系统会自动识别并调用 `paymentService.js` 中对应的服务类。
- **开发模式**（默认）：`PAYMENT_MODE=development`，支付模拟成功（800ms 延迟，5% 随机失败），无需安装真实 SDK 或配置商户号。
- **生产模式**：需在 `backend/.env` 中配置微信/支付宝商户信息，并安装 `wxpay-v3` / `alipay-sdk`。

---

## 代码组织与模块划分

### 后端
- **按业务拆路由**：每个路由文件只处理单一领域，直接操作 `database.js` 导出的 `db` 实例。
- **无 ORM/无迁移框架**：所有 SQL 手写，字段迁移内联在 `database.js` 的 `db.serialize()` 中。
- **无全局异常中间件**：错误处理以 `res.status(500).json({ error: err.message })` 形式分散在各路由中。
- **无事务封装**：虽然使用 `db.serialize()` 保证语句顺序，但没有显式的 `BEGIN/COMMIT/ROLLBACK`。如果某条更新失败，可能导致批次、库存、记录三者不一致。
- **服务层仅支付**：`services/` 下只有 `paymentService.js`，其他业务无独立 service 层。

### 前端
- **无路由库**：`App.tsx` 用本地 `useState` 管理 5 个 Tab（products/stockin/shelf/stockout/statistics），条件渲染对应组件。
- **无全局状态管理**：每个组件自己 `useState` + `useEffect` 拉取数据，操作成功后手动重新加载列表。
- **API 集中封装**：`services/api.ts` 导出多个 `xxxAPI` 对象，所有组件直接调用。
- **TypeScript 类型较松散**：组件内部重复定义 `Product`、`Batch`、`CartItem` 等接口；API 参数大量使用 `any`。
- **UI 风格统一**：全面使用 React-Bootstrap 组件（`Card`、`Modal`、`Table`、`Badge`、`Alert`、`Form` 等）。

---

## 开发约定与代码风格

1. **中文为主**：所有注释、日志、错误提示、UI 文案均为中文。新增功能应保持中文界面和中文注释。
2. **后端回调风格**：SQLite3 使用 Node 回调风格 `(err, rows) => { ... }`，与少数 `async/await`（支付相关）混用。
3. **日期处理**：日期统一以 `YYYY-MM-DD` 字符串形式存储在 SQLite 中，计算时使用原生 `Date` 对象。
4. **货币计算**：金额以人民币「元」为单位，数据库存 `REAL`。支付接口中将元转分为微信/支付宝所需的整数（`Math.round(amount * 100)`）。
5. **条形码输入 UX**：所有涉及扫码的页面都在输入框监听 `Enter` 键触发查询，并尽量在操作完成后自动聚焦回输入框，以适配物理扫码枪快速连续扫描。
6. **键盘快捷键**：`StockOut.tsx` 中注册了全局 `keydown` 监听器（`F9`/`+` 打开收银、`F1` 现金、`F2` 扫码、`ESC` 关闭）。修改销售出库组件时需注意避免快捷键冲突。

---

## 测试策略

**当前测试覆盖几乎为零。**

- 前端仅保留了 CRA 默认的 `App.test.tsx`，但其断言（`learn react`）与实际 UI 不符，属于废弃测试。
- 后端 `package.json` 中的 `test` 脚本为 `echo "Error: no test specified" && exit 1`。
- 没有单元测试、集成测试或 E2E 测试。

如果你需要添加测试：
- **前端**：使用已安装的 `@testing-library/react` + Jest。
- **后端**：建议引入 `jest` + `supertest` 对 Express API 进行测试；测试数据库建议单独指定一个内存 SQLite 文件，避免污染 `supermarket.db`。

---

## 安全注意事项

1. **无身份认证/授权**：所有 API 完全开放，任何人只要能访问到 `localhost:3001` 就能读写数据。
2. **CORS 全开放**：`origin: '*'` 允许任意来源调用 API。
3. **请勿部署到公网**：README 和代码注释均明确说明此系统仅供本地/局域网使用。
4. **SQL 注入风险**：后端路由中使用参数化查询（`?` 占位符）的情况较好，但如后期新增复杂查询，需继续保持参数化，避免字符串拼接 SQL。
5. **支付安全**：真实支付模式需要配置商户私钥和证书，`.env` 和 `backend/certs/` 目录不应提交到版本控制。

---

## 已知问题与注意事项

1. **`BarcodeScanner.tsx` 孤儿组件**：基于摄像头的扫码组件已开发完成，但 `App.tsx` 中未挂载，没有任何页面引用它。
2. **`App.test.tsx` 已损坏**：运行 `npm test` 会失败，因为测试还在找 CRA 默认的 "learn react" 文案。
3. **`products.stock` 与实际可售库存不同步**：`products.stock` 在入库时累加，但销售时只扣 `shelf` 和 `batch`。`products.stock` 更像「历史累计入库量」，实际可用库存应以 `batch.remaining_qty` 或 `shelf.quantity` 为准。
4. **Playwright 依赖**：`backend/package.json` 中声明了 `playwright`，但当前后端代码中未发现使用。可能是遗留依赖或未来用于 E2E 测试。
5. **`test_api.ps1` 与项目无关**：该脚本是一个带有 Bearer Token 的外部 API 请求示例，不属于系统功能的一部分。
6. **`output.txt`** 和 **`test.png`**：根目录下存在这些文件，看起来是临时输出/截图，可安全忽略或删除。

---

## 对 AI 助手的操作建议

- **修改数据库表结构时**：优先在 `database.js` 中使用 `PRAGMA table_info` 检测字段是否存在，再执行 `ALTER TABLE ADD COLUMN`，以兼容已有数据库文件。
- **修改前端组件时**：保持 React-Bootstrap 的 UI 风格，保持条形码输入框的 `onKeyDown`（Enter 触发）和自动聚焦行为。
- **修改库存逻辑时**：务必同时考虑 `batch`、`shelf`、`stock_in`/`stock_out` 四张表的一致性，注意 FIFO 顺序。
- **不要全局安装或删除依赖**：如需新增 npm 包，在 `backend/` 或 `frontend/` 目录内分别安装。
- **不要执行 `git commit`/`git push`**，除非用户明确要求。
