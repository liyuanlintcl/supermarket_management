import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Row, Col, InputGroup, Modal, ListGroup } from 'react-bootstrap';
import { productAPI, stockOutAPI, shelfAPI } from '../services/api';

interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
}

interface CartItem {
  id: number;
  barcode: string;
  name: string;
  sale_price: number;
  purchase_price: number;
  quantity: number;
  shelf_stock: number;  // 货架库存
}

interface StockOutRecord {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  sale_price: number;
  total_revenue: number;
  profit: number;
  payment_method: 'cash' | 'alipay' | 'wechat';
  created_at: string;
}

// 支付方式显示映射
const paymentMethodLabels: Record<string, { label: string; color: string; icon: string }> = {
  cash: { label: '现金', color: 'primary', icon: '💵' },
  alipay: { label: '支付宝', color: 'info', icon: '🔵' },
  wechat: { label: '微信', color: 'success', icon: '🟢' }
};

const StockOut: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [records, setRecords] = useState<StockOutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'scan'>('scan');
  const [detectedPaymentMethod, setDetectedPaymentMethod] = useState<'alipay' | 'wechat' | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const paymentCodeInputRef = useRef<HTMLInputElement>(null);
  const amountReceivedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentRecords();
    barcodeInputRef.current?.focus();

    // 添加键盘快捷键监听
    const handleKeyDown = (e: KeyboardEvent) => {
      // F9 或 + 键：打开收款界面（当购物车有商品且未打开收款模态框时）
      if ((e.key === 'F9' || e.key === '+') && cart.length > 0 && !showCheckout) {
        e.preventDefault();
        setShowCheckout(true);
      }

      // ESC：关闭收款模态框
      if (e.key === 'Escape' && showCheckout) {
        setShowCheckout(false);
        setPaymentMethod('scan'); // 重置为扫码支付
        setPaymentCode('');
        setDetectedPaymentMethod(null);
        // 关闭后聚焦回条形码输入框
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      }

      // F1：切换到现金支付（在收款模态框内）
      if (e.key === 'F1' && showCheckout) {
        e.preventDefault();
        setPaymentMethod('cash');
        setPaymentCode('');
        setDetectedPaymentMethod(null);
        setTimeout(() => amountReceivedRef.current?.focus(), 100);
      }

      // F2：切换到扫码支付（在收款模态框内）
      if (e.key === 'F2' && showCheckout) {
        e.preventDefault();
        setPaymentMethod('scan');
        // 计算当前购物车总金额
        const currentTotal = cart.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
        setAmountReceived(currentTotal.toFixed(2));
        setTimeout(() => paymentCodeInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showCheckout]);

  // 当打开收款模态框或切换支付方式时，自动聚焦到对应输入框
  useEffect(() => {
    if (showCheckout) {
      setTimeout(() => {
        if (paymentMethod === 'cash') {
          amountReceivedRef.current?.focus();
          amountReceivedRef.current?.select(); // 选中现有内容
        } else if (paymentMethod === 'scan') {
          paymentCodeInputRef.current?.focus();
        }
      }, 100);
    }
  }, [showCheckout, paymentMethod]);

  const loadRecentRecords = async () => {
    try {
      const response = await stockOutAPI.getAll();
      setRecords(response.data.slice(0, 10));
    } catch (error) {
      console.error('加载销售记录失败');
    }
  };

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode.trim()) {
      try {
        const response = await productAPI.getByBarcode(barcode.trim());
        const scannedProduct = response.data;

        // 查询该商品的货架库存
        const shelfResponse = await shelfAPI.getAll();
        const shelfItem = shelfResponse.data.find((item: any) => item.barcode === scannedProduct.barcode);
        const shelfStock = shelfItem ? shelfItem.quantity : 0;

        // 检查货架库存
        if (shelfStock <= 0) {
          showAlert('warning', `${scannedProduct.name} 货架库存不足，请先上架商品！`);
          setBarcode('');
          return;
        }

        // 检查购物车中是否已有该商品
        const existingItem = cart.find(item => item.barcode === scannedProduct.barcode);

        if (existingItem) {
          // 如果已有，数量+1
          if (existingItem.quantity >= shelfStock) {
            showAlert('warning', `${scannedProduct.name} 货架库存不足！当前货架库存: ${shelfStock}`);
            return;
          }
          updateQuantity(existingItem.id, existingItem.quantity + 1);
          showAlert('success', `${scannedProduct.name} 数量 +1`);
        } else {
          // 如果没有，添加到购物车
          const newItem: CartItem = {
            id: Date.now(),
            barcode: scannedProduct.barcode,
            name: scannedProduct.name,
            sale_price: scannedProduct.sale_price,
            purchase_price: scannedProduct.purchase_price,
            quantity: 1,
            shelf_stock: shelfStock
          };
          setCart([...cart, newItem]);
          showAlert('success', `已添加: ${scannedProduct.name}`);
        }

        // 清空条形码输入框，准备扫描下一个
        setBarcode('');
        barcodeInputRef.current?.focus();
      } catch (error: any) {
        if (error.response?.status === 404) {
          showAlert('warning', '商品不存在');
        } else {
          showAlert('danger', '查询失败');
        }
      }
    }
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    if (newQuantity > item.shelf_stock) {
      showAlert('warning', `${item.name} 货架库存不足！当前货架库存: ${item.shelf_stock}`);
      return;
    }

    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setAmountReceived('');
    setPaymentMethod('scan'); // 重置为默认扫码支付
    setDetectedPaymentMethod(null);
    setPaymentCode('');
    // 延迟聚焦，等待 React 状态更新完成
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  // 计算总价
  const totalAmount = cart.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
  const totalProfit = cart.reduce((sum, item) => sum + (item.sale_price - item.purchase_price) * item.quantity, 0);
  const change = parseFloat(amountReceived || '0') - totalAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showAlert('warning', '购物车为空');
      return;
    }

    // 现金支付需要验证金额（允许抹零或部分支付，只需输入非负金额即可）
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < 0) {
        showAlert('warning', '请输入有效的收款金额（不能为负数）');
        return;
      }
    }

    // 扫码支付需要验证付款码和识别出的支付方式
    if (paymentMethod === 'scan') {
      if (!paymentCode.trim()) {
        showAlert('warning', '请扫描顾客付款码');
        return;
      }
      if (!detectedPaymentMethod) {
        showAlert('warning', '无法识别付款码类型，请检查码是否正确');
        return;
      }
    }

    setLoading(true);
    try {
      // 逐个商品出库，传入支付方式和实际收款金额
      for (const item of cart) {
        // 计算该商品的实际收款金额（按数量比例分摊）
        const itemRatio = (item.sale_price * item.quantity) / totalAmount;
        const itemActualRevenue = parseFloat((parseFloat(amountReceived) * itemRatio).toFixed(2));

        await stockOutAPI.create({
          barcode: item.barcode,
          quantity: item.quantity,
          payment_method: paymentMethod === 'scan' ? detectedPaymentMethod : paymentMethod,
          payment_code: paymentMethod === 'cash' ? undefined : paymentCode.trim(),
          actual_revenue: paymentMethod === 'cash' ? itemActualRevenue : undefined,
        });
      }

      // 显示成功信息
      if (paymentMethod === 'cash') {
        const received = parseFloat(amountReceived);
        if (received >= totalAmount) {
          showAlert('success',
            `现金收款成功！应收: ¥${totalAmount.toFixed(2)}，实收: ¥${received.toFixed(2)}，找零: ¥${change.toFixed(2)}`
          );
        } else {
          showAlert('warning',
            `部分收款成功！应收: ¥${totalAmount.toFixed(2)}，实收: ¥${received.toFixed(2)}，欠款: ¥${Math.abs(change).toFixed(2)}`
          );
        }
      } else {
        const methodName = detectedPaymentMethod === 'alipay' ? '支付宝' : detectedPaymentMethod === 'wechat' ? '微信' : '扫码';
        showAlert('success',
          `${methodName}收款成功！金额: ¥${totalAmount.toFixed(2)}`
        );
      }

      // 先关闭模态框，再清空购物车（这样 clearCart 的聚焦才能生效）
      setShowCheckout(false);
      setPaymentCode('');
      setDetectedPaymentMethod(null);
      // 延迟清空购物车并聚焦，等待模态框动画完成
      setTimeout(() => {
        clearCart();
      }, 150);

      // 刷新记录
      loadRecentRecords();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '出库失败';
      if (errorMsg.includes('货架库存不足')) {
        showAlert('danger', errorMsg);
      } else if (errorMsg.includes('支付失败')) {
        showAlert('danger', `支付失败: ${errorMsg}`);
      } else {
        showAlert('danger', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">📤 销售出库</h2>

      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col md={5}>
          <Card className="mb-4">
            <Card.Header className="bg-warning text-dark">
              <strong>扫码添加商品</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>条形码</Form.Label>
                <InputGroup>
                  <Form.Control
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="请使用扫描枪扫描条形码，或手动输入后按回车"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyPress={handleBarcodeScan}
                    autoFocus
                  />
                </InputGroup>
                <Form.Text className="text-muted">
                  提示：使用扫描枪连续扫描商品条形码，自动添加到购物车
                </Form.Text>
              </Form.Group>

              {product && (
                <Alert variant="info">
                  <strong>当前商品</strong><br />
                  名称: {product.name}<br />
                  售价: ¥{product.sale_price.toFixed(2)}<br />
                  库存: <Badge bg={product.stock < 10 ? 'danger' : product.stock < 50 ? 'warning' : 'success'}>
                    {product.stock}
                  </Badge>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* 购物车 */}
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <strong>🛒 购物车 ({cart.length} 件商品)</strong>
              {cart.length > 0 && (
                <Button variant="outline-light" size="sm" onClick={clearCart}>
                  清空
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {cart.length === 0 ? (
                <div className="text-center text-muted py-4">
                  购物车为空，请扫描商品条形码
                </div>
              ) : (
                <>
                  <ListGroup variant="flush">
                    {cart.map((item) => (
                      <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <div className="fw-bold">{item.name}</div>
                          <div className="text-muted small">
                            ¥{item.sale_price.toFixed(2)} × {item.quantity}
                            <span className="ms-2">
                              (货架库存: <Badge bg={item.shelf_stock < 10 ? 'danger' : 'success'}>{item.shelf_stock}</Badge>)
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="fw-bold" style={{ minWidth: '30px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>

                  <hr />
                  
                  <div className="d-flex justify-content-between mb-2">
                    <span>商品总数:</span>
                    <span className="fw-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>预计利润:</span>
                    <span className="text-success fw-bold">¥{totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span className="h5">合计金额:</span>
                    <span className="h4 text-danger fw-bold">¥{totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <Button
                    variant="success"
                    size="lg"
                    className="w-100"
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                  >
                    💰 去收款 <Badge bg="light" text="dark" className="ms-2">F9 / +</Badge>
                  </Button>
                  <Form.Text className="text-muted d-block text-center mt-2">
                    提示：按 F9/+ 键可快速打开收款界面（默认扫码支付），F1 切换现金，F2 切换扫码
                  </Form.Text>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={7}>
          <Card>
            <Card.Header className="bg-info text-white">
              <strong>最近销售记录</strong>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>条形码</th>
                    <th>商品名称</th>
                    <th>数量</th>
                    <th>售价</th>
                    <th>销售额</th>
                    <th>支付方式</th>
                    <th>利润</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const paymentInfo = paymentMethodLabels[record.payment_method] || paymentMethodLabels.cash;
                    return (
                      <tr key={record.id}>
                        <td>{new Date(record.created_at).toLocaleString()}</td>
                        <td>{record.barcode}</td>
                        <td>{record.name}</td>
                        <td><Badge bg="danger">-{record.quantity}</Badge></td>
                        <td>¥{record.sale_price.toFixed(2)}</td>
                        <td>¥{record.total_revenue.toFixed(2)}</td>
                        <td>
                          <Badge bg={paymentInfo.color}>
                            {paymentInfo.icon} {paymentInfo.label}
                          </Badge>
                        </td>
                        <td className="text-success">¥{record.profit.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              {records.length === 0 && (
                <div className="text-center text-muted py-4">
                  暂无销售记录
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 收款模态框 */}
      <Modal show={showCheckout} onHide={() => { setShowCheckout(false); setPaymentCode(''); setAmountReceived(''); }} centered size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>💰 收款结算</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h5>订单明细</h5>
            <ListGroup variant="flush">
              {cart.map((item) => (
                <ListGroup.Item key={item.id} className="d-flex justify-content-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span>¥{(item.sale_price * item.quantity).toFixed(2)}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>

          <div className="bg-light p-3 rounded mb-3">
            <div className="d-flex justify-content-between mb-2">
              <span>商品总数:</span>
              <span className="fw-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>预计利润:</span>
              <span className="text-success fw-bold">¥{totalProfit.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="h5 mb-0">应收金额:</span>
              <span className="h4 text-danger fw-bold mb-0">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* 支付方式选择 - 简化版 */}
          <Form.Group className="mb-3">
            <Form.Label>支付方式 <Badge bg="secondary">F1 现金</Badge> <Badge bg="secondary">F2 扫码</Badge></Form.Label>
            <div className="d-flex gap-2">
              <Button
                variant={paymentMethod === 'cash' ? 'primary' : 'outline-primary'}
                className="flex-fill"
                onClick={() => { setPaymentMethod('cash'); setPaymentCode(''); setDetectedPaymentMethod(null); }}
              >
                💵 现金 <kbd className="ms-2">F1</kbd>
              </Button>
              <Button
                variant={paymentMethod === 'scan' ? 'info' : 'outline-info'}
                className="flex-fill"
                onClick={() => {
                  setPaymentMethod('scan' as any);
                  const currentTotal = cart.reduce((sum, item) => sum + item.sale_price * item.quantity, 0);
                  setAmountReceived(currentTotal.toFixed(2));
                  setTimeout(() => paymentCodeInputRef.current?.focus(), 100);
                }}
              >
                📱 扫码 <kbd className="ms-2">F2</kbd>
              </Button>
            </div>
          </Form.Group>

          {/* 现金支付 - 输入实收金额 */}
          {paymentMethod === 'cash' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>实收金额 (元) <Badge bg="secondary">Enter 确认</Badge></Form.Label>
                <Form.Control
                  ref={amountReceivedRef}
                  type="number"
                  step="0.01"
                  placeholder="请输入收款金额，按 Enter 确认收款"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && amountReceived && parseFloat(amountReceived) >= 0 && !loading) {
                      e.preventDefault();
                      handleCheckout();
                    }
                  }}
                  autoFocus
                />
                <Form.Text className="text-muted">
                  提示：实收金额可以小于应收金额（赊账/部分支付场景）
                </Form.Text>
              </Form.Group>
              {amountReceived && (
                parseFloat(amountReceived) >= totalAmount ? (
                  <Alert variant="info">
                    <div className="d-flex justify-content-between">
                      <span>找零:</span>
                      <span className="h5 mb-0">¥{change.toFixed(2)}</span>
                    </div>
                  </Alert>
                ) : (
                  <Alert variant="warning">
                    <div className="d-flex justify-content-between">
                      <span>欠款:</span>
                      <span className="h5 mb-0 text-danger">¥{Math.abs(change).toFixed(2)}</span>
                    </div>
                  </Alert>
                )
              )}
            </>
          )}

          {/* 扫码支付 - 自动识别付款码类型 */}
          {paymentMethod === 'scan' && (
            <Form.Group className="mb-3">
              <Form.Label>
                扫描付款码 <Badge bg="secondary">Enter 确认</Badge>
                {detectedPaymentMethod && (
                  <Badge bg={detectedPaymentMethod === 'alipay' ? 'info' : 'success'} className="ms-2">
                    已识别: {detectedPaymentMethod === 'alipay' ? '🔵 支付宝' : '🟢 微信'}
                  </Badge>
                )}
              </Form.Label>
              <Form.Control
                ref={paymentCodeInputRef}
                type="text"
                placeholder="请扫描顾客的微信或支付宝付款码，系统将自动识别"
                value={paymentCode}
                onChange={(e) => {
                  const code = e.target.value.trim();
                  setPaymentCode(code);

                  // 自动识别付款码类型
                  // 微信支付：18位，以 10-15 开头
                  // 支付宝：16-24位，以 25-30 开头
                  if (/^1[0-5]\d{16}$/.test(code)) {
                    // 10-15 开头，18位，是微信
                    setDetectedPaymentMethod('wechat');
                  } else if (/^2[5-9]\d{14,23}$/.test(code) || /^30\d{14,23}$/.test(code)) {
                    // 25-30 开头，16-24位，是支付宝
                    setDetectedPaymentMethod('alipay');
                  } else if (code.length >= 16 && /^\d+$/.test(code)) {
                    // 其他16位以上数字，根据开头判断
                    if (/^1[0-5]/.test(code)) {
                      setDetectedPaymentMethod('wechat');
                    } else if (/^2[5-9]/.test(code) || /^30/.test(code)) {
                      setDetectedPaymentMethod('alipay');
                    } else {
                      setDetectedPaymentMethod(null);
                    }
                  } else {
                    setDetectedPaymentMethod(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && paymentCode.trim() && detectedPaymentMethod && !loading) {
                    e.preventDefault();
                    handleCheckout();
                  }
                }}
                autoFocus
              />
              <Form.Text className="text-muted">
                {detectedPaymentMethod
                  ? `已识别为 ${detectedPaymentMethod === 'alipay' ? '支付宝' : '微信支付'}，按 Enter 确认收款`
                  : '请使用扫码枪扫描顾客手机上的付款码，系统将自动识别微信或支付宝'
                }
              </Form.Text>
              {!detectedPaymentMethod && paymentCode.length > 10 && (
                <Alert variant="warning" className="mt-2 py-2">
                  ⚠️ 无法识别付款码类型，请检查码是否正确
                </Alert>
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowCheckout(false); setPaymentCode(''); setDetectedPaymentMethod(null); setAmountReceived(''); setPaymentMethod('scan'); setTimeout(() => barcodeInputRef.current?.focus(), 100); }}>
            继续购物
          </Button>
          {paymentMethod === 'cash' ? (
            <Button
              variant="success"
              onClick={handleCheckout}
              disabled={loading || !amountReceived || parseFloat(amountReceived) < 0}
            >
              {loading ? '处理中...' : '✓ 确认收款'}
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleCheckout}
              disabled={loading || !paymentCode.trim() || !detectedPaymentMethod}
            >
              {loading ? '处理中...' : `✓ 确认${detectedPaymentMethod === 'alipay' ? '支付宝' : detectedPaymentMethod === 'wechat' ? '微信' : ''}收款`}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default StockOut;
