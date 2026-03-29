import { Capacitor } from '@capacitor/core';

const INSTALL_TIMEOUT_MS = 30000;
const INSTALL_POLL_INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isCancelError = (message) => /cancel/i.test(String(message || ''));

export const isNativeQrScannerAvailable = () => {
  if (typeof window === 'undefined') return false;
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
};

const ensureGoogleBarcodeScannerModule = async (BarcodeScanner, onStatusChange) => {
  const updateStatus = typeof onStatusChange === 'function' ? onStatusChange : () => {};
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (available) return;

  let listener;
  try {
    listener = await BarcodeScanner.addListener('googleBarcodeScannerModuleInstallProgress', (event) => {
      const progress = Number(event?.progress);
      if (Number.isFinite(progress) && progress >= 0) {
        updateStatus(`Installing scanner module... ${progress}%`);
        return;
      }
      updateStatus('Installing scanner module...');
    });

    updateStatus('Installing scanner module...');
    try {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    } catch (error) {
      const message = String(error?.message || error || '');
      if (!/already installed/i.test(message)) {
        throw error;
      }
    }

    const deadline = Date.now() + INSTALL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const result = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (result?.available) return;
      await sleep(INSTALL_POLL_INTERVAL_MS);
    }

    throw new Error('Google barcode scanner module is not ready yet. Check Play Services and internet access, then try again.');
  } finally {
    await listener?.remove();
  }
};

export const scanNativeQrCode = async ({ onStatusChange } = {}) => {
  if (!isNativeQrScannerAvailable()) {
    throw new Error('Native QR scanner is not available on this device.');
  }

  const updateStatus = typeof onStatusChange === 'function' ? onStatusChange : () => {};
  const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
  const platform = Capacitor.getPlatform();

  try {
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      throw new Error('QR scanner is not supported on this device.');
    }

    if (platform === 'ios') {
      const permission = await BarcodeScanner.requestPermissions();
      if (permission?.camera !== 'granted') {
        throw new Error('Camera permission denied. Please allow camera access in app settings.');
      }
    }

    if (platform === 'android') {
      await ensureGoogleBarcodeScannerModule(BarcodeScanner, updateStatus);
    }

    updateStatus('Opening scanner...');
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode],
      autoZoom: true,
    });

    const first = Array.isArray(barcodes) ? barcodes[0] : null;
    const scannedValue = String(first?.rawValue || first?.displayValue || '').trim();
    if (!scannedValue) {
      throw new Error('No QR code detected. Please try again.');
    }

    return scannedValue;
  } catch (error) {
    const message = String(error?.message || error || '');
    if (isCancelError(message)) {
      return '';
    }
    throw error;
  } finally {
    updateStatus('');
  }
};