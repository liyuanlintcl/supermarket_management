/**
 * 支付相关路由
 * 处理支付通知回调
 */

const express = require('express');
const router = express.Router();

// 微信支付回调通知
// 文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_5.shtml
router.post('/wechat/notify', async (req, res) => {
  try {
    // 验证签名（需要实现）
    // const isValid = verifyWechatSignature(req);

    const notifyData = req.body;
    console.log('[Wechat Notify] 收到支付通知:', notifyData);

    // TODO: 处理支付成功通知
    // 1. 验证订单状态
    // 2. 更新订单状态
    // 3. 发送消息通知

    // 返回成功响应给微信
    res.status(200).json({ code: 'SUCCESS', message: 'OK' });
  } catch (error) {
    console.error('[Wechat Notify] 处理通知失败:', error);
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
});

// 支付宝支付回调通知
// 文档: https://opendocs.alipay.com/open/270/105902
router.post('/alipay/notify', async (req, res) => {
  try {
    // 验证签名（需要实现）
    // const isValid = verifyAlipaySignature(req);

    const notifyData = req.body;
    console.log('[Alipay Notify] 收到支付通知:', notifyData);

    // TODO: 处理支付成功通知
    // 1. 验证订单状态
    // 2. 更新订单状态
    // 3. 发送消息通知

    // 返回成功响应给支付宝
    res.status(200).send('success');
  } catch (error) {
    console.error('[Alipay Notify] 处理通知失败:', error);
    res.status(500).send('fail');
  }
});

// 支付状态查询接口（供前端轮询使用）
router.get('/status/:orderNo', async (req, res) => {
  const { orderNo } = req.params;
  const { type } = req.query; // wechat 或 alipay

  try {
    const { wechatPayService, alipayService } = require('../services/paymentService');

    let result;
    if (type === 'wechat') {
      result = await wechatPayService.queryOrder(orderNo);
    } else if (type === 'alipay') {
      result = await alipayService.queryOrder(orderNo);
    } else {
      res.status(400).json({ error: '支付方式类型无效' });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
