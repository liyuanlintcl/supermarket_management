/**
 * 支付服务模块
 * 封装微信支付和支付宝的扫码支付（付款码支付）功能
 */

const { PAYMENT_MODE, isWechatConfigValid, isAlipayConfigValid } = require('../config/payment');

/**
 * 微信支付类
 * 使用微信支付 APIv3
 */
class WechatPayService {
  constructor() {
    this.initialized = false;
    this.wechatPay = null;
  }

  async init() {
    if (this.initialized) return;

    if (PAYMENT_MODE === 'development') {
      console.log('[WechatPay] 开发模式：使用模拟支付');
      this.initialized = true;
      return;
    }

    if (!isWechatConfigValid()) {
      console.warn('[WechatPay] 微信支付配置不完整，将使用模拟支付');
      this.initialized = true;
      return;
    }

    try {
      // 需要安装: npm install wxpay-v3
      const WechatPay = require('wxpay-v3');
      const { wechatConfig } = require('../config/payment');

      this.wechatPay = new WechatPay({
        appid: wechatConfig.appid,
        mchid: wechatConfig.mchid,
        private_key: require('fs').readFileSync(wechatConfig.keyPath),
        cert_sn: '', // 证书序列号，可选
        apiV3Key: wechatConfig.apiV3Key
      });

      this.initialized = true;
      console.log('[WechatPay] 微信支付初始化成功');
    } catch (error) {
      console.error('[WechatPay] 初始化失败:', error.message);
      console.log('[WechatPay] 将使用模拟支付');
      this.initialized = true;
    }
  }

  /**
   * 付款码支付（被扫）
   * @param {string} authCode - 用户付款码（18位数字）
   * @param {number} amount - 支付金额（元）
   * @param {string} outTradeNo - 商户订单号
   * @param {string} description - 商品描述
   */
  async scanPay(authCode, amount, outTradeNo, description) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.wechatPay) {
      return this.mockScanPay(authCode, amount);
    }

    try {
      // 微信支付接口：付款码支付
      // 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
      const result = await this.wechatPay.pay({
        description: description || '超市商品销售',
        out_trade_no: outTradeNo,
        amount: {
          total: Math.round(amount * 100) // 转为分
        },
        auth_code: authCode // 付款码
      });

      return {
        success: true,
        tradeNo: result.transaction_id,
        outTradeNo: outTradeNo,
        amount: amount
      };
    } catch (error) {
      throw new Error(`微信支付失败: ${error.message}`);
    }
  }

  /**
   * 模拟支付（开发模式）
   */
  async mockScanPay(authCode, amount) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!authCode || !/^\d{18}$/.test(authCode)) {
          reject(new Error('付款码格式不正确，应为18位数字'));
          return;
        }
        if (Math.random() < 0.05) {
          reject(new Error('支付失败，请重试'));
          return;
        }
        resolve({
          success: true,
          tradeNo: `wechat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          outTradeNo: `ORDER_${Date.now()}`,
          amount: amount
        });
      }, 800);
    });
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.wechatPay) {
      return { success: true, status: 'SUCCESS' };
    }

    try {
      const result = await this.wechatPay.query({ out_trade_no: outTradeNo });
      return {
        success: result.trade_state === 'SUCCESS',
        status: result.trade_state,
        tradeNo: result.transaction_id
      };
    } catch (error) {
      throw new Error(`查询订单失败: ${error.message}`);
    }
  }

  /**
   * 退款
   */
  async refund(outTradeNo, amount, reason) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.wechatPay) {
      return { success: true, refundId: `REFUND_${Date.now()}` };
    }

    try {
      const result = await this.wechatPay.refund({
        out_trade_no: outTradeNo,
        out_refund_no: `REFUND_${Date.now()}`,
        amount: {
          refund: Math.round(amount * 100),
          total: Math.round(amount * 100)
        },
        reason: reason || '用户退款'
      });

      return {
        success: result.status === 'SUCCESS',
        refundId: result.refund_id
      };
    } catch (error) {
      throw new Error(`退款失败: ${error.message}`);
    }
  }
}

/**
 * 支付宝服务类
 */
class AlipayService {
  constructor() {
    this.initialized = false;
    this.alipaySdk = null;
  }

  async init() {
    if (this.initialized) return;

    if (PAYMENT_MODE === 'development') {
      console.log('[Alipay] 开发模式：使用模拟支付');
      this.initialized = true;
      return;
    }

    if (!isAlipayConfigValid()) {
      console.warn('[Alipay] 支付宝配置不完整，将使用模拟支付');
      this.initialized = true;
      return;
    }

    try {
      // 需要安装: npm install alipay-sdk
      const AlipaySdk = require('alipay-sdk').default;
      const { alipayConfig } = require('../config/payment');

      this.alipaySdk = new AlipaySdk({
        appId: alipayConfig.appId,
        privateKey: alipayConfig.privateKey,
        alipayPublicKey: alipayConfig.alipayPublicKey,
        gateway: alipayConfig.gateway,
        signType: 'RSA2'
      });

      this.initialized = true;
      console.log('[Alipay] 支付宝初始化成功');
    } catch (error) {
      console.error('[Alipay] 初始化失败:', error.message);
      console.log('[Alipay] 将使用模拟支付');
      this.initialized = true;
    }
  }

  /**
   * 付款码支付（条码支付）
   * @param {string} authCode - 用户付款码
   * @param {number} amount - 支付金额（元）
   * @param {string} outTradeNo - 商户订单号
   * @param {string} subject - 商品标题
   */
  async scanPay(authCode, amount, outTradeNo, subject) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.alipaySdk) {
      return this.mockScanPay(authCode, amount);
    }

    try {
      // 支付宝接口：条码支付
      // 文档: https://opendocs.alipay.com/apis/api_1/alipay.trade.pay
      const result = await this.alipaySdk.exec('alipay.trade.pay', {
        out_trade_no: outTradeNo,
        scene: 'bar_code', // 条码支付
        auth_code: authCode,
        subject: subject || '超市商品销售',
        total_amount: amount.toFixed(2),
        timeout_express: '2m' // 2分钟支付超时
      });

      if (result.code === '10000') {
        return {
          success: true,
          tradeNo: result.trade_no,
          outTradeNo: outTradeNo,
          amount: parseFloat(result.total_amount)
        };
      } else {
        throw new Error(result.msg || '支付失败');
      }
    } catch (error) {
      throw new Error(`支付宝支付失败: ${error.message}`);
    }
  }

  /**
   * 模拟支付（开发模式）
   */
  async mockScanPay(authCode, amount) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!authCode || authCode.length < 16) {
          reject(new Error('付款码格式不正确'));
          return;
        }
        if (Math.random() < 0.05) {
          reject(new Error('支付失败，请重试'));
          return;
        }
        resolve({
          success: true,
          tradeNo: `alipay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          outTradeNo: `ORDER_${Date.now()}`,
          amount: amount
        });
      }, 800);
    });
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.alipaySdk) {
      return { success: true, status: 'TRADE_SUCCESS' };
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.query', {
        out_trade_no: outTradeNo
      });

      return {
        success: result.trade_status === 'TRADE_SUCCESS' || result.trade_status === 'TRADE_FINISHED',
        status: result.trade_status,
        tradeNo: result.trade_no
      };
    } catch (error) {
      throw new Error(`查询订单失败: ${error.message}`);
    }
  }

  /**
   * 退款
   */
  async refund(outTradeNo, amount, reason) {
    await this.init();

    if (PAYMENT_MODE === 'development' || !this.alipaySdk) {
      return { success: true, refundId: `REFUND_${Date.now()}` };
    }

    try {
      const result = await this.alipaySdk.exec('alipay.trade.refund', {
        out_trade_no: outTradeNo,
        refund_amount: amount.toFixed(2),
        refund_reason: reason || '用户退款'
      });

      if (result.code === '10000') {
        return {
          success: true,
          refundId: result.refund_id
        };
      } else {
        throw new Error(result.msg || '退款失败');
      }
    } catch (error) {
      throw new Error(`退款失败: ${error.message}`);
    }
  }
}

// 导出单例实例
const wechatPayService = new WechatPayService();
const alipayService = new AlipayService();

module.exports = {
  wechatPayService,
  alipayService,
  PAYMENT_MODE
};
