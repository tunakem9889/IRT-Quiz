# Adaptive Quiz Backend (FastAPI)

FastAPI backend cung cấp API cho hệ thống Adaptive Quiz sử dụng IRT (2PL/3PL).

## Cấu trúc

```
backend/
  app/
    __init__.py       # Export FastAPI app
    main.py           # Entry point và định nghĩa endpoint
    irt.py            # Hàm IRT, cập nhật theta và thông tin
    schemas.py        # Pydantic models cho request/response
  data/
    questions.json    # Ngân hàng câu hỏi
  tests/
    test_api.py       # Script test thủ công
  requirements.txt    # Dependencies backend
```

## Cài đặt & chạy

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main  # hoặc: uvicorn app.main:app --reload
```

Server chạy mặc định tại `http://localhost:8000`:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Môi trường
default CORS mở (`allow_origins=['*']`). Khi deploy thực tế nên giới hạn domain.

## Testing

Server đang chạy → test thủ công:
```bash
python tests/test_api.py
python tests/test_api.py full
```

## Cấu hình

Các tham số quiz có thể truyền qua `POST /api/quiz/start`:
- `max_questions`: 3-50 (mặc định 10)
- `stop_se`: 0.05-1.5 (mặc định 0.35)
- `theta_clamp`, `newton_max_iter`, `newton_tol`, `newton_max_step`

Có thể thay đổi API base thông qua biến global `window.ADAPTER_API_BASE` ở frontend.
