# Adaptive Quiz (IRT 2PL/3PL)

> Hệ thống quiz thích ứng sử dụng Item Response Theory với backend FastAPI và frontend tĩnh.

## Cấu trúc thư mục

```
backend/
  app/              # Mã nguồn FastAPI
  data/             # Ngân hàng câu hỏi
  tests/            # Script test API
  requirements.txt  # Dependencies backend

frontend/
  index.html        # Giao diện người dùng
  styles.css
  frontend.js

README.md           # (tài liệu này)
```

Chi tiết cụ thể cho từng phần nằm tại `backend/README.md` và `frontend/README.md`.

## Chạy nhanh

1. **Backend:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

2. **Frontend:** mở `frontend/index.html` trong trình duyệt. Nếu backend chạy port khác, đặt `window.ADAPTER_API_BASE` trước khi nạp `frontend.js`.

## Tóm tắt IRT

- **2PL:** `P(θ) = 1 / (1 + exp(-a(θ - b)))`
- **3PL:** `P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))`
- Cập nhật θ sử dụng MAP với prior chuẩn N(0,1), giải bằng Newton-Raphson (giới hạn bước, clamp θ).
- Chọn câu theo Maximum Fisher Information (top-k, ngẫu nhiên trong top 5).
- Điều kiện dừng: đạt `max_questions` hoặc `SE <= stop_se` (và đã trả lời ≥ 3 câu).

## Lưu ý triển khai

- Sessions lưu tạm thời trong bộ nhớ (phù hợp demo); khi deploy nên thay bằng database/redis.
- CORS mở để tiện thử nghiệm; production nên giới hạn domain.
- Ngân hàng câu hỏi nằm ở `backend/data/questions.json`. Có thể thay thế bằng API/DB khác.



