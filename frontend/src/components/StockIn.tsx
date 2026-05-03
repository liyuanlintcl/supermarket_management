import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Row, Col, InputGroup } from 'react-bootstrap';
import { productAPI, stockInAPI } from '../services/api';

interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  shelf_life_days: number;
}

interface StockInRecord {
  id: number;
  barcode: string;
  name: string;
  quantity: number;
  purchase_price: number;
  total_cost: number;
  created_at: string;
}

const StockIn: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [shelfLifeDays, setShelfLifeDays] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [records, setRecords] = useState<StockInRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentRecords();
    barcodeInputRef.current?.focus();
  }, []);

  const loadRecentRecords = async () => {
    try {
      const response = await stockInAPI.getAll({ limit: 10 });
      setRecords(response.data);
    } catch (error) {
      console.error('加载入库记录失败');
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
        const product = response.data;
        setProduct(product);
        setPurchasePrice(product.purchase_price.toString());
        // 自动填充商品的默认保质期
        if (product.shelf_life_days && product.shelf_life_days > 0) {
          setShelfLifeDays(product.shelf_life_days.toString());
        }
        showAlert('success', `找到商品：${product.name}`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          showAlert('warning', '商品不存在，请先添加商品');
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

    if (!quantity || parseInt(quantity) <= 0) {
      showAlert('warning', '请输入有效的入库数量');
      return;
    }

    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
      showAlert('warning', '请输入有效的进价');
      return;
    }

    // 验证生产日期必填
    if (!productionDate) {
      showAlert('warning', '请选择生产日期');
      return;
    }

    // 使用商品默认的保质期（从商品信息中获取）
    const defaultShelfLifeDays = product?.shelf_life_days || 365;

    setLoading(true);
    try {
      await stockInAPI.create({
        barcode,
        quantity: parseInt(quantity),
        purchase_price: parseFloat(purchasePrice),
        production_date: productionDate,
        shelf_life_days: defaultShelfLifeDays,
      });

      showAlert('success', `入库成功！${product.name} 入库 ${quantity} 件`);

      // 重置表单
      setBarcode('');
      setQuantity('');
      setPurchasePrice('');
      setProductionDate('');
      setShelfLifeDays('');
      setProduct(null);

      // 刷新记录
      loadRecentRecords();

      // 重新聚焦
      barcodeInputRef.current?.focus();
    } catch (error: any) {
      showAlert('danger', error.response?.data?.error || '入库失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBarcode('');
    setQuantity('');
    setPurchasePrice('');
    setProductionDate('');
    setShelfLifeDays('');
    setProduct(null);
    setAlert(null);
    barcodeInputRef.current?.focus();
  };

  return (
    <div>
      <h2 className="mb-4">📥 入库管理</h2>

      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col md={5}>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <strong>扫码入库</strong>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
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
                    提示：使用扫描枪扫描条形码，或手动输入后按回车键
                  </Form.Text>
                </Form.Group>

                {product && (
                  <>
                    <Alert variant="info">
                      <strong>商品信息</strong><br />
                      名称：{product.name}<br />
                      当前库存：<Badge bg="primary">{product.stock}</Badge>
                    </Alert>

                    <Form.Group className="mb-3">
                      <Form.Label>入库数量</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        placeholder="请输入入库数量"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>进价 (元)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="请输入进价"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>生产日期 <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        value={productionDate}
                        onChange={(e) => setProductionDate(e.target.value)}
                        required
                      />
                      <Form.Text className="text-muted">
                        必填：选择商品的生产日期
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>保质期天数</Form.Label>
                      <Form.Control
                        type="number"
                        value={product.shelf_life_days || 365}
                        disabled
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        自动使用商品默认保质期 {product.shelf_life_days || 365} 天（在商品管理中修改）
                      </Form.Text>
                    </Form.Group>

                    {quantity && purchasePrice && (
                      <Alert variant="secondary">
                        预计成本：¥{(parseInt(quantity) * parseFloat(purchasePrice)).toFixed(2)}
                      </Alert>
                    )}

                    <div className="d-flex gap-2">
                      <Button
                        variant="success"
                        type="submit"
                        disabled={loading}
                        className="flex-fill"
                      >
                        {loading ? '处理中...' : '确认入库'}
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
              <strong>最近入库记录</strong>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>条形码</th>
                    <th>商品名称</th>
                    <th>数量</th>
                    <th>进价</th>
                    <th>总成本</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.created_at).toLocaleString()}</td>
                      <td>{record.barcode}</td>
                      <td>{record.name}</td>
                      <td><Badge bg="success">+{record.quantity}</Badge></td>
                      <td>¥{record.purchase_price.toFixed(2)}</td>
                      <td>¥{record.total_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {records.length === 0 && (
                <div className="text-center text-muted py-4">
                  暂无入库记录
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StockIn;
