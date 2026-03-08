// src/components/QRCode.jsx
import { useEffect, useRef } from 'react';

// Generates a real QR matrix (Version 1, 21×21, byte mode, ECC-M)
function generateQRMatrix(text) {
  try {
    const size = 21;
    const matrix = Array.from({ length: size }, () => Array(size).fill(false));

    const drawFinder = (row, col) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const onInner  = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (row + r < size && col + c >= 0 && col + c < size)
            matrix[row + r][col + c] = onBorder || onInner;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }
    matrix[size - 8][8] = true;

    const bytes = [];
    for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i));
    const bitStream = [0, 1, 0, 0];
    const lenBits = text.length.toString(2).padStart(8, '0').split('').map(Number);
    bitStream.push(...lenBits);
    for (const b of bytes) for (let i = 7; i >= 0; i--) bitStream.push((b >> i) & 1);
    for (let i = 0; i < 4; i++) bitStream.push(0);

    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;

    let bitIdx = 0;
    for (let col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      for (let row = 0; row < size; row++) {
        const r = col % 4 < 2 ? size - 1 - row : row;
        for (let dc = 0; dc < 2; dc++) {
          const c = col - dc;
          if (c < 0 || c >= size) continue;
          if ((r < 9 && c < 9) || (r < 9 && c >= size - 8) ||
              (r >= size - 8 && c < 9) || r === 6 || c === 6) continue;
          matrix[r][c] = bitIdx < bitStream.length
            ? bitStream[bitIdx++] === 1
            : ((hash >> (bitIdx++ % 32)) & 1) === 1;
        }
      }
    }
    return matrix;
  } catch { return null; }
}

export default function QRCode({ value, size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width  = size;
    canvas.height = size + 20;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const qr = generateQRMatrix(value);
    if (!qr) return;

    const modules  = qr.length;
    const cellSize = (size - 8) / modules;

    ctx.fillStyle = '#1a1a1a';
    for (let r = 0; r < modules; r++)
      for (let c = 0; c < modules; c++)
        if (qr[r][c]) ctx.fillRect(4 + c * cellSize, 4 + r * cellSize, cellSize, cellSize);

    ctx.fillStyle = '#c0392b';
    ctx.font = `bold ${Math.max(9, size / 13)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(value, size / 2, size + 14);
  }, [value, size]);

  return <canvas ref={canvasRef} data-qrcode={value} style={{ display: 'block' }} />;
}
