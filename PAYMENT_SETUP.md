# 支付接入指南

## 目录

- [概述](#概述)
- [微信支付接入](#微信支付接入)
- [支付宝接入](#支付宝接入)
- [配置步骤](#配置步骤)
- [注意事项](#注意事项)

## 概述

系统已预留微信支付和支付宝接口，支持两种模式：

1. **开发模式 (development)** - 模拟支付，无需配置（默认）
2. **生产模式 (production)** - 真实支付，需要申请商户账号

## 微信支付接入

### 1. 申请商户号

访问 https://pay.weixin.qq.com/ 申请微信商户号

**需要材料：**
- 营业执照
- 法人身份证
- 对公银行账户
- 门店照片

### 2. 开通支付产品

在商户平台开通 **"付款码支付"**（被扫）功能

### 3. 获取配置信息

在微信商户平台获取以下信息：

| 配置项 | 获取位置 |
|--------|----------|
| 商户号 (mchid) | 账户中心 → 商户信息 |
| AppID | 产品中心 → AppID账号管理 |
| APIv3密钥 | 账户中心 → API安全 → 设置APIv3密钥 |
| 商户证书 | 账户中心 → API安全 → 申请API证书 |

### 4. 下载证书

下载证书文件并放置到 `backend/certs/` 目录：
- `apiclient_cert.pem` - 证书文件
- `apiclient_key.pem` - 私钥文件

## 支付宝接入

### 1. 申请商家账号

访问 https://b.alipay.com/ 申请支付宝商家账号

### 2. 创建应用

在开放平台创建应用，开通 **"当面付"** 能力

### 3. 配置密钥

使用支付宝密钥工具生成 RSA2 密钥对：

1. 下载工具：https://opendocs.alipay.com/common/02kipk
2. 生成密钥对（RSA2，2048位）
3. 上传公钥到支付宝开放平台
4. 保存私钥

### 4. 获取配置信息

| 配置项 | 获取位置 |
|--------|----------|
| AppID | 应用详情页 |
| 应用私钥 | 密钥工具生成 |
| 支付宝公钥 | 应用详情页 → 查看支付宝公钥 |

## 配置步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

**可选：安装真实支付SDK（开发模式不需要）**

```bash
# 如果需要真实微信支付
npm install wxpay-v3

# 如果需要真实支付宝
npm install alipay-sdk
```

### 2. 复制配置文件

```bash
cd backend
cp .env.example .env
```

### 3. 编辑配置

编辑 `.env` 文件，填入你的配置：

```env
# 支付模式
development  # 开发模式（默认）
# production  # 生产模式（真实支付）

# 微信支付配置
WECHAT_MCHID=你的商户号
WECHAT_APPID=你的AppID
WECHAT_APIV3_KEY=你的APIv3密钥
WECHAT_CERT_PATH=./certs/apiclient_cert.pem
WECHAT_KEY_PATH=./certs/apiclient_key.pem

# 支付宝配置
ALIPAY_APPID=你的应用ID
ALIPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
你的私钥内容
-----END RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
支付宝公钥
-----END PUBLIC KEY-----
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

### 4. 放置证书文件

```
backend/
├── certs/
│   ├── apiclient_cert.pem    # 微信证书
│   └── apiclient_key.pem     # 微信私钥
├── .env
└── ...
```

### 5. 重启服务

```bash
# 停止现有服务
# 启动新服务
node server.js
```

## API 使用

### 发起支付

```javascript
// 现金支付（无需配置）
POST /api/stock-out
{
  "barcode": "1234567890",
  "quantity": 1,
  "payment_method": "cash",
  "actual_revenue": 100.00
}

// 微信支付（需要配置）
POST /api/stock-out
{
  "barcode": "1234567890",
  "quantity": 1,
  "payment_method": "wechat",
  "payment_code": "283648293847293847"  // 用户付款码（18位）
}

// 支付宝支付（需要配置）
POST /api/stock-out
{
  "barcode": "1234567890",
  "quantity": 1,
  "payment_method": "alipay",
  "payment_code": "287364827364827364"  // 用户付款码
}
```

### 查询支付状态

```javascript
GET /api/payment/status/ORDER_1234567890?type=wechat

Response:
{
  "success": true,
  "status": "SUCCESS",
  "tradeNo": "1234567890123456789012345678"
}
```

## 注意事项

### 1. 付款码获取

- **微信支付**：用户使用微信 → 我 → 服务 → 收付款 → 向商家付款
- **支付宝**：用户打开支付宝 → 首页 → 付钱/收钱 → 向商家付钱

### 2. 付款码格式

- 微信：18位数字
- 支付宝：16-28位数字

### 3. 网络要求

- 需要公网可访问的域名（用于支付回调）
- 需要 HTTPS（微信支付要求）

### 4. 费率

- 微信支付：0.6% 左右
- 支付宝：0.6% 左右

### 5. 测试环境

测试时请使用沙箱环境：
- 微信沙箱：https://pay.weixin.qq.com/wiki/doc/api/index.html
- 支付宝沙箱：https://openhome.alipay.com/platform/appDaily.htm

### 6. 常见问题

**Q: 付款码过期怎么办？**
A: 付款码通常1分钟自动刷新，如果超时请让用户重新出示。

**Q: 支付成功但未扣减库存？**
A: 检查支付回调是否正常接收，查看后端日志。

**Q: 如何退款？**
A: 系统已预留退款接口，需要时可在后端调用。

## 技术支持

- 微信支付文档：https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- 支付宝文档：https://opendocs.alipay.com/
