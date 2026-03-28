import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import { productAPI } from '../services/api';

interface Product {
  id: number;
  barcode: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  stock: number;
  created_at: string;
}

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [searchBarcode, setSearchBarcode] = useState('');
  
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    purchase_price: '',
    sale_price: '',
    stock: '0',
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
    try {
      const data = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        sale_price: parseFloat(formData.sale_price),
        stock: parseInt(formData.stock),
      };

      if (editingProduct) {
        await productAPI.update(editingProduct.id, {
          name: data.name,
          purchase_price: data.purchase_price,
          sale_price: data.sale_price,
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

  const resetForm = () => {
    setFormData({
      barcode: '',
      name: '',
      purchase_price: '',
      sale_price: '',
      stock: '0',
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
              <td>{((product.sale_price - product.purchase_price) / product.purchase_price * 100).toFixed(1)}%</td>
              <td>
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
              <Form.Control
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                disabled={!!editingProduct}
                required
              />
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
            {!editingProduct && (
              <Form.Group className="mb-3">
                <Form.Label>初始库存</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </Form.Group>
            )}
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
    </div>
  );
};

export default ProductManagement;
