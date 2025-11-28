# Adaptive Quiz Frontend

Frontend tĩnh hiển thị giao diện người dùng cho Adaptive Quiz và gọi API backend.

## Cấu trúc (MPA)

```
frontend/
├── css/
│   └── global.css       # Shared styles
├── js/
│   └── common.js        # Shared utilities
├── pages/
│   ├── home/            # Trang chủ
│   ├── dashboard/       # Trang Dashboard
│   └── quiz/            # Trang Luyện tập
```

## Chạy frontend

1. Mở `pages/home/index.html` trực tiếp trong trình duyệt **hoặc** phục vụ bằng web server tĩnh.
2. Thay đổi API base khi cần bằng cách đặt biến global trước khi nạp script `common.js`:

```html
<script>
  window.ADAPTER_API_BASE = "https://your-api-host";
</script>
<script src="../../js/common.js"></script>
```

Mặc định script gọi `http://localhost:8000` (phù hợp khi backend chạy cục bộ).

## Tính năng

- **Trang chủ**: Giới thiệu và điều hướng.
- **Dashboard**: Xem lịch sử làm bài và thống kê năng lực.
- **Luyện tập**:
  - Khởi tạo quiz với cấu hình max câu hỏi & stop SE.
  - Hiển thị câu hỏi theo thời gian thực khi backend chọn.
  - Cho phép nộp đáp án hoặc bỏ qua.
  - Hiển thị θ, SE, tiến độ và kết quả cuối.
