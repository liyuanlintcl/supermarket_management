/**
 * 支付配置模块
 * 支持微信支付和支付宝配置
 */

const path = require('path');

// 加载环境变量
require('dotenv').config();

// 支付模式
const PAYMENT_MODE = process.env.PAYMENT_MODE || 'development';

// 微信支付配置
const wechatConfig = {
  mchid: process.env.WECHAT_MCHID,
  appid: process.env.WECHAT_APPID,
  apiV3Key: process.env.WECHAT_APIV3_KEY,
  certPath: process.env.WECHAT_CERT_PATH,
  keyPath: process.env.WECHAT_KEY_PATH,
  // 支付通知回调地址（需要公网可访问）
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify'
};

// 支付宝配置
const alipayConfig = {
  appId: process.env.ALIPAY_APPID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
  // 支付通知回调地址（需要公网可访问）
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://your-domain.com/api/payment/alipay/notify',
  // 返回地址（支付完成后跳转）
  returnUrl: process.env.ALIPAY_RETURN_URL || 'https://your-domain.com/payment/success'
};

// 检查微信支付配置是否完整
function isWechatConfigValid() {
  return !!(wechatConfig.mchid &&
    wechatConfig.appid &&
    wechatConfig.apiV3Key);
}

// 检查支付宝配置是否完整
function isAlipayConfigValid() {
  return !!(alipayConfig.appId &&
    alipayConfig.privateKey &&
    alipayConfig.alipayPublicKey);
}

module.exports = {
  PAYMENT_MODE,
  wechatConfig,
  alipayConfig,
  isWechatConfigValid,
  isAlipayConfigValid
};
