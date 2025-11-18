# Bạn có thể chạy server bằng lệnh:
# python server.py
# Sau đó test POST request với curl hoặc Postman:
# curl -X POST http://localhost:8000/ota.json

from http.server import SimpleHTTPRequestHandler, HTTPServer
import json

class MyHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        # Chỉ xử lý POST request đến /ota.json
        if self.path != "/ota.json":
            self.send_error(404, "File not found")
            return

        try:
            # Đọc file OTA
            with open("ota.json", "rb") as f:
                data = f.read()

            # Trả về nội dung y hệt GET
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", len(data))
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self.send_error(404, "ota.json not found")

if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8000), MyHandler)
    print("Server running at http://localhost:8000")
    server.serve_forever()
