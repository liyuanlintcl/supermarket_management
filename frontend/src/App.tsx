import React, { useState } from 'react';
import { Container, Nav, Navbar, Tab, Tabs } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import ProductManagement from './components/ProductManagement';
import StockIn from './components/StockIn';
import StockOut from './components/StockOut';
import Statistics from './components/Statistics';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="App">
      <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand href="#home">
            <strong>🏪 超市货物管理系统</strong>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
                📦 商品管理
              </Nav.Link>
              <Nav.Link active={activeTab === 'stockin'} onClick={() => setActiveTab('stockin')}>
                📥 入库管理
              </Nav.Link>
              <Nav.Link active={activeTab === 'stockout'} onClick={() => setActiveTab('stockout')}>
                📤 销售出库
              </Nav.Link>
              <Nav.Link active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')}>
                📊 统计报表
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container fluid className="px-4">
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'stockin' && <StockIn />}
        {activeTab === 'stockout' && <StockOut />}
        {activeTab === 'statistics' && <Statistics />}
      </Container>
    </div>
  );
}

export default App;
