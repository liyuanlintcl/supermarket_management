import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import { productAPI, batchAPI } from '../services/api';

interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  shelf_life_days: number;
  min_shelf_stock: number;
  created_at: string;
}

interface Batch {
  id: number;
  product_id: number;
  quantity: number;
  remaining_qty: number;
  production_date: string;
  shelf_life_days: number;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
  is_near_expiry: boolean;
}

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [searchBarcode, setSearchBarcode] = useState('');

  // 批次查看相关状态
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedProductBatches, setSelectedProductBatches] = useState<Batch[]>([]);
  const [selectedProductName, setSelectedProductName] = useState('');

  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    purchase_price: '',
    sale_price: '',
    stock: '0',
    shelf_life_days: '',
    min_shelf_stock: '10',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      showAlert('danger', '加载商品列表失败');
    }
  };

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证保质期必填
    const shelfLifeDays = parseInt(formData.shelf_life_days);
    if (!shelfLifeDays || shelfLifeDays <= 0) {
      showAlert('warning', '保质期必须填写且大于0天');
      return;
    }

    try {
      const data = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        sale_price: parseFloat(formData.sale_price),
        stock: parseInt(formData.stock),
        shelf_life_days: shelfLifeDays,
        min_shelf_stock: parseInt(formData.min_shelf_stock) || 10,
      };

      if (editingProduct) {
        await productAPI.update(editingProduct.id, {
          name: data.name,
          purchase_price: data.purchase_price,
          sale_price: data.sale_price,
          shelf_life_days: data.shelf_life_days,
          min_shelf_stock: data.min_shelf_stock,
        });
        showAlert('success', '商品更新成功');
      } else {
        await productAPI.create(data);
        showAlert('success', '商品添加成功');
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error: any) {
      showAlert('danger', error.response?.data?.error || '操作失败');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      purchase_price: product.purchase_price.toString(),
      sale_price: product.sale_price.toString(),
      stock: product.stock.toString(),
      shelf_life_days: (product.shelf_life_days || 0).toString(),
      min_shelf_stock: (product.min_shelf_stock || 10).toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定要删除这个商品吗？')) {
      try {
        await productAPI.delete(id);
        showAlert('success', '商品删除成功');
        loadProducts();
      } catch (error) {
        showAlert('danger', '删除失败');
      }
    }
  };

  // 查看商品批次
  const handleViewBatches = async (product: Product) => {
    try {
      const response = await batchAPI.getAll({ product_id: product.id });
      setSelectedProductBatches(response.data);
      setSelectedProductName(product.name);
      setShowBatchModal(true);
    } catch (error) {
      showAlert('danger', '加载批次信息失败');
    }
  };

  const resetForm = () => {
    setFormData({
      barcode: '',
      name: '',
      purchase_price: '',
      sale_price: '',
      stock: '0',
      shelf_life_days: '',
      min_shelf_stock: '10',
    });
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const handleSearch = async () => {
    if (!searchBarcode.trim()) {
      loadProducts();
      return;
    }
    try {
      const response = await productAPI.getByBarcode(searchBarcode);
      setProducts([response.data]);
    } catch (error) {
      showAlert('warning', '未找到该条形码的商品');
    }
  };

  const handleScan = async (barcode: string) => {
    setFormData({ ...formData, barcode });

    try {
      const response = await productAPI.getByBarcode(barcode);
      const result = response.data;

      if (result) {
        showAlert('success', `找到商品：${result.name}`);
        setFormData({
          barcode: result.barcode,
          name: result.name,
          purchase_price: result.purchase_price.toString(),
          sale_price: result.sale_price.toString(),
          stock: '0',
          shelf_life_days: (result.shelf_life_days || 0).toString(),
          min_shelf_stock: (result.min_shelf_stock || 10).toString(),
        });
      }
    } catch (error) {
      showAlert('info', '该条形码的商品不存在，请填写商品信息');
      setFormData({ ...formData, barcode });
    }
  };

  return (
    <div>
      <h2 className="mb-4">📦 商品管理</h2>

      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <InputGroup style={{ width: '300px' }}>
            <Form.Control
              type="text"
              placeholder="输入条形码搜索"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="outline-secondary" onClick={handleSearch}>
              🔍
            </Button>
          </InputGroup>
          <Button variant="outline-secondary" onClick={loadProducts}>
            刷新
          </Button>
        </div>
        <Button variant="primary" onClick={handleAddNew}>
          ➕ 添加商品
        </Button>
      </div>

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>条形码</th>
            <th>商品名称</th>
            <th>进价(元)</th>
            <th>售价(元)</th>
            <th>库存</th>
            <th>保质期(天)</th>
            <th>货架报警值</th>
            <th>利润率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.id}</td>
              <td>{product.barcode}</td>
              <td>{product.name}</td>
              <td>¥{product.purchase_price.toFixed(2)}</td>
              <td>¥{product.sale_price.toFixed(2)}</td>
              <td>
                <Badge bg={product.stock < 10 ? 'danger' : product.stock < 50 ? 'warning' : 'success'}>
                  {product.stock}
                </Badge>
              </td>
              <td>{product.shelf_life_days || '-'}</td>
              <td>{product.min_shelf_stock || 10}</td>
              <td>{((product.sale_price - product.purchase_price) / product.purchase_price * 100).toFixed(1)}%</td>
              <td>
                <Button variant="info" size="sm" className="me-2" onClick={() => handleViewBatches(product)}>
                  批次
                </Button>
                <Button variant="warning" size="sm" className="me-2" onClick={() => handleEdit(product)}>
                  编辑
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)}>
                  删除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingProduct ? '编辑商品' : '添加商品'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>条形码</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  onKeyDown={(e) => {
                    // 扫描枪扫描后会自动发送回车键
                    if (e.key === 'Enter' && !editingProduct && formData.barcode) {
                      e.preventDefault();
                      handleScan(formData.barcode);
                    }
                  }}
                  disabled={!!editingProduct}
                  placeholder={editingProduct ? '' : '使用扫描枪扫描或手动输入后按回车'}
                  required
                  autoFocus={!editingProduct}
                />
              </InputGroup>
              {!editingProduct && (
                <Form.Text className="text-muted">
                  使用扫描枪扫描条形码，或手动输入后按回车键查询商品信息
                </Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>商品名称</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>进价 (元)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>售价 (元)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>保质期 (天) <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={formData.shelf_life_days}
                onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                placeholder="输入保质期天数，如 365"
                required
              />
              <Form.Text className="text-muted">
                必填：设置商品的默认保质期天数，入库时会自动使用此值
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>货架最低库存报警值</Form.Label>
              <Form.Control
                type="number"
                value={formData.min_shelf_stock}
                onChange={(e) => setFormData({ ...formData, min_shelf_stock: e.target.value })}
                placeholder="输入最低库存报警值，如 10"
              />
              <Form.Text className="text-muted">
                当货架上的商品数量低于此值时会触发报警提示
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button variant="primary" type="submit">
                保存
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* 批次查看模态框 */}
      <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>📦 {selectedProductName} - 批次信息</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProductBatches.length === 0 ? (
            <Alert variant="info">该商品暂无批次信息</Alert>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>批次ID</th>
                  <th>生产日期</th>
                  <th>入库数量</th>
                  <th>剩余数量</th>
                  <th>保质期(天)</th>
                  <th>到期日期</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>{batch.id}</td>
                    <td>{batch.production_date}</td>
                    <td>{batch.quantity}</td>
                    <td>
                      <Badge bg={batch.remaining_qty < 5 ? 'danger' : 'success'}>
                        {batch.remaining_qty}
                      </Badge>
                    </td>
                    <td>{batch.shelf_life_days}</td>
                    <td>{batch.expiry_date}</td>
                    <td>
                      {batch.is_expired ? (
                        <Badge bg="dark">已过期</Badge>
                      ) : batch.is_near_expiry ? (
                        <Badge bg="warning">临期</Badge>
                      ) : (
                        <Badge bg="success">正常</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBatchModal(false)}>
            关闭
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default ProductManagement;
