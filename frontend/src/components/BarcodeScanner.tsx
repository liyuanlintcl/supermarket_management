import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface BarcodeScannerProps {
  show: boolean;
  onHide: () => void;
  onScan: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ show, onHide, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && containerRef.current) {
      setScanning(true);
      setError(null);

      // 配置扫码器
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      };

      try {
        scannerRef.current = new Html5QrcodeScanner(
          'barcode-scanner-container',
          config,
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            // 扫码成功
            console.log('扫码成功:', decodedText);
            onScan(decodedText);
            handleClose();
          },
          (errorMessage) => {
            // 扫码过程中的错误（可以忽略）
            console.log('扫码中...', errorMessage);
          }
        );
      } catch (err) {
        setError('无法启动摄像头，请检查权限设置');
        setScanning(false);
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [show]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>📷 扫码条形码</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
            <div className="mt-2 small">
              提示：请确保已授予摄像头权限，并在HTTPS或localhost环境下使用
            </div>
          </Alert>
        )}
        
        <div className="mb-3 text-muted">
          将条形码对准摄像头，系统会自动识别
        </div>
        
        <div 
          id="barcode-scanner-container" 
          ref={containerRef}
          style={{ 
            width: '100%', 
            maxWidth: '500px', 
            margin: '0 auto',
            minHeight: '300px'
          }}
        />
        
        {!scanning && !error && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2 text-muted">正在启动摄像头...</div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          取消
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BarcodeScanner;
