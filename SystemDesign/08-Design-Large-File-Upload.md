# Design a Large File Upload System (e.g., a 5GB Video/Image Upload)

Same [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). This scenario is deliberately different in shape from the others in this folder — there's no huge fleet of concurrent users to shard for; the hard problem is a single very large transfer that must survive real-world network unreliability without restarting from zero, without ever making your own application server the bottleneck for the data itself.

## 1. Clarify Requirements

**Functional:** upload a large file (up to, say, 5GB), show real upload progress, resume an interrupted upload without restarting, process the file after upload (virus scan, thumbnail/transcode generation), notify the user when processing completes.

**Non-functional:** What's the realistic upload environment? (Mobile networks and flaky Wi-Fi are the actual design constraint — a reliable office network wouldn't make this an interesting problem.) Must uploads be resumable across a full app restart/device reboot, or just a brief network drop? (This answer determines whether upload state needs to persist to disk client-side or can live in memory.) Does the file need to be available immediately, or is "processing, check back shortly" acceptable? (Acceptable — this is what justifies an async pipeline instead of a synchronous processing step.)

## 2. Estimate Scale

- A single 5GB file, at a realistic sustained mobile upload speed of ~5 Mbps (0.625 MB/s), takes roughly 8,000 seconds (over 2 hours) to transfer uninterrupted — which makes "assume the network stays up for 2 hours straight" an unrealistic assumption to design around, and is the actual number that justifies everything in the deep dive below.
- Chunking at 5-10MB per chunk means ~500-1,000 chunks for a 5GB file — small enough that losing and retrying any single chunk costs seconds, not hours.
- Storage: at any real scale, uploaded file storage is object storage (S3-class), not a traditional filesystem or a database `BLOB` column — sized in the same way any object storage capacity is, not a special case.

## 3. Core API and Data Model

```text
POST /uploads/initiate        {filename, size, contentType, checksum}  → uploadId, presigned chunk URLs (or a presigned session)
PUT  /uploads/{id}/chunks/{n}  <chunk bytes>                            → chunk ETag (uploaded DIRECTLY to storage, not through your app server)
POST /uploads/{id}/complete    {chunkETags: [...]}                     → fileId, status=PROCESSING
GET  /files/{id}/status                                                → PROCESSING | READY | FAILED
```

```sql
uploads(upload_id PK, user_id, filename, total_size, status, checksum, created_at)
upload_chunks(upload_id FK, chunk_number, etag, uploaded_at, PRIMARY KEY(upload_id, chunk_number))
```

Tracking chunk-level state in `upload_chunks` is what makes resumability possible server-side — on reconnect, the client asks "which chunks do you already have," and only uploads what's missing.

## 4. High-Level Architecture

```text
Client ──(chunk PUT requests, direct)──► Object Storage (S3), via presigned URLs
   │
   └──(control-plane calls only: initiate/status/complete)──► API Server ──► Upload metadata DB
                                                                    │
                                                                    └──► Message Queue ──► Processing Workers
                                                                                              (virus scan, transcode,
                                                                                               thumbnail, checksum verify)
                                                                                              ──► CDN-fronted final storage
                                                                                                  (CDN = Content Delivery Network)
```

The single most important architectural decision here: **the actual file bytes never pass through your application server at all** — the client uploads each chunk directly to object storage using a short-lived presigned URL your API issues, and your server only ever handles small control-plane requests (initiate, status, complete). This is what keeps your own infrastructure's bandwidth and memory usage completely decoupled from how many large files are uploading concurrently.

## 5. Deep Dive 1: Chunked, Resumable Upload

Splitting the file into independently-uploadable chunks (5-10MB each, matching S3's multipart upload API, which requires this exact shape) means a dropped connection only costs the one chunk that was in flight, not the whole transfer.

```text
Client-side upload loop:
  1. Split the file into N chunks (File.slice() in the browser)
  2. For each chunk NOT already confirmed uploaded:
       upload it directly to its presigned URL
       record the returned ETag
       report progress = (chunks done / total chunks)
  3. On ANY chunk failure: retry that chunk with backoff — never restart the whole file
  4. Once ALL chunks are confirmed, call /uploads/{id}/complete with the full ETag list,
     which tells the storage service to assemble them into the final object
```

**Why this specific design survives a full app restart, not just a network blip:** the client persists its upload state (which chunks are done, their ETags) to local storage — `IndexedDB` for something this size, not `localStorage`'s small string-only capacity — so if the browser tab or device restarts entirely mid-upload, the client can query `GET /uploads/{id}` for which chunks the server already has confirmed, diff that against its own local record, and resume uploading only the genuinely missing chunks. This is the real distinction between "resumable across a network drop" and "resumable across anything, including the app closing," and it's worth stating explicitly which guarantee you're actually building for.

## 6. Deep Dive 2: Post-Upload Processing Pipeline

Once all chunks are assembled into the final object in storage, the file isn't necessarily usable yet — it may need a virus scan before it's trusted, a transcode into multiple formats/resolutions (for video), or a thumbnail generated (for an image) — and none of this should happen synchronously in the request that marked the upload complete, since it can take much longer than any reasonable HTTP timeout.

```text
On upload completion:
  1. Verify the uploaded object's checksum matches the one declared at initiate time
     (catches silent corruption during transfer)
  2. Publish an event to a message queue: "file uploaded, needs processing"
  3. Worker pool picks up the event:
       - virus/malware scan
       - for video: transcode to multiple resolutions (the same multi-quality shape as
         the streaming platform's adaptive bitrate content — see the Netflix design)
       - for image: generate thumbnails at standard sizes
  4. On success: mark status=READY, notify the user (push/websocket/email)
  5. On failure: mark status=FAILED with a reason, allow re-upload or a scoped retry
```

The client polls (or subscribes to) `GET /files/{id}/status` rather than assuming the file is ready the instant the upload API call returns — this asynchronous "uploaded, then processing, then ready" state machine is the direct analog of the ride-hailing and e-commerce order state machines elsewhere in this folder, applied to a file's lifecycle instead of a ride's or an order's.

## 7. Frontend Perspective

This scenario is unusually frontend-heavy for a system design question, and it's covered in full implementation depth (presigned URLs, the exact chunking code, progress reporting via `XMLHttpRequest.upload.onprogress`) in the [Frontend System Design Scenarios guide](../Frontend/React/13-Frontend-System-Design-Scenarios.md#9-file-upload-at-scale) — the summary relevant to a system design interview:

- **Rendering strategy:** irrelevant here — this is a client-side interaction problem (a widget inside an app), not a page-rendering problem.
- **Real-time channel:** status updates (`PROCESSING → READY`) are a good fit for polling every few seconds, or a lightweight WebSocket/SSE push if the app already has one open for other reasons — a persistent connection solely for this would be overkill for something that finishes in seconds to minutes.
- **Optimistic UI:** none appropriate here — the upload's actual progress must reflect real bytes transferred, not an assumed instant success; a progress bar is the correct UI primitive precisely because this operation is neither instant nor safely fakeable.
- **Client-side state:** upload progress and chunk-completion state need to survive a page refresh for a transfer this large — `IndexedDB`, not component state alone, as covered in the deep dive above.
- **Failure/offline handling:** a dropped network mid-chunk should pause and visibly indicate "waiting for connection," retrying automatically once connectivity returns, rather than failing the entire upload outright.

## 8. Bottlenecks and Trade-offs

- **Your own server's bandwidth** — eliminated as a concern entirely by direct-to-storage upload via presigned URLs; this is the single highest-leverage decision in the whole design.
- **Processing pipeline latency** — a large video transcode can take real minutes; the trade-off is accepting "uploaded" and "ready to use" as two distinct, separately-communicated states rather than pretending the file is instantly usable.
- **Chunk size trade-off** — smaller chunks mean more resumability granularity (less re-upload cost after a drop) but more request overhead; larger chunks mean less overhead but more re-upload cost per failure. 5-10MB is the practical middle ground most real systems converge on.
- **Duplicate uploads of the same file** — a content hash (checksum) computed client-side before upload can be checked against already-stored files, letting the system skip a redundant multi-gigabyte transfer entirely if the exact same file was already uploaded by anyone — a real, valuable optimization worth mentioning even though it's not required for correctness.

## 9. Trade-off Summary

This design's core decision is **removing your own application server from the data path entirely** — the client talks directly to object storage for the actual bytes, and your server only orchestrates small control-plane calls and async post-processing — trading a bit of client-side complexity (chunking, resumability, presigned URL handling) for infrastructure that doesn't buckle under concurrent multi-gigabyte transfers, which it otherwise would if every byte had to flow through your own servers first.

## Interview Questions and Answers

### 1. Why should large file bytes never pass through your own application server?

**Answer:** Routing gigabytes of data through your server ties up a request for the entire transfer duration and makes your server's own bandwidth and memory the bottleneck for every concurrent upload. Issuing a short-lived presigned URL and letting the client upload directly to object storage removes that bottleneck entirely — your server only ever handles small control-plane requests.

### 2. Why chunk the upload instead of sending the whole 5GB file in one request?

**Answer:** A single request-scale transfer that fails partway through (a very likely outcome over a real, unreliable network across a multi-hour transfer) forces a full restart. Splitting into independently-uploadable chunks means a failure only costs the one chunk in flight, and object storage's own multipart upload APIs are explicitly built around this exact chunked shape.

### 3. What's the actual difference between "resumable across a network drop" and "resumable across an app restart," and why does it matter which one you design for?

**Answer:** Surviving a network drop only requires in-memory retry logic for the current session. Surviving a full app restart or device reboot requires the client to persist upload progress (which chunks are confirmed, their ETags) to durable local storage like IndexedDB, and to reconcile that against the server's own record of confirmed chunks on resume. Stating which guarantee you're actually building for is a meaningful, gradable design decision, not a detail to gloss over.

### 4. Why shouldn't file processing (virus scan, transcoding) happen synchronously as part of the upload-completion request?

**Answer:** Processing a large file — especially transcoding video — can take real minutes, far longer than any reasonable HTTP request timeout. Publishing an event to a queue and letting background workers process it asynchronously, with the client polling or subscribing for a status change, is the only approach that doesn't force the upload-completion request itself to hang for however long processing takes.

### 5. How would you avoid re-uploading a multi-gigabyte file that's already been uploaded before (by anyone)?

**Answer:** Compute a content checksum client-side before starting the upload and check it against already-stored files' checksums; if it matches, the system can skip the actual data transfer entirely and just reference the existing stored object. This is a real, valuable deduplication optimization once you're operating at any meaningful scale.

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It removes the application server from the file-transfer data path entirely, trading a meaningful amount of client-side complexity (chunking, resumability, presigned URL orchestration) for backend infrastructure that scales independently of how many large uploads are happening concurrently.

## Revision Checklist

- [ ] Walk through all 8 template steps for a large file upload system unprompted.
- [ ] Explain why direct-to-storage upload via presigned URLs is the single highest-leverage architectural decision here.
- [ ] Explain chunked resumable upload, including the chunk-size trade-off.
- [ ] Explain the difference between network-drop resumability and full-restart resumability, and what each requires client-side.
- [ ] Design the async post-upload processing pipeline and its status state machine.
- [ ] Explain content-hash deduplication as a real optimization.
- [ ] State this design's core trade-off in one clear sentence.
