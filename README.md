# ESP32 Web Flasher

A web-based tool for flashing firmware to ESP32 microcontrollers directly from your browser using the Web Serial API.

Have a look: [ESP32 Web Flasher](https://tienhuyiot.github.io/esp_web_flasher/)

## Features

- 🔌 Direct USB connection to ESP32 via Web Serial API
- 📁 Drag & drop firmware file upload (.bin files)
- 🚀 Flash firmware with progress tracking and speed monitoring
- 🗑️ Erase flash memory functionality
- 📊 Real-time connection status and chip information
- 🔄 Automatic device reset after flashing
- 🌐 Sample firmware selection
- 📝 Detailed logging and error reporting

## Project Structure

```text
esp_web_flasher/
├── index.html                    # Main HTML file (refactored)
├── styles.css                    # All CSS styles
├── scripts.js                    # Main JavaScript application logic
├── esp_web_flasher_portal.html   # Original single-file version
└── README.md                     # This file
```

## Usage

### Option 1: Using Local HTTP Server (Recommended)

1. **Open terminal** in the project directory
2. **Start HTTP server**:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using Live Server (VS Code extension)
   Right-click index.html → "Open with Live Server"
   ```
3. **Open browser** and navigate to `http://localhost:8000`
4. **Click on `index.html`** to use the modular version

### Option 2: Using Single File Version

1. **Open `esp_web_flasher_portal.html`** directly in browser
2. **This version has everything inline** and works with file:// protocol

## How to Flash Firmware

1. **Connect ESP32**: Click "🔌 Kết nối" button and select your ESP32 device

2. **Select firmware**:
   - Choose from sample firmware list, OR
   - Upload your own .bin file (drag & drop supported)

3. **Set flash address**: Enter the appropriate hex address based on your firmware type:
   - `0x000` - Merge-bin
   - `0x1000` - Bootloader
   - `0x8000` - Partition table
   - `0x10000` - Application (default)

4. **Flash firmware**: Click "🚀 Bắt đầu nạp" to start flashing

5. **Monitor progress**: Watch the progress bar and speed information

6. **Reset device**: Optionally reset ESP32 after successful flashing

## Flash Address Guide

Understanding the correct flash addresses is crucial for successful firmware flashing:

| Address    | Purpose              | Description                                    |
|------------|---------------------|------------------------------------------------|
| `0x1000`   | Bootloader          | ESP32 bootloader binary                       |
| `0x8000`   | Partition table     | Partition layout configuration                 |
| `0x10000`  | Application         | Main application firmware (default)           |

### Important Notes

- **Most common use case**: Flash your application firmware to `0x10000`
- **Complete firmware**: If flashing a complete ESP-IDF project, you may need multiple files at different addresses
- **Address validation**: The tool automatically validates hex format and reasonable address ranges
- **Sector alignment**: Addresses should ideally be aligned to 4KB boundaries (0x1000 multiples)

## Requirements

- **Browser**: Chrome 89+ or Edge 89+ (Web Serial API support required)
- **Connection**: HTTPS or localhost (for security requirements)
- **Drivers**: USB-to-Serial drivers (CP2102, CH340, etc.)
- **Hardware**: ESP32 development board with USB connection

## Troubleshooting

### Common Issues

1. **"Web Serial API not supported"**
   - Use Chrome/Edge 89+
   - Ensure page is served over HTTPS or localhost

2. **"Failed to open serial port"**
   - Close Arduino IDE, PlatformIO, or other serial monitors
   - Unplug and reconnect ESP32 USB cable
   - Try different USB port
   - Check USB-to-Serial drivers

3. **"CORS Policy Error" / "Cross origin requests blocked"**
   - **Problem**: Opening file directly with file:// protocol
   - **Solution**: Use one of these methods:
     - Use Live Server extension in VS Code
     - Run `python -m http.server 8000` in project directory
     - Use `esp_web_flasher_portal.html` (single-file version)

### Driver Installation

- **CP2102/CP2104**: [Silicon Labs Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
- **CH340/CH341**: [WCH Drivers](http://www.wch.cn/downloads/CH341SER_EXE.html)

## Development

### File Structure

- **index.html**: Clean HTML structure with external references
- **styles.css**: All styling including responsive design and themes
- **scripts.js**: ES6 module with all application logic

### Key Dependencies

- [esptool-js](https://github.com/espressif/esptool-js): ESP32 flashing library
- [esptool-js-doc](https://espressif.github.io/esptool-js/docs/index.html): Javascript implementation of esptool
- [crypto-js](https://github.com/brix/crypto-js): MD5 hash calculation
- Web Serial API: Browser API for serial communication

### Running Locally

For development, use a local HTTP server to avoid CORS issues:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using Live Server (VS Code extension)
Right-click index.html → "Open with Live Server"
```

Then navigate to `http://localhost:8000`

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 89+     | ✅ Full |
| Edge    | 89+     | ✅ Full |
| Firefox | Any     | ❌ No Web Serial API |
| Safari  | Any     | ❌ No Web Serial API |

## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:

- Check the troubleshooting section above
- Review browser console for error messages
- Ensure all requirements are met
- Try the official [ESP Web Tools](https://espressif.github.io/esptool-js/)