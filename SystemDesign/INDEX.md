# System Design Interview Roadmap

Every file in this folder after the first three follows one identical structure — the [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template) — so that by the time you've read three or four scenario files, you've internalized a repeatable pattern you can apply to a system you've never seen before, not just memorized answers to specific questions.

## Recommended Order

**Fundamentals (read these first, once):**
1. [System Design Fundamentals](01-System-Design-Fundamentals.md) — the 8-step template, capacity estimation, CAP theorem, ACID vs BASE, scaling trade-offs. Every scenario file below assumes you've read this.
2. [Scalability and Load Balancing](02-Scalability-Load-Balancing.md) — load balancer algorithms, CDNs, replication, sharding, high availability.
3. [Database Design for System Design Interviews](03-Database-Design.md) — the SQL/NoSQL decision and schema design at system-design altitude (SQL fundamentals themselves live in [Backend/Database](../Backend/Database/INDEX.md)).

**Scenarios (each is a complete, self-contained worked example of the template):**
4. [Design Twitter (Social Feed)](04-Design-Twitter-Social-Feed.md) — feed generation, push vs pull fan-out.
5. [Design Netflix (Video Streaming)](05-Design-Netflix-Video-Streaming.md) — adaptive bitrate streaming, recommendations.
6. [Design Uber/Ola (Ride-Hailing)](06-Design-Uber-Ride-Hailing.md) — geospatial matching, real-time location, surge pricing.
7. [Design an E-Commerce Platform](07-Design-E-Commerce-Platform.md) — preventing overselling, the checkout saga, SEO-driven rendering split.
8. [Design a Large File Upload System](08-Design-Large-File-Upload.md) — chunked resumable upload, direct-to-storage transfer, async processing.
9. [Design a Chat System (Slack/WhatsApp)](09-Design-Chat-System.md) — WebSocket fleet routing, message durability, group fan-out.
10. [Design Google Docs (Collaborative Editor)](10-Design-Google-Docs-Collaborative-Editor.md) — Operational Transformation, presence, offline merge.
11. [Design a URL Shortener](11-Design-URL-Shortener.md) — the classic "first" question: unique ID generation, redirect performance, 301 vs 302.

## What Mastery Looks Like

- You can run through all 8 template steps for a system you've never been asked about before, live, without freezing on "what do I say first."
- You can name the *one or two* genuinely hard problems in a given system instead of spending equal time on every component — every scenario file's Deep Dive sections model exactly this.
- You explicitly address the **frontend perspective** (step 6) every time — rendering strategy, real-time channel choice, optimistic UI, client state, failure handling — since skipping this is the most common gap for candidates who only prepare the backend half of the answer.
- You can state a design's core trade-off in one clear, specific sentence, not a vague "it depends."
- You expand every acronym and piece of jargon (DAU, QPS, TTL, CDN...) the first time you use it in an answer, out loud — an interviewer should never have to guess what you mean by a term you introduced yourself.

## Interview Answer Template (the 8 steps, compressed)

1. Clarify requirements (functional + non-functional).
2. Estimate scale (DAU → QPS → storage → bandwidth).
3. Define the core API and data model.
4. Draw the high-level architecture.
5. Deep-dive the 1-2 genuinely hard backend problems.
6. Address the frontend/client perspective explicitly.
7. Identify bottlenecks and their trade-offs.
8. Summarize the core trade-off in one sentence.

## Final Readiness Checklist

- [ ] Recite the 8-step template from memory and explain why the order matters.
- [ ] Derive a capacity estimate (DAU → QPS → storage → bandwidth) live for a made-up system.
- [ ] Explain CAP theorem's practical CP-vs-AP framing and ACID vs BASE, each with a real example.
- [ ] Explain load balancing algorithms, CDNs, replication, and sharding, and when each is the right fix for a named bottleneck.
- [ ] Work through at least 4 of the 7 scenario files unprompted, covering all 8 steps each, including the frontend perspective.
- [ ] For each scenario worked through, state its core trade-off in one sentence without notes.
- [ ] Cross-reference: connect at least one system design deep dive back to a Backend/Database or Frontend guide it builds on (e.g., the E-commerce inventory race condition back to the ACID isolation guide).

## Cross-Folder Connections

This folder is the "how do these pieces combine into a real product" layer sitting on top of the other folders — a system design deep dive frequently *is* a named concept from elsewhere in this repo, applied at scale:

- The E-commerce and Uber payment flows use the [idempotency](../Backend/Springboot/07-Common-Backend-Problems.md#4-idempotency) and [ACID isolation](../Backend/Database/04-ACID-Properties-and-Transactions.md) patterns directly.
- Every scenario's frontend section leans on the [React](../Frontend/React/INDEX.md) and [JavaScript](../Frontend/JavaScript/INDEX.md) folders — SSR/CSR choice, state management, debouncing, WebSocket handling.
- The chat system's and collaborative editor's fan-out problems are the same underlying pattern as Twitter's feed fan-out, just at different typical audience sizes — recognizing that connection across scenarios is itself a sign of real understanding, not rote memorization.
