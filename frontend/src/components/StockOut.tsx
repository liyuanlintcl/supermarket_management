import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Row, Col } from 'react-bootstrap';
import { productAPI, stockOutAPI } from '../services/api';
import BarcodeScanner from './BarcodeScanner';

interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
}

interface StockOutRecord {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  sale_price: number;
  total_revenue: number;
  profit: number;
  created_at: string;
}

const StockOut: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [product, setProduct] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [records, setRecords] = useState<StockOutRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentRecords();
    barcodeInputRef.current?.focus();
  }, []);

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
    if (e.key === 'Enter') {
      try {
        const response = await productAPI.getByBarcode(barcode);
        setProduct(response.data);
        showAlert('success', `找到商品: ${response.data.name}，库存: ${response.data.stock}`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          showAlert('warning', '商品不存在');
          setProduct(null);
        } else {
          showAlert('danger', '查询失败');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) {
      showAlert('warning', '请先扫描或输入条形码查找商品');
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      showAlert('warning', '请输入有效的销售数量');
      return;
    }

    if (qty > product.stock) {
      showAlert('danger', `库存不足！当前库存: ${product.stock}`);
      return;
    }

    setLoading(true);
    try {
      const response = await stockOutAPI.create({
        barcode,
        quantity: qty,
      });

      showAlert('success', 
        `销售成功！${product.name} 售出 ${qty} 件，销售额: ¥${response.data.revenue.toFixed(2)}，利润: ¥${response.data.profit.toFixed(2)}`
      );
      
      // 重置表单
      setBarcode('');
      setQuantity('1');
      setProduct(null);
      
      // 刷新记录
      loadRecentRecords();
      
      // 重新聚焦
      barcodeInputRef.current?.focus();
    } catch (error: any) {
      showAlert('danger', error.response?.data?.error || '出库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBarcode('');
    setQuantity('1');
    setProduct(null);
    setAlert(null);
    barcodeInputRef.current?.focus();
  };

  const handleScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    // 自动查询商品
    setTimeout(() => {
      handleBarcodeScan({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>);
    }, 100);
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
              <strong>扫码销售</strong>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>条形码</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="请扫描或输入条形码，按回车确认"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={handleBarcodeScan}
                      autoFocus
                    />
                    <Button 
                      variant="outline-primary" 
                      onClick={() => setShowScanner(true)}
                      title="使用手机摄像头扫码"
                    >
                      📷
                    </Button>
                  </div>
                  <Form.Text className="text-muted">
                    提示：可以使用扫码枪或点击相机按钮使用手机摄像头
                  </Form.Text>
                </Form.Group>

                {product && (
                  <>
                    <Alert variant={product.stock > 0 ? 'info' : 'danger'}>
                      <strong>商品信息</strong><br />
                      名称: {product.name}<br />
                      售价: ¥{product.sale_price.toFixed(2)}<br />
                      当前库存: {' '}
                      <Badge bg={product.stock < 10 ? 'danger' : product.stock < 50 ? 'warning' : 'success'}>
                        {product.stock}
                      </Badge>
                    </Alert>

                    <Form.Group className="mb-3">
                      <Form.Label>销售数量</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        max={product.stock}
                        placeholder="请输入销售数量"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </Form.Group>

                    {quantity && (
                      <Alert variant="secondary">
                        <div>销售额: ¥{(parseInt(quantity) * product.sale_price).toFixed(2)}</div>
                        <div>预计利润: ¥{(parseInt(quantity) * (product.sale_price - product.purchase_price)).toFixed(2)}</div>
                      </Alert>
                    )}

                    <div className="d-flex gap-2">
                      <Button 
                        variant="warning" 
                        type="submit" 
                        disabled={loading || product.stock === 0}
                        className="flex-fill"
                      >
                        {loading ? '处理中...' : product.stock === 0 ? '库存不足' : '确认销售'}
                      </Button>
                      <Button variant="secondary" onClick={handleReset}>
                        重置
                      </Button>
                    </div>
                  </>
                )}
              </Form>
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
                    <th>利润</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.created_at).toLocaleString()}</td>
                      <td>{record.barcode}</td>
                      <td>{record.name}</td>
                      <td><Badge bg="danger">-{record.quantity}</Badge></td>
                      <td>¥{record.sale_price.toFixed(2)}</td>
                      <td>¥{record.total_revenue.toFixed(2)}</td>
                      <td className="text-success">¥{record.profit.toFixed(2)}</td>
                    </tr>
                  ))}
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

      <BarcodeScanner
        show={showScanner}
        onHide={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
};

export default StockOut;
