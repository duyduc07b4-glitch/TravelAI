#!/bin/bash
cd "$(dirname "$0")"
echo "Đang mở AI Travel Companion tại http://localhost:8765/app.html"
echo "(Để tắt server, đóng cửa sổ Terminal này)"
open "http://localhost:8765/app.html"
python3 -m http.server 8765
