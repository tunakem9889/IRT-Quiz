# Adaptive Quiz Frontend

Frontend tĩnh hiển thị giao diện người dùng cho Adaptive Quiz và gọi API backend.

## Cấu trúc

```
frontend/
  index.html     # Trang HTML chính
  styles.css     # Giao diện
  frontend.js    # Logic gọi API và cập nhật UI
```

## Chạy frontend

1. Mở `index.html` trực tiếp trong trình duyệt **hoặc** phục vụ bằng web server tĩnh.
2. Thay đổi API base khi cần bằng cách đặt biến global trước khi nạp script:

```html
<script>
  window.ADAPTER_API_BASE = 'https://your-api-host';
</script>
<script src="./frontend.js"></script>
```

Mặc định script gọi `http://localhost:8000` (phù hợp khi backend chạy cục bộ).

## Tính năng
- Khởi tạo quiz với cấu hình max câu hỏi & stop SE.
- Hiển thị câu hỏi theo thời gian thực khi backend chọn.
- Cho phép nộp đáp án hoặc bỏ qua.
- Hiển thị θ, SE, tiến độ và kết quả cuối.
