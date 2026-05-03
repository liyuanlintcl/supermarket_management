# 超市货物管理系统

## 项目概述

这是一个完整的超市货物管理解决方案，支持商品管理、库存管理、批次追踪、货架管理和销售统计。系统采用前后端分离架构，实现了从入库到销售的完整业务流程。

## 技术栈

### 后端
- **Node.js** + **Express** - RESTful API 服务
- **SQLite3** - 轻量级数据库
- **CORS** - 跨域支持

### 前端
- **React** + **TypeScript** - 用户界面
- **React Bootstrap** - UI 组件库
- **Axios** - HTTP 客户端

## 数据库设计

### 核心表结构

```sql
-- 商品表
products (id, barcode, name, purchase_price, sale_price, stock, 
          shelf_life_days, min_shelf_stock, created_at, updated_at)

-- 批次表 - 追踪同一商品的不同生产批次
batch (id, product_id, quantity, remaining_qty, production_date, 
       shelf_life_days, created_at)

-- 货架库存表 - 记录货架上的商品数量
shelf (id, product_id, quantity, updated_at)

-- 入库记录表
stock_in (id, product_id, quantity, purchase_price, total_cost, created_at)

-- 出库/销售记录表
stock_out (id, product_id, quantity, sale_price, total_revenue, profit, 
           payment_method, payment_code, created_at)
```

## 核心功能

### 1. 商品管理
- 商品CRUD操作（条形码、名称、进价、售价、保质期）
- 最低货架库存报警值设置
- 条形码搜索功能
- **批次查看** - 查看商品的所有批次详情

### 2. 入库管理
- 扫描条形码快速入库
- 支持录入生产日期和保质期
- 自动创建批次记录
- 入库历史查询

### 3. 货架管理 ⭐
- **商品上架** - 从仓库批次上架到货架（FIFO）
- **商品下架** - 从货架退回仓库
- **库存预警** - 货架库存低于阈值时报警
- **一键上架** - 快速上架全部可用库存

### 4. 销售出库 ⭐
- 扫描枪快速扫码销售
- 购物车模式，支持批量结算
- 实时计算应收金额、找零、利润
- **货架库存检查** - 库存不足时阻止销售
- **FIFO批次扣减** - 自动按生产日期先进先出扣减批次
- **多支付方式** - 支持现金、微信、支付宝
- **自动识别付款码** - 扫码支付自动识别微信/支付宝
- **支持赊账** - 实收金额可小于应收金额
- **快捷键操作** - F9/+ 打开收款，F1 现金，F2 扫码，Enter 确认，ESC 关闭

### 5. 统计报表
- 库存统计
- 销售统计（销售额、利润）
- 热销商品排行
- 临期商品预警

## 业务流程

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  商品入库  │ → │  创建批次  │ → │  商品上架  │ → │  货架库存  │
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                   │
                         ┌─────────────────────────┘
                         ↓
                    ┌─────────┐    ┌─────────┐
                    │  销售出库  │ → │  扣减批次  │
                    └─────────┘    └─────────┘
```

**关键流程说明：**
1. 入库时创建批次，记录生产日期
2. 上架时从批次扣减（FIFO），增加到货架
3. 销售时先检查货架库存，再从货架扣减
4. 销售支持现金/微信/支付宝支付，自动识别付款码类型
5. 销售同时按FIFO扣减批次库存

## API 接口文档

### 商品管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 获取所有商品 |
| GET | `/api/products/barcode/:barcode` | 根据条形码查询商品 |
| POST | `/api/products` | 添加新商品 |
| PUT | `/api/products/:id` | 更新商品信息 |
| DELETE | `/api/products/:id` | 删除商品 |

### 入库管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stock-in` | 获取入库记录 |
| POST | `/api/stock-in` | 商品入库（创建批次）|

### 出库/销售
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stock-out` | 获取销售记录 |
| POST | `/api/stock-out` | 销售出库（支持 cash/wechat/alipay）|

### 支付回调
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/payment/wechat/notify` | 微信支付回调 |
| POST | `/api/payment/alipay/notify` | 支付宝支付回调 |
| GET | `/api/payment/status/:orderNo` | 查询支付状态 |

### 批次管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/batches` | 获取批次列表 |
| GET | `/api/batches?product_id=x` | 获取指定商品的批次 |
| DELETE | `/api/batches/:id` | 删除批次 |

### 货架管理 ⭐
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/shelf` | 获取货架商品列表 |
| GET | `/api/shelf/low-stock` | 获取库存不足商品 |
| GET | `/api/shelf/batches/:barcode` | 获取商品批次（用于上架）|
| POST | `/api/shelf/stock` | 上架（批次→货架）|
| POST | `/api/shelf/remove` | 下架（货架→仓库）|

### 统计报表
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/statistics` | 获取统计数据 |
| GET | `/api/statistics/top-products` | 热销商品排行 |
| GET | `/api/near-expiry-products` | 临期商品列表 |

## FIFO 先进先出算法

系统在以下场景使用FIFO算法：

1. **上架时** - 优先上架生产日期最早的批次
2. **销售时** - 优先扣减生产日期最早的批次

```javascript
// 按生产日期排序（先进先出）
SELECT * FROM batch 
WHERE product_id = ? AND remaining_qty > 0 
ORDER BY production_date ASC
```

## 库存报警机制

- 每个商品可设置 `min_shelf_stock`（最低货架库存）
- 货架数量 ≤ 最低库存时触发报警
- 报警显示在货架管理页面顶部

## 开发运行

### 推荐方式：使用一键启动脚本

项目已包含 `start.ps1` PowerShell 脚本，推荐直接使用它来管理服务：

```powershell
# 启动前后端服务
.\start.ps1

# 停止服务
.\start.ps1 -Stop

# 重启服务
.\start.ps1 -Restart
```

### 手动启动方式

如果脚本无法使用，可以手动启动：

#### 后端启动
```bash
cd backend
node server.js
# 服务运行在 http://localhost:3001
```

#### 前端启动
```bash
cd frontend
npm start
# 服务运行在 http://localhost:3000
```

### 重启服务（Windows环境）

> **推荐使用项目自带的 `start.ps1` 脚本：**
> ```powershell
> .\start.ps1 -Restart
> ```

> ⚠️ **重要警告：永远不要使用 `taskkill /F /IM node.exe` 或 `Get-Process node | Stop-Process` 来终止所有 Node 进程！**
> 
> 因为 Claude Code 本身也是运行在 Node 进程中，kill 所有 node 进程会同时杀死 Claude Code 自身，导致会话中断。
> 
> **正确的做法**：只终止特定端口（3001、3000）的进程，而不是所有 node 进程。

在Windows环境下，经常会出现端口被占用或服务无法正常重启的情况，请按以下步骤操作：

#### 1. 查找并终止特定端口进程
```bash
# 查看占用3001端口的进程ID
netstat -ano | findstr :3001

# 只终止占用3001端口的特定进程（将 <PID> 替换为实际的进程ID）
taskkill /PID <PID> /F

# 同样，如果需要终止前端端口3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### 2. 确保端口已释放
```bash
# 检查3001端口是否还在被占用
netstat -ano | findstr 3001

# 应该只显示TIME_WAIT状态，没有LISTENING状态
```

#### 3. 重新启动后端
```bash
cd backend

# 方式1：前台运行（方便查看日志）
node server.js

# 方式2：后台运行（PowerShell）- node.exe 可以直接启动
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "." -WindowStyle Hidden

# 方式3：后台运行（PowerShell替代方案）- 如果方式2有问题
Start-Process -FilePath "cmd" -ArgumentList "/c node server.js" -WorkingDirectory "." -WindowStyle Hidden

# 验证后端是否启动成功
curl http://localhost:3001/health
# 应返回: {"status":"ok","timestamp":"..."}
```

#### 4. 重新启动前端
```bash
cd frontend
npm start

# 如果提示端口3000被占用，按提示选择其他端口或终止占用进程
```

**注意**：在PowerShell中使用 `Start-Process -FilePath "npm"` 可能会导致记事本打开（因为npm是脚本文件）。正确做法是：
- **方式1**：直接在前端目录运行 `npm start`
- **方式2**：使用 `Start-Process cmd -ArgumentList "/c npm start" -WorkingDirectory "frontend"`
- **方式3**：使用 `Invoke-Expression "cd frontend; npm start"`

#### 5. 验证所有API
```bash
# 测试商品API
curl http://localhost:3001/api/products

# 测试货架API
curl http://localhost:3001/api/shelf

# 测试批次API
curl http://localhost:3001/api/batches
```

### 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 端口3001被占用 | 上次后端进程未正常退出 | 使用 `netstat -ano \| findstr :3001` 找到PID，然后用 `taskkill /PID <PID> /F` 终止特定进程 |
| API返回404 | 后端路由未加载 | 确保server.js中已挂载路由，然后重启 |
| 前端编译错误 | TypeScript类型不匹配 | 检查接口定义是否完整 |
| 数据库连接失败 | SQLite文件被占用 | 关闭占用端口的Node进程后重启，不要kill所有node进程 |
| nohup命令不存在 | 在CMD/PowerShell中使用Unix命令 | 改用 `Start-Process` 或 `start` 命令 |
| 提示"node不是内部命令" | Node未添加到系统PATH | 使用Node的完整路径或添加PATH环境变量 |

### 一键重启脚本（PowerShell）

> ⚠️ **注意**：此脚本只终止占用端口3001和3000的进程，不会终止所有node进程。

```powershell
# restart.ps1
# 使用前请确保 node 和 npm 已添加到系统 PATH

function Stop-ProcessByPort {
    param($port)
    $connection = netstat -ano | Select-String ":$port"
    if ($connection) {
        $pid = ($connection -split '\s+')[-1]
        if ($pid -and $pid -match '^\d+$') {
            Write-Host "正在终止占用端口 $port 的进程 (PID: $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "正在停止后端服务 (端口3001)..."
Stop-ProcessByPort 3001

Write-Host "正在停止前端服务 (端口3000)..."
Stop-ProcessByPort 3000

Start-Sleep -Seconds 2

Write-Host "启动后端服务..."
$backendPath = Join-Path $PSScriptRoot "backend"
# node.exe 可以直接启动，但如果遇到问题可以用 cmd 包装
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $backendPath -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host "启动前端服务..."
$frontendPath = Join-Path $PSScriptRoot "frontend"
# 注意：不要直接用 Start-Process 启动 npm，会导致记事本打开
Start-Process -FilePath "cmd" -ArgumentList "/c npm start" -WorkingDirectory $frontendPath

Write-Host "服务启动完成！"
Write-Host "后端: http://localhost:3001"
Write-Host "前端: http://localhost:3000"
```

### 一键重启脚本（CMD 批处理）

> ⚠️ **注意**：此脚本只终止占用端口3001和3000的进程，不会终止所有node进程。

```batch
@echo off
:: restart.bat
:: 使用前请确保 node 和 npm 已添加到系统 PATH

:: 函数：根据端口终止进程
:StopProcessByPort
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%1') do (
    echo 正在终止占用端口 %1 的进程 (PID: %%a)...
    taskkill /PID %%a /F 2>nul
)
exit /b

echo 正在停止后端服务 (端口3001)...
call :StopProcessByPort 3001

echo 正在停止前端服务 (端口3000)...
call :StopProcessByPort 3000

timeout /T 2 /NOBREAK >nul

echo 启动后端服务...
cd backend
start /B node server.js > server.log 2>&1
cd ..

timeout /T 3 /NOBREAK >nul

echo 启动前端服务...
cd frontend
start npm start
cd ..

echo 服务启动完成！
echo 后端: http://localhost:3001
echo 前端: http://localhost:3000
pause
```

## 文件结构

```
supermarket_management/
├── backend/
│   ├── database.js          # 数据库连接和初始化
│   ├── server.js            # Express 服务器入口
│   ├── supermarket.db       # SQLite 数据库文件
│   ├── .env.example         # 环境变量配置模板
│   ├── config/
│   │   └── payment.js       # 支付配置
│   ├── services/
│   │   └── paymentService.js # 支付服务封装
│   └── routes/
│       ├── products.js      # 商品API
│       ├── stockIn.js       # 入库API
│       ├── stockOut.js      # 出库API（含支付）
│       ├── batches.js       # 批次API
│       ├── shelf.js         # 货架API
│       ├── statistics.js    # 统计API
│       └── payment.js       # 支付回调API
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # 主应用组件
│   │   ├── components/
│   │   │   ├── ProductManagement.tsx   # 商品管理
│   │   │   ├── StockIn.tsx             # 入库管理
│   │   │   ├── StockOut.tsx            # 销售出库（含支付）
│   │   │   ├── ShelfManagement.tsx     # 货架管理
│   │   │   └── Statistics.tsx          # 统计报表
│   │   └── services/
│   │       └── api.ts                  # API 封装
│   └── package.json
├── start.ps1                # 一键启动脚本（PowerShell）
├── PAYMENT_SETUP.md         # 支付接入指南
└── CLAUDE.md
```

## 使用说明

1. **添加商品** - 在"商品管理"页面添加商品信息，设置保质期和最低库存报警值
2. **商品入库** - 在"入库管理"页面扫描条形码入库，录入生产日期
3. **商品上架** - 在"货架管理"页面上架商品，从仓库批次转移到货架
4. **销售出库** - 在"销售出库"页面扫描商品销售，系统自动扣减货架和批次库存
5. **库存预警** - 在"货架管理"页面查看库存不足商品，及时补货

### 销售出库快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 确认输入/扫码 |
| `F9` / `+` | 打开收款界面（默认扫码支付） |
| `F1` | 切换到现金支付 |
| `F2` | 切换到扫码支付 |
| `ESC` | 关闭收款界面 |

### 付款码自动识别

系统会自动识别顾客出示的付款码类型：
- **微信**：18位数字，以 10-15 开头（如 `1303...`）
- **支付宝**：16-24位数字，以 25-30 开头（如 `2833...`）

## 技术亮点

- ✅ FIFO先进先出库存管理
- ✅ 批次追踪（生产日期、保质期）
- ✅ 货架与仓库分离的库存管理
- ✅ 库存不足预警机制
- ✅ 扫码枪快速操作支持
- ✅ 完整的销售结算流程
- ✅ 支持微信支付、支付宝支付接入

## 支付配置

系统支持微信支付和支付宝支付，详见 `PAYMENT_SETUP.md`

### 快速配置

1. 复制配置文件
```bash
cd backend
cp .env.example .env
```

2. 编辑 `.env` 填入支付配置

3. **开发模式**（默认）：无需配置，使用模拟支付
4. **生产模式**：申请商户号后填入真实配置

### 支付方式

| 支付方式 | 说明 | 配置要求 |
|----------|------|----------|
| **现金** | 直接输入实收金额 | 无需配置 |
| **扫码支付** | 自动识别微信/支付宝付款码 | 开发模式：自动模拟；生产模式：需配置商户号 |

### 付款码识别规则

系统根据付款码特征自动判断支付平台：

| 平台 | 特征 | 示例 |
|------|------|------|
| **微信** | 18位数字，以 10-15 开头 | `130359491473946741` |
| **支付宝** | 16-24位数字，以 25-30 开头 | `2833123456789012` |

> 扫码支付时无需手动选择平台，系统自动识别！
