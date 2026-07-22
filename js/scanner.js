let universalScannerInstance = null;
let posScannerInstance = null;
let isUniversalScanning = false;
let isPosScanning = false;

document.addEventListener('DOMContentLoaded', () => {
  const btnTopbarCamera = document.getElementById('btn-topbar-camera');
  if (btnTopbarCamera) {
    btnTopbarCamera.addEventListener('click', openUniversalScanner);
  }

  const btnCloseScanner = document.getElementById('btn-close-scanner');
  if (btnCloseScanner) {
    btnCloseScanner.addEventListener('click', closeUniversalScanner);
  }

  const btnTogglePosCamera = document.getElementById('btn-toggle-pos-camera');
  if (btnTogglePosCamera) {
    btnTogglePosCamera.addEventListener('click', togglePosCamera);
  }
});

function getSupportedFormats() {
  if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
    return [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39
    ];
  }
  return [];
}

async function openUniversalScanner() {
  const modal = document.getElementById('modal-scanner');
  if (!modal) return;
  modal.classList.remove('hidden');

  if (isUniversalScanning) return;

  try {
    if (!universalScannerInstance && typeof Html5Qrcode !== 'undefined') {
      universalScannerInstance = new Html5Qrcode("qr-reader", {
        formatsToSupport: getSupportedFormats(),
        verbose: false
      });
    }

    if (universalScannerInstance) {
      isUniversalScanning = true;
      await universalScannerInstance.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          handleScanResult(decodedText.trim(), false);
        },
        () => {}
      );
    }
  } catch (err) {
    isUniversalScanning = false;
    showToast('Unable to access camera: ' + err.message, 'error');
  }
}

async function closeUniversalScanner() {
  const modal = document.getElementById('modal-scanner');
  if (modal) modal.classList.add('hidden');

  if (universalScannerInstance && isUniversalScanning) {
    try {
      await universalScannerInstance.stop();
      universalScannerInstance.clear();
    } catch (err) {}
    isUniversalScanning = false;
  }
}

async function togglePosCamera() {
  const container = document.getElementById('pos-camera-container');
  if (!container) return;

  if (isPosScanning) {
    await closePosCamera();
    return;
  }

  container.classList.remove('hidden');

  try {
    if (!posScannerInstance && typeof Html5Qrcode !== 'undefined') {
      posScannerInstance = new Html5Qrcode("pos-qr-reader", {
        formatsToSupport: getSupportedFormats(),
        verbose: false
      });
    }

    if (posScannerInstance) {
      isPosScanning = true;
      await posScannerInstance.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          handleScanResult(decodedText.trim(), true);
        },
        () => {}
      );
    }
  } catch (err) {
    isPosScanning = false;
    container.classList.add('hidden');
    showToast('Unable to start POS camera scanner: ' + err.message, 'error');
  }
}

async function closePosCamera() {
  const container = document.getElementById('pos-camera-container');
  if (container) container.classList.add('hidden');

  if (posScannerInstance && isPosScanning) {
    try {
      await posScannerInstance.stop();
      posScannerInstance.clear();
    } catch (err) {}
    isPosScanning = false;
  }
}

function handleScanResult(code, isPos) {
  playBeepSound(960, 0.18);
  showToast('Barcode / QR Scanned: ' + code, 'info');

  const addProdModal = document.getElementById('modal-add-product');
  if (addProdModal && !addProdModal.classList.contains('hidden')) {
    const barcodeInput = document.getElementById('prod-barcode');
    if (barcodeInput) barcodeInput.value = code;
    if (!isPos) closeUniversalScanner();
    if (isPos) closePosCamera();
    return;
  }

  const matchedProduct = appState.products.find(
    p => p.barcode === code || p.id === code || p.name.toLowerCase() === code.toLowerCase()
  );

  if (matchedProduct) {
    if (appState.activeView === 'pos' || isPos) {
      addToCart(matchedProduct.id);
      showToast('Added ' + matchedProduct.name + ' to checkout cart!', 'success');
      if (isPos) closePosCamera();
      if (!isPos) closeUniversalScanner();
      return;
    }

    if (appState.activeView === 'inventory') {
      const searchInput = document.getElementById('inv-search-input');
      if (searchInput) {
        searchInput.value = matchedProduct.barcode;
        appState.filters.inventorySearch = matchedProduct.barcode;
        window.dispatchEvent(new CustomEvent('app-stock-updated'));
      }
      if (!isPos) closeUniversalScanner();
      return;
    }

    const posTab = document.querySelector('.nav-tab[data-view="pos"]');
    if (posTab) posTab.click();
    setTimeout(() => {
      addToCart(matchedProduct.id);
      showToast('Added ' + matchedProduct.name + ' to checkout cart!', 'success');
    }, 200);
    if (!isPos) closeUniversalScanner();
    return;
  }

  if (appState.activeView === 'pos' || isPos) {
    const posInput = document.getElementById('pos-search-input');
    if (posInput) {
      posInput.value = code;
      appState.filters.posSearch = code;
      window.dispatchEvent(new CustomEvent('app-stock-updated'));
    }
  } else if (appState.activeView === 'inventory') {
    const invInput = document.getElementById('inv-search-input');
    if (invInput) {
      invInput.value = code;
      appState.filters.inventorySearch = code;
      window.dispatchEvent(new CustomEvent('app-stock-updated'));
    }
  }

  if (!isPos) closeUniversalScanner();
  if (isPos) closePosCamera();
}
