// ESP32 Web Flasher JavaScript
import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@0.5.4/bundle.js";

// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const flashBtn = document.getElementById('flashBtn');
const eraseBtn = document.getElementById('eraseBtn');
const fileInput = document.getElementById('fileInput');
const fileDrop = document.getElementById('fileDrop');
const browseBtn = document.getElementById('browseBtn');
const fileName = document.getElementById('fileName');
const firmwareList = document.getElementById('firmwareList');
const progressBar = document.querySelector('#progress > i');
const percentEl = document.getElementById('percent');
const logEl = document.getElementById('log');
const chipInfoEl = document.getElementById('chipInfo');
const speedInfo = document.getElementById('speedInfo');
const clearLogBtn = document.getElementById('clearLogBtn');
const openOfficialBtn = document.getElementById('openOfficialBtn');
const flashAddressInput = document.getElementById('flashAddress');

// Global Variables
let device = null;
let transport = null;
let esploader = null;
let chip = null;
let consoleBaudrate = 115200;
let selectedFile = null;
let startTime = 0;

// Serial library compatibility
const serialLib = !navigator.serial && navigator.usb ? serial : navigator.serial;

// Check if modules loaded correctly
console.log('ESPLoader:', typeof ESPLoader);
console.log('Transport:', typeof Transport);

// ESP Loader Terminal Interface
const espLoaderTerminal = {
    clean() {
        logEl.textContent = 'Log đã được xóa.';
    },
    writeLine(data) {
        log(data);
    },
    write(data) {
        log(data);
    },
};

// Utility Functions
function log(...args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logEl.textContent += `\n[${timestamp}] ${message}`;
    logEl.scrollTop = logEl.scrollHeight;
    console.log(...args);
}

function setProgress(percentage, bytesWritten = 0, totalBytes = 0) {
    progressBar.style.width = percentage + '%';
    percentEl.textContent = percentage + '%';
    
    if (bytesWritten && totalBytes && startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = (bytesWritten / elapsed / 1024).toFixed(1);
        const remaining = totalBytes - bytesWritten;
        const eta = remaining / (bytesWritten / elapsed);
        speedInfo.textContent = `${speed} KB/s - ETA: ${eta.toFixed(0)}s`;
    }
}

function updateConnectionStatus(connected, chipName = '') {
    const indicator = chipInfoEl.querySelector('.status-indicator');
    if (connected) {
        indicator.className = 'status-indicator status-connected';
        chipInfoEl.innerHTML = `<span class="status-indicator status-connected"></span>Kết nối: ${chipName}`;
    } else {
        indicator.className = 'status-indicator status-disconnected';
        chipInfoEl.innerHTML = `<span class="status-indicator status-disconnected"></span>Chưa kết nối`;
    }
}

function enableControls(connected) {
    flashBtn.disabled = !connected || !selectedFile;
    eraseBtn.disabled = !connected;
    disconnectBtn.disabled = !connected;
    connectBtn.disabled = connected;
}

function handleFileSelect(file) {
    if (!file) return;
    
    if (!file.name.endsWith('.bin')) {
        alert('Chỉ chấp nhận file .bin');
        return;
    }
    
    if (file.size > 16 * 1024 * 1024) {
        alert('File quá lớn (> 16MB)');
        return;
    }
    
    selectedFile = file;
    fileName.textContent = `📁 ${file.name} (${(file.size/1024/1024).toFixed(2)}MB)`;
    log(`Đã chọn file: ${file.name}`);
    
    if (esploader) {
        flashBtn.disabled = false;
    }
}

function readUploadedFileAsBinaryString(inputFile) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new DOMException("Problem parsing input file."));
        };

        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsBinaryString(inputFile);
    });
}

function parseFlashAddress(addressStr) {
    // Remove whitespace and convert to lowercase
    addressStr = addressStr.trim().toLowerCase();
    
    // Check if it starts with 0x
    if (!addressStr.startsWith('0x')) {
        throw new Error('Địa chỉ flash phải bắt đầu bằng "0x" (ví dụ: 0x10000)');
    }
    
    // Remove 0x prefix and validate hex format
    const hexStr = addressStr.slice(2);
    if (!/^[0-9a-f]+$/.test(hexStr)) {
        throw new Error('Địa chỉ flash chứa ký tự không hợp lệ. Chỉ được phép sử dụng 0-9, A-F');
    }
    
    // Convert to integer
    const address = parseInt(addressStr, 16);
    
    // Validate address range (should be reasonable for ESP32)
    if (address < 0 || address > 0x400000) { // 4MB max
        throw new Error('Địa chỉ flash không hợp lệ (0x0 - 0x400000)');
    }
    
    // Check alignment (should be divisible by 4096 for flash sectors)
    if (address % 4096 !== 0) {
        log(`⚠️ Cảnh báo: Địa chỉ ${addressStr} không căn chỉnh với sector (4KB). Khuyến nghị sử dụng địa chỉ chia hết cho 0x1000`);
    }
    
    return address;
}

// Event Listeners
browseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

// Drag & Drop
fileDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDrop.classList.add('dragover');
});

fileDrop.addEventListener('dragleave', (e) => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
});

fileDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// Flash address input validation
flashAddressInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    
    // Reset styles
    e.target.style.borderColor = '';
    e.target.style.backgroundColor = '';
    
    if (value === '') {
        e.target.style.borderColor = '#ef4444';
        return;
    }
    
    try {
        parseFlashAddress(value);
        // Valid address
        e.target.style.borderColor = '#10b981';
        e.target.style.backgroundColor = '#f0fdf4';
    } catch (error) {
        // Invalid address
        e.target.style.borderColor = '#ef4444';
        e.target.style.backgroundColor = '#fef2f2';
    }
});

// Add some common flash addresses as suggestions
flashAddressInput.addEventListener('focus', (e) => {
    if (!e.target.hasAttribute('data-initialized')) {
        e.target.setAttribute('data-initialized', 'true');
        e.target.setAttribute('title', 'Địa chỉ thông dụng:\n0x1000 - Bootloader\n0x8000 - Partition table\n0x10000 - Application (mặc định)\n0x110000 - OTA app partition');
    }
});

// Connection
connectBtn.addEventListener('click', async () => {
    try {
        log('Đang yêu cầu kết nối thiết bị...');
        if (device === null) {
            device = await serialLib.requestPort({});
            transport = new Transport(device, true);
        }

        const loaderOptions = {
            transport: transport,
            baudrate: consoleBaudrate,
            terminal: espLoaderTerminal,
            debugLogging: false,
        };

        esploader = new ESPLoader(loaderOptions);
        chip = await esploader.main();
        
        const chipName = esploader.chip.CHIP_NAME || 'ESP32';
        const flashSize = esploader.flash_size ? `${(esploader.flash_size / (1024*1024)).toFixed(1)}MB` : 'Unknown';
        
        log(`Kết nối thành công với ${chipName}`);
        log(`Flash size: ${flashSize}`);
        
        updateConnectionStatus(true, `${chipName} (${flashSize})`);
        enableControls(true);
        
    } catch (err) {
        log('Lỗi kết nối:', err.message);
        alert('Lỗi kết nối: ' + err.message);
        updateConnectionStatus(false);
        enableControls(false);
    }
});

disconnectBtn.addEventListener('click', async () => {
    if (transport) await transport.disconnect();

    esploader = null;
    device = null;
    transport = null;
    chip = null;
    
    log('Đã ngắt kết nối');
    updateConnectionStatus(false);
    enableControls(false);
    setProgress(0);
    speedInfo.textContent = 'Tốc độ: --';
});

// Erase flash
eraseBtn.addEventListener('click', async () => {
    if (!esploader) return alert('Chưa kết nối thiết bị');
    
    if (!confirm('Bạn có chắc muốn xóa toàn bộ flash memory?')) return;
    
    try {
        log('Bắt đầu xóa flash memory...');
        setProgress(0);
        
        await esploader.erase_flash();
        
        setProgress(100);
        log('Xóa flash thành công!');
        
    } catch (err) {
        log('Lỗi xóa flash:', err.message);
        alert('Lỗi: ' + err.message);
    }
});

// Flash firmware
flashBtn.addEventListener('click', async () => {
    if (!esploader) return alert('Chưa kết nối thiết bị');
    if (!selectedFile) return alert('Chưa chọn file firmware');
    
    try {
        log(`Bắt đầu nạp firmware: ${selectedFile.name}`);
        setProgress(0);
        startTime = Date.now();
        
        let fileData = await readUploadedFileAsBinaryString(selectedFile);
        log(`Đã đọc file: ${fileData.length} bytes`);
        
        // Parse flash address from input
        let flashAddress;
        try {
            flashAddress = parseFlashAddress(flashAddressInput.value);
            log(`Địa chỉ flash: ${flashAddressInput.value} (${flashAddress})`);
        } catch (error) {
            alert('Lỗi địa chỉ flash: ' + error.message);
            return;
        }

        const fileArray = [];
        fileArray.push({ data: fileData, address: flashAddress });

        const flashOptions = {
            fileArray: fileArray,
            flashSize: "keep",
            eraseAll: false,
            compress: true,
            reportProgress: (fileIndex, written, total) => {
                const progress = Math.round((written / total) * 100);
                setProgress(progress, written, total);
            },
            calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
        };
        await esploader.writeFlash(flashOptions);
        
        setProgress(100);
        log('Nạp firmware thành công!');
        log('Bạn có thể reset ESP32 để chạy firmware mới');
        
        // Reset the device
        if (confirm('Nạp thành công! Bạn có muốn reset ESP32 không?')) {
            try {
                if (transport) {
                    await transport.disconnect();
                }
                await transport.connect(consoleBaudrate);
                await transport.setDTR(false);
                await new Promise(resolve => setTimeout(resolve, 100));
                await transport.setDTR(true);
                log('Đã reset ESP32');
            } catch (resetErr) {
                log('Không thể reset tự động, vui lòng reset thủ công');
            }
        }
        
    } catch (err) {
        log('Lỗi nạp firmware:', err.message);
        alert('Lỗi nạp firmware: ' + err.message);
    }
});

// Sample firmware selection
firmwareList.addEventListener('change', async (e) => {
    const selected = e.target.value;
    if (!selected) return;
    
    log(`Đang tải firmware mẫu: ${selected}`);
    
    // Create a sample firmware file (just for demo)
    const sampleData = new Uint8Array(1024); // 1KB sample
    sampleData.fill(0xFF); // Fill with 0xFF (typical for flash)
    
    const blob = new Blob([sampleData], { type: 'application/octet-stream' });
    const file = new File([blob], `${selected}.bin`, { type: 'application/octet-stream' });
    
    handleFileSelect(file);
    
    // Reset selection
    e.target.value = '';
});

// Clear log
clearLogBtn.addEventListener('click', () => {
    logEl.textContent = 'Log đã được xóa.';
});

// Open official tool
openOfficialBtn.addEventListener('click', () => {
    window.open('https://espressif.github.io/esptool-js/', '_blank');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    log('ESP32 Web Flasher đã sẵn sàng');
    log('Hãy kết nối ESP32 và chọn file firmware để bắt đầu');

    // Check if running from file:// protocol
    if (window.location.protocol === 'file:') {
        log('⚠️ Cảnh báo: Đang chạy từ file://');
        log('💡 Khuyến nghị: Sử dụng Live Server hoặc HTTP server để tránh lỗi CORS');
    }
});