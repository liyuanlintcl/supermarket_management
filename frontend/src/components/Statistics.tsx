import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Form, Button, Alert } from 'react-bootstrap';
import { statisticsAPI } from '../services/api';

interface Stats {
  stock: {
    total_products: number;
    total_stock: number;
  };
  sales: {
    total_sold: number;
    total_revenue: number;
    total_profit: number;
  };
  purchase: {
    total_purchased: number;
    total_cost: number;
  };
}

interface TopProduct {
  name: string;
  barcode: string;
  total_sold: number;
  total_revenue: number;
}

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    // 设置默认日期范围为当月
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    loadData();
  }, []);

  const loadData = async (start?: string, end?: string) => {
    try {
      const params = start && end ? { start_date: start, end_date: end } : {};
      const [statsRes, topRes] = await Promise.all([
        statisticsAPI.getStats(params),
        statisticsAPI.getTopProducts(10),
      ]);
      setStats(statsRes.data);
      setTopProducts(topRes.data);
    } catch (error) {
      setAlert({ type: 'danger', message: '加载统计数据失败' });
    }
  };

  const handleFilter = () => {
    if (startDate && endDate) {
      loadData(startDate, endDate);
    }
  };

  const handleReset = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    loadData();
  };

  return (
    <div>
      <h2 className="mb-4">📊 统计报表</h2>

      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      {/* 日期筛选 */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>开始日期</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>结束日期</Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleFilter}>
                  筛选
                </Button>
                <Button variant="outline-secondary" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 统计卡片 */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100 border-primary">
              <Card.Body>
                <div className="text-muted mb-2">商品种类</div>
                <h3 className="text-primary">{stats.stock.total_products}</h3>
                <div className="small text-muted">种</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-info">
              <Card.Body>
                <div className="text-muted mb-2">总库存</div>
                <h3 className="text-info">{stats.stock.total_stock}</h3>
                <div className="small text-muted">件</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-success">
              <Card.Body>
                <div className="text-muted mb-2">销售额</div>
                <h3 className="text-success">¥{stats.sales.total_revenue.toFixed(2)}</h3>
                <div className="small text-muted">
                  售出 {stats.sales.total_sold} 件
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100 border-warning">
              <Card.Body>
                <div className="text-muted mb-2">利润</div>
                <h3 className="text-warning">¥{stats.sales.total_profit.toFixed(2)}</h3>
                <div className="small text-muted">
                  利润率: {stats.sales.total_revenue > 0 
                    ? ((stats.sales.total_profit / stats.sales.total_revenue) * 100).toFixed(1) 
                    : 0}%
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        {/* 热销商品排行 */}
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <strong>🏆 热销商品排行 TOP10</strong>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>商品名称</th>
                    <th>销量</th>
                    <th>销售额</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={product.barcode}>
                      <td>
                        {index === 0 && <Badge bg="warning">🥇</Badge>}
                        {index === 1 && <Badge bg="secondary">🥈</Badge>}
                        {index === 2 && <Badge bg="bronze">🥉</Badge>}
                        {index > 2 && index + 1}
                      </td>
                      <td>{product.name}</td>
                      <td><Badge bg="success">{product.total_sold}</Badge></td>
                      <td>¥{product.total_revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {topProducts.length === 0 && (
                <div className="text-center text-muted py-4">
                  暂无销售数据
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* 库存预警 */}
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header className="bg-danger text-white">
              <strong>⚠️ 库存预警</strong>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>库存状态说明：</strong>
                <ul className="mt-2">
                  <li><Badge bg="danger">红色</Badge> 库存不足 10 件，需要补货</li>
                  <li><Badge bg="warning">黄色</Badge> 库存不足 50 件，注意监控</li>
                  <li><Badge bg="success">绿色</Badge> 库存充足</li>
                </ul>
              </Alert>
              <div className="text-center text-muted py-4">
                <p>请在"商品管理"页面查看详细库存信息</p>
                <p>系统会自动标记库存不足的商品</p>
              </div>
            </Card.Body>
          </Card>

          {/* 经营概况 */}
          {stats && (
            <Card>
              <Card.Header className="bg-info text-white">
                <strong>📈 经营概况</strong>
              </Card.Header>
              <Card.Body>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td>总采购成本:</td>
                      <td className="text-end">¥{stats.purchase.total_cost.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>总销售收入:</td>
                      <td className="text-end">¥{stats.sales.total_revenue.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>总利润:</td>
                      <td className="text-end text-success">
                        <strong>¥{stats.sales.total_profit.toFixed(2)}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>平均利润率:</td>
                      <td className="text-end">
                        {stats.sales.total_revenue > 0 
                          ? ((stats.sales.total_profit / stats.sales.total_revenue) * 100).toFixed(1) 
                          : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td>库存周转率:</td>
                      <td className="text-end">
                        {stats.stock.total_stock > 0 
                          ? (stats.sales.total_sold / stats.stock.total_stock).toFixed(2) 
                          : 0}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default Statistics;
