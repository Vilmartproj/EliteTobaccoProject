// src/components/QRCode.jsx
import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

export default function QRCode({ value, size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }, (err) => {
      if (err) return;
      const ctx = canvas.getContext('2d');
      const labelH = 20;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.height = size + labelH;
      ctx.putImageData(imgData, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, size, canvas.width, labelH);
      ctx.fillStyle = '#c0392b';
      ctx.font = `bold ${Math.max(9, size / 13)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(value, size / 2, size + 14);
    });
  }, [value, size]);

  return <canvas ref={canvasRef} data-qrcode={value} style={{ display: 'block' }} />;
}
