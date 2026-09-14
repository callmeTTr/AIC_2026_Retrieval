# AIC 2026 — DRES Rehearsal Checklist

Gold set:
`docs/rehearsal/gold-set.json`

Mục tiêu của checklist này là kiểm tra nhanh toàn bộ đường đi:

Retrieval → Frontend → Submission → DRES Bridge → DRES

Không dùng DRES Run ID cố định trong tài liệu này.

---

## 0. Pre-flight

Trước khi test:

- DRES đang chạy tại local.
- DRES Bridge đang chạy single-worker.
- Frontend đang chạy.
- Kaggle retrieval backend đang online.
- Frontend đã Connect DRES thành công.
- Đã chọn đúng Evaluation Run.
- Current Task hiển thị đúng.

PASS khi:
- Không có lỗi session.
- Không có `Invalid bridge token`.
- Current task đọc được từ DRES.

---

## 1. GOLD-01 — KIS

Gold data:

- Video: `L21_V001`
- Frame: `23460`
- FPS: `30`
- Expected timestamp: `782.000s`
- Ground truth interval: `772s → 785s`

### Test A — Manual KIS

1. Chọn KIS submission mode.
2. Submit:
   - Video ID: `L21_V001`
   - Frame: `23460`
   - FPS: `30`
3. Kiểm tra calculated timestamp là khoảng `782.000s`.
4. Submit sang DRES.

PASS:
- DRES nhận `L21_V001`.
- Timestamp nằm trong ground truth interval.
- DRES trả `CORRECT`.

### Test B — Search-result submission

Nếu retrieval có result phù hợp:

1. Chọn đúng result/frame.
2. Submit trực tiếp từ Result Card hoặc Candidate Tray.
3. Không nhập lại FPS/timestamp bằng tay.

PASS:
- Frontend ưu tiên `frame_timestamp_seconds`.
- Nếu field này thiếu, frontend dùng `frame_index / fps`.
- Chỉ fallback sang `timestamp_seconds` khi không còn frame timestamp/FPS.
- DRES nhận đúng video và thời gian.

---

## 2. GOLD-02 — QA

Gold answer:

`42`

1. Mở QA task.
2. Chọn Auto hoặc QA submission mode.
3. Nhập answer: `42`.
4. Submit.

PASS:
- Payload chỉ chứa textual answer.
- Không thêm media item.
- Không thêm temporal answer.
- DRES nhận submission.
- Sau khi judge, kết quả là `CORRECT`.

---

## 3. GOLD-03 — TRAKE Transport

Lưu ý:

DRES local hiện không có native TRAKE preset.

Test này sử dụng KIS temporal task làm transport surrogate.

Gold events:

1. `L21_V001 @ 111s`
2. `L21_V001 @ 222s`
3. `L21_V001 @ 333s`

1. Mở KIS transport run.
2. Override submission mode thành TRAKE.
3. Nhập đủ 3 events theo đúng thứ tự.
4. Submit.

PASS:
- Frontend giữ thứ tự `111 → 222 → 333`.
- Bridge nhận đủ 3 events.
- Bridge không sort/reorder.
- DRES nhận multi-temporal submission.

`WRONG` từ DRES là chấp nhận được trong test này vì timestamps không phải ground truth của KIS surrogate.

WRONG != transport failure.

---

## 4. Multi-account smoke test

Dùng hai participant account thuộc cùng team.

1. Account A connect DRES.
2. Account B connect DRES.
3. Cả hai chọn cùng Evaluation Run.
4. Xác nhận cả hai thấy cùng Current Task.
5. Disconnect Account A.
6. Account B refresh/save run.

PASS:
- Account A disconnect thành công.
- Account B vẫn connected.
- Account B vẫn đọc được Current Task.
- Không có `Invalid bridge token`.

---

## 5. Final PASS criteria

Rehearsal được coi là PASS khi:

- KIS CORRECT.
- QA CORRECT sau judging.
- TRAKE giữ đúng event order và transport thành công.
- Exact frame timestamp không bị đổi thành ASR/playback timestamp.
- Multi-account session không overwrite nhau.
- Disconnect một account không làm mất session account khác.
- Không có frontend build error.
- Không có bridge/DRES transport error.

Nếu một mục fail:
Không sửa nhiều thứ cùng lúc.
Xác định đúng layer trước:

Retrieval
→ SearchResult normalization
→ Candidate
→ Submission adapter
→ DRES Bridge
→ DRES