# AIC 2026 Retrieval — Original Video Playback Integration

## 1. Mục tiêu

Một frame có tên:

```text
L21_V002_t00005.600_f00000168_s000001.jpg
```

được chuẩn hóa thành:

```json
{
  "video_id": "L21_V002",
  "timestamp_seconds": 5.6,
  "frame_index": 168,
  "shot_id": 1
}
```

Backend Kaggle tìm video gốc tương ứng, trả `video_url` và
`video_available`, hỗ trợ HTTP Range, còn frontend mở video và seek bằng:

```ts
video.currentTime = result.timestamp_seconds;
```

## 2. Kiến trúc

```text
ResultCard
  -> SearchResult.video_url + timestamp_seconds
  -> VideoPlayerModal
  -> GET /api/v1/videos/{video_id}/stream
  -> HTTP 206 Partial Content
  -> browser seek đúng timestamp
```

Frontend không đọc raw response trực tiếp trong component:

```text
live server response
  -> frontend/src/features/search/search.api.ts
  -> SearchResult chuẩn
  -> ResultCard / VideoPlayerModal
```

## 3. File liên quan trong repository

```text
notebooks/kaggle/aic-testing-video-playback-complete.ipynb

frontend/src/services/apiClient.ts
frontend/src/features/search/search.api.ts
frontend/src/features/search/search.types.ts
frontend/src/features/results/ResultCard.tsx
frontend/src/features/results/ResultCard.css
frontend/src/features/video-player/VideoPlayerModal.tsx
frontend/src/features/video-player/VideoPlayerModal.css

scripts/smoke_test_video.py
```

File cũ đã bỏ:

```text
frontend/src/features/video-player/video.api.ts
```

Modal mới không gọi clip metadata trung gian. Nó dùng trực tiếp
`SearchResult.video_url` và `timestamp_seconds`.

## 4. Kaggle notebook

Notebook đã được cleanup trước khi commit:

- Xóa outputs.
- Reset `execution_count`.
- Bỏ cell lỗi `127.0.0.1`.
- Bỏ cell trống cuối notebook.
- Không hard-code ngrok token.

Kaggle Secrets cần có:

```text
NGROK_AUTH_TOKEN
```

Tuỳ chọn:

```text
NGROK_DOMAIN
```

Dataset mặc định:

```text
/kaggle/input/aic2025
```

Khi video nằm ở thư mục khác, set trước khi chạy backend cell:

```python
import os

os.environ["AIC_VIDEO_ROOT"] = (
    "/kaggle/input/<dataset-slug>/<video-folder>"
)
```

## 5. API chính

### Health

```text
GET /api/v1/health
```

### Rebuild video index

```text
POST /api/v1/videos/reindex
```

### Video metadata

```text
GET /api/v1/videos/{video_id}/info
```

### Video stream

```text
GET /api/v1/videos/{video_id}/stream
HEAD /api/v1/videos/{video_id}/stream
```

Range request ví dụ:

```http
Range: bytes=0-1023
```

Kết quả mong đợi:

```text
HTTP 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1023/<file-size>
Content-Length: 1024
```

### Search

```text
POST /api/v1/search
```

Notebook cũng giữ alias tương thích:

```text
POST /api/search
```

Search result phải có:

```text
video_id
timestamp_seconds
video_url
video_available
```

## 6. Frontend environment

File local:

```text
frontend/.env
```

Ví dụ:

```env
VITE_API_BASE_URL=https://<ngrok-domain>/api/v1
```

Không commit `.env`.

Restart Vite sau khi sửa `.env`.

## 7. Build frontend

```cmd
cd /d D:\AIC_2026_Retrieval\frontend
npm run build
```

## 8. Smoke test

Cài dependency trong backend virtual environment:

```cmd
cd /d D:\AIC_2026_Retrieval\backend
.venv\Scripts\python -m pip install httpx
```

Chạy từ repository root:

```cmd
cd /d D:\AIC_2026_Retrieval

backend\.venv\Scripts\python scripts\smoke_test_video.py ^
  --base-url https://<ngrok-domain>/api/v1 ^
  --video-id L21_V002 ^
  --query "three people playing a metal instrument"
```

Test kiểm tra lần lượt:

1. Health endpoint.
2. Video index lookup.
3. HTTP Range trả `206`.
4. Range body đúng 1024 bytes.
5. Search result có đủ playback fields.

## 9. Browser compatibility

HTTP Range hoạt động không đồng nghĩa mọi codec đều phát được trên browser.

Ưu tiên:

```text
MP4
H.264 video
AAC audio
```

Các container như MKV hoặc AVI có thể stream được nhưng browser vẫn có thể
báo decode error.

## 10. Git safety

Branch tích hợp hiện tại:

```text
feature/real-video-playback
```

Không stage:

```text
frontend/.env
frontend/node_modules/
frontend/dist/
backend/.env
backend/.venv/
**/__pycache__/
*.pyc
```

Trước commit:

```cmd
cd /d D:\AIC_2026_Retrieval

git diff --check
git status --short
git diff --cached --check
git diff --cached --stat
```

Task này nên được commit thành hai checkpoint:

1. Frontend original-video playback.
2. Kaggle notebook, integration guide và smoke test.

Sau khi test end-to-end với live Kaggle server, merge branch này vào:

```text
feature/live-retrieval-integration
```

Chưa merge trực tiếp vào `main`.
