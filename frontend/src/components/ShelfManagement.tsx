import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Row, Col, InputGroup, Modal, ListGroup } from 'react-bootstrap';
import { productAPI, shelfAPI } from '../services/api';

interface ShelfItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  barcode: string;
  total_stock: number;
  min_shelf_stock: number;
  is_low_stock: number;
}

interface BatchInfo {
  id: number;
  remaining_qty: number;
  production_date: string;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}

interface ProductWithBatches {
  product: {
    id: number;
    barcode: string;
    name: string;
    shelf_life_days: number;
    stock: number;
  };
  shelf: {
    quantity: number;
  };
  batches: BatchInfo[];
}

const ShelfManagement: React.FC = () => {
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ShelfItem[]>([]);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  // 上架相关状态
  const [showStockModal, setShowStockModal] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [productData, setProductData] = useState<ProductWithBatches | null>(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 下架相关状态
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShelfItem | null>(null);
  const [removeQuantity, setRemoveQuantity] = useState('');

  useEffect(() => {
    loadShelfItems();
    loadLowStockItems();
  }, []);

  const loadShelfItems = async () => {
    try {
      const response = await shelfAPI.getAll();
      setShelfItems(response.data);
    } catch (error) {
      showAlert('danger', '加载货架信息失败');
    }
  };

  const loadLowStockItems = async () => {
    try {
      const response = await shelfAPI.getLowStock();
      setLowStockItems(response.data);
    } catch (error) {
      console.error('加载库存不足商品失败');
    }
  };

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  // 扫描条形码查询商品批次
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcode.trim()) {
      try {
        const response = await shelfAPI.getBatches(barcode.trim());
        setProductData(response.data);
        showAlert('success', `找到商品：${response.data.product.name}`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          showAlert('warning', '商品不存在');
        } else {
          showAlert('danger', '查询失败');
        }
        setProductData(null);
      }
    }
  };

  // 上架操作
  const handleStock = async () => {
    if (!productData || !stockQuantity || parseInt(stockQuantity) <= 0) {
      showAlert('warning', '请输入有效的上架数量');
      return;
    }

    const qty = parseInt(stockQuantity);
    // 计算可用库存：批次库存总和 + 如果没有批次则用商品总库存
    const batchQty = productData.batches.reduce((sum, b) => sum + b.remaining_qty, 0);
    const availableQty = batchQty > 0 ? batchQty : productData.product.stock || 0;

    if (qty > availableQty) {
      showAlert('warning', `库存不足，可用库存: ${availableQty}`);
      return;
    }

    try {
      await shelfAPI.stock({
        barcode: productData.product.barcode,
        quantity: qty,
      });

      showAlert('success', `上架成功！${productData.product.name} 上架 ${qty} 件`);
      setShowStockModal(false);
      setBarcode('');
      setProductData(null);
      setStockQuantity('');
      loadShelfItems();
      loadLowStockItems();
    } catch (error: any) {
      showAlert('danger', error.response?.data?.error || '上架失败');
    }
  };

  // 下架操作
  const handleRemove = async () => {
    if (!selectedItem || !removeQuantity || parseInt(removeQuantity) <= 0) {
      showAlert('warning', '请输入有效的下架数量');
      return;
    }

    const qty = parseInt(removeQuantity);
    if (qty > selectedItem.quantity) {
      showAlert('warning', `货架库存不足，当前库存: ${selectedItem.quantity}`);
      return;
    }

    try {
      await shelfAPI.remove({
        barcode: selectedItem.barcode,
        quantity: qty,
      });

      showAlert('success', `下架成功！${selectedItem.name} 下架 ${qty} 件`);
      setShowRemoveModal(false);
      setSelectedItem(null);
      setRemoveQuantity('');
      loadShelfItems();
      loadLowStockItems();
    } catch (error: any) {
      showAlert('danger', error.response?.data?.error || '下架失败');
    }
  };

  // 快捷上架（上架所有可用批次库存）
  const handleQuickStock = async () => {
    if (!productData) return;

    const availableQty = productData.batches.reduce((sum, b) => sum + b.remaining_qty, 0);
    if (availableQty === 0) {
      showAlert('warning', '没有可上架的库存');
      return;
    }

    setStockQuantity(availableQty.toString());
  };

  return (
    <div>
      <h2 className="mb-4">🛒 货架管理</h2>

      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      {/* 库存不足预警 */}
      {lowStockItems.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <Alert.Heading>⚠️ 库存不足预警</Alert.Heading>
          <p>以下商品货架库存已低于报警阈值，请及时补货：</p>
          <ListGroup variant="flush">
            {lowStockItems.map((item) => (
              <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-center bg-transparent">
                <span>{item.name} ({item.barcode})</span>
                <Badge bg="danger">
                  当前: {item.quantity} / 阈值: {item.min_shelf_stock}
                </Badge>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Alert>
      )}

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header className="bg-success text-white">
              <strong>快捷操作</strong>
            </Card.Header>
            <Card.Body>
              <Button
                variant="success"
                size="lg"
                className="w-100 mb-3"
                onClick={() => {
                  setShowStockModal(true);
                  setTimeout(() => barcodeInputRef.current?.focus(), 100);
                }}
              >
                📦 商品上架
              </Button>
              <div className="text-muted small">
                <p>操作说明：</p>
                <ul className="ps-3">
                  <li>入库后的商品需要先上架到货架</li>
                  <li>销售时自动从货架扣减库存</li>
                  <li>货架库存不足时会触发报警</li>
                </ul>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header className="bg-info text-white">
              <strong>统计信息</strong>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <span>货架商品种类:</span>
                <Badge bg="primary">{shelfItems.length}</Badge>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>库存不足商品:</span>
                <Badge bg={lowStockItems.length > 0 ? 'danger' : 'success'}>
                  {lowStockItems.length}
                </Badge>
              </div>
              <div className="d-flex justify-content-between">
                <span>货架总数量:</span>
                <Badge bg="info">
                  {shelfItems.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <strong>货架库存列表</strong>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>条形码</th>
                    <th>商品名称</th>
                    <th>货架数量</th>
                    <th>总库存</th>
                    <th>报警阈值</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {shelfItems.map((item) => (
                    <tr key={item.id} className={item.is_low_stock ? 'table-warning' : ''}>
                      <td>{item.barcode}</td>
                      <td>{item.name}</td>
                      <td>
                        <Badge bg={item.is_low_stock ? 'danger' : 'success'}>
                          {item.quantity}
                        </Badge>
                      </td>
                      <td>{item.total_stock}</td>
                      <td>{item.min_shelf_stock}</td>
                      <td>
                        {item.is_low_stock ? (
                          <Badge bg="warning">⚠️ 库存不足</Badge>
                        ) : (
                          <Badge bg="success">正常</Badge>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRemoveModal(true);
                          }}
                          disabled={item.quantity === 0}
                        >
                          下架
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {shelfItems.length === 0 && (
                <div className="text-center text-muted py-4">
                  货架暂无商品，请先进行上架操作
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 上架模态框 */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>📦 商品上架</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
              扫描条形码查询商品的批次库存信息
            </Form.Text>
          </Form.Group>

          {productData && (
            <>
              <Alert variant="info">
                <strong>商品信息：{productData.product.name}</strong>
                <br />
                当前货架库存: <Badge bg="primary">{productData.shelf.quantity}</Badge>
                <br />
                仓库可用库存:{' '}
                <Badge bg="success">
                  {productData.batches.reduce((sum, b) => sum + b.remaining_qty, 0)}
                </Badge>
              </Alert>

              {productData.batches.length > 0 && (
                <Card className="mb-3">
                  <Card.Header className="bg-light">
                    <strong>可上架批次（先进先出）</strong>
                  </Card.Header>
                  <Card.Body>
                    <Table striped hover size="sm">
                      <thead>
                        <tr>
                          <th>生产日期</th>
                          <th>剩余数量</th>
                          <th>到期日期</th>
                          <th>状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productData.batches.map((batch) => (
                          <tr key={batch.id}>
                            <td>{batch.production_date}</td>
                            <td>{batch.remaining_qty}</td>
                            <td>{batch.expiry_date}</td>
                            <td>
                              {batch.is_expired ? (
                                <Badge bg="dark">已过期</Badge>
                              ) : batch.days_until_expiry <= 30 ? (
                                <Badge bg="warning">临期</Badge>
                              ) : (
                                <Badge bg="success">正常</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <Button variant="outline-primary" size="sm" onClick={handleQuickStock}>
                      一键上架全部可用库存
                    </Button>
                  </Card.Body>
                </Card>
              )}

              {productData.batches.length === 0 && (
                <Alert variant="warning">该商品暂无可用批次库存，请先入库</Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>上架数量</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="请输入上架数量"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStockModal(false)}>
            取消
          </Button>
          <Button
            variant="success"
            onClick={handleStock}
            disabled={!productData || productData.batches.length === 0}
          >
            确认上架
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 下架模态框 */}
      <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)}>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>📦 商品下架</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <Alert variant="info">
                <strong>商品：{selectedItem.name}</strong>
                <br />
                当前货架库存: <Badge bg="primary">{selectedItem.quantity}</Badge>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>下架数量</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={selectedItem.quantity}
                  placeholder={`最大可下架 ${selectedItem.quantity} 件`}
                  value={removeQuantity}
                  onChange={(e) => setRemoveQuantity(e.target.value)}
                />
                <Form.Text className="text-muted">
                  下架的商品将退回仓库，形成新的批次
                </Form.Text>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleRemove} disabled={!removeQuantity}>
            确认下架
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ShelfManagement;
