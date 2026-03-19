import { useEffect, useMemo, useRef, useState } from 'react';
import { S } from '../styles';

export default function QRCameraScanner({ onDetected, buttonLabel = 'Scan with Camera' }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const supported = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  const stopScanner = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    if (!supported) {
      setError('Camera scan is not supported in this browser. Please enter code manually.');
      return;
    }

    setError('');
    setStarting(true);

    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const tick = async () => {
        if (!videoRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const value = String(codes[0].rawValue || '').trim();
            if (value) {
              onDetected(value);
              setOpen(false);
              stopScanner();
              return;
            }
          }
        } catch (_err) {
          // Ignore frame-level detection errors and keep scanning.
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err?.message || 'Unable to access camera for scanning.');
      stopScanner();
    } finally {
      setStarting(false);
    }
  };

  const openScanner = async () => {
    setOpen(true);
    await startScanner();
  };

  const closeScanner = () => {
    setOpen(false);
    setError('');
    stopScanner();
  };

  return (
    <>
      <button
        style={{ ...S.btnSecondary, flex: 'none', padding: '10px 14px' }}
        type="button"
        onClick={openScanner}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: 'min(96vw, 520px)', padding: 14 }}>
            <div style={{ ...S.subheading, marginBottom: 10 }}>Scan QR Code</div>
            {error && <div style={S.error}>{error}</div>}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{ width: '100%', borderRadius: 10, background: '#111', minHeight: 220 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
              <div style={{ color: '#666', fontSize: 12 }}>
                {starting ? 'Starting camera...' : 'Point camera at QR code'}
              </div>
              <button type="button" style={{ ...S.btnPrimary, flex: 'none', padding: '8px 14px' }} onClick={closeScanner}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
