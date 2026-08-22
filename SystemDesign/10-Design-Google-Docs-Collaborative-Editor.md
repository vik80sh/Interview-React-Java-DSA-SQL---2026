# Design Google Docs (Real-Time Collaborative Editor)

Same [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). This is the one scenario in this folder where the hard problem is almost purely algorithmic rather than infrastructural: when two people type in the same document at the same instant, what does the document actually look like a moment later, and how do you guarantee every collaborator's screen converges to the *same* answer without a central lock forcing them to take turns.

## 1. Clarify Requirements

**Functional:** multiple users edit the same document simultaneously, see each other's changes live, see each other's cursor position, view edit history, edit offline and merge back in on reconnect.

**Non-functional:** Must edits apply with zero perceived latency for the person typing? (Yes — this single answer rules out "wait for the server to confirm before showing the character" and is what makes local-first, eventually-reconciled editing the only viable approach.) Must two users' concurrent edits both survive, never silently overwriting each other? (Yes — this is the actual requirement the whole deep dive exists to satisfy.) Is a full linear edit history needed? (Usually yes, for "who changed what" and version restore.)

## 2. Estimate Scale

- Concurrent editors per document are typically small (a handful to a few dozen), even though total documents and total users are enormous (hundreds of millions of documents, tens of millions of DAU) — this is the opposite scale shape from every other file in this folder, and it's worth stating explicitly: the hard problem here is correctness under concurrency, not raw throughput.
- Each keystroke is a small operation (a few bytes); the aggregate edit-event rate across all active documents is real but modest compared to, say, a chat system's message volume, because a document's edit stream only has as many concurrent contributors as people are actually looking at it.

## 3. Core API and Data Model

```text
WebSocket, per-document "room":
  client → server: {type: "op", baseVersion, operation}   -- an edit, e.g. insert/delete at a position
  server → client: {type: "op", version, operation}       -- broadcast to every other connected client
  client → server: {type: "cursor", position}             -- ephemeral, not part of document history

REST:
GET /documents/{id}                 → current document content + current version number
GET /documents/{id}/history         → the ordered list of applied operations (for version restore)
```

```sql
documents(document_id PK, current_version, snapshot)   -- snapshot = periodic full-content checkpoint
operations(document_id FK, version, author_id, operation, applied_at)
```

Storing the operation log (not just periodic snapshots) is what makes version history and "who wrote this exact word" possible — the snapshot exists purely as a fast-load optimization so a client doesn't have to replay the entire history from operation zero on every open.

## 4. Deep Dive 1: Resolving Concurrent Edits — OT vs CRDTs

**The core problem, concretely:** two users, both starting from the same document state, each make an edit based on that shared starting point *before* seeing the other's edit. If both edits are naively applied in whatever order they happen to arrive at the server, positions shift underneath each other — user A's "insert at position 5" might land somewhere completely different once user B's edit (which changed everything after position 3) has already been applied.

**Operational Transformation (OT)** — the approach Google Docs actually uses — solves this by *transforming* one operation against another before applying it: if operation A ("insert 'x' at position 5") arrives at the server after operation B ("insert 'y' at position 2") has already been applied, the server transforms A's position to account for B's insertion (shifting A's target position by the length of what B inserted before it), so the final result is the one both users would agree makes sense — and critically, every client applies operations in a way that converges to the exact same final document regardless of the order operations happened to arrive in.

```text
Starting text: "Hello World"
User A (based on this state): insert "!" at position 11  → "Hello World!"
User B (based on this same state): insert "Big " at position 6 → "Hello Big World"

Naive concurrent apply (order-dependent, WRONG — different clients could disagree):
  If A applies first then B's un-transformed op: "Hello Big World!" — actually fine here by luck
  But with edits closer together, un-transformed positions genuinely collide and corrupt text

OT's actual job: transform B's operation against A's (or vice versa, depending on arrival order)
so that applying them in EITHER order produces the SAME final result on every client.
```

**CRDTs (Conflict-free Replicated Data Types)** are the alternative, increasingly common in newer collaborative editors: instead of transforming operations against each other, every character/element gets a unique, stable identifier that encodes its logical position relative to its neighbors in a way that never needs to change, so operations can be merged in *any* order and still converge to the same result, with no central transformation step required at all. The trade-off: CRDTs need more per-character metadata (higher memory/bandwidth overhead) but work well in a fully peer-to-peer or offline-heavy setting where there's no single server to be the transformation authority; OT is generally lighter-weight but classically assumes a central server to sequence and transform operations, which fits Google Docs' actual architecture (client-server, not peer-to-peer) well.

## 5. Deep Dive 2: Presence, Cursors, and Offline Editing

**Cursor/selection presence** is broadcast over the same WebSocket connection but is treated as ephemeral, not part of the document's operation history — it's never persisted or replayed, since only the current state (where is each collaborator's cursor *right now*) matters, unlike an actual edit.

**Offline editing** means a client keeps composing local operations against its last known `baseVersion` while disconnected, queuing them locally. On reconnect, it sends its queued operations to the server, which transforms them (the same OT machinery from the deep dive above) against every operation that landed on the server *while the client was offline* — from the algorithm's point of view, a client reconnecting after being offline for an hour is handled identically to a client whose single edit was simply delayed by network latency for a few hundred milliseconds; OT doesn't need a special case for "offline" versus "just slow."

## 6. High-Level Architecture

```text
Client (local-first editor state) ──(WebSocket, per-document room)──► Document Server
                                                                            │
                                                                            ├─► Operation Log (durable, ordered)
                                                                            └─► Periodic snapshot (for fast reload)
```

Each active document is effectively its own small real-time room (structurally similar to a chat conversation from the [Chat System design](09-Design-Chat-System.md#4-high-level-architecture)), which is why routing a document's operations to all of its currently-connected editors is the same "figure out who's subscribed to this channel" problem covered there, just with a document ID instead of a conversation ID as the routing key.

## 7. Frontend Perspective

- **Local-first is the entire frontend architecture here:** every keystroke applies to the local document model *immediately* — there is no waiting for a server round trip before the character appears, ever. The local operation is sent to the server in the background and reconciled (transformed against anything else that landed first) without disrupting what the user is actively typing.
- **Cursor preservation during a remote operation is a real, specific frontend bug class:** when a remote collaborator's edit arrives and gets applied to the local document, the local user's own cursor/selection position must be adjusted to account for it (an insertion before your cursor should shift your cursor forward, not leave it pointing at now-different text) — getting this wrong is the most common visible bug in a hand-rolled collaborative editor.
- **Rendering remote presence:** other users' cursors and selections are rendered as a lightweight overlay layer separate from the document content itself, updated from the ephemeral presence channel, not the document's operation stream.
- **Rich text document model:** a serious implementation uses a structured document-tree model (as libraries like ProseMirror or Slate do) rather than treating the document as a flat string, since formatting (bold, headings, lists) needs its own well-defined operations beyond plain character insert/delete.
- **Offline UI:** a visible "offline — changes will sync when reconnected" indicator, with local edits still fully functional in the meantime — the editing experience should degrade gracefully in connectivity, not in usability.

## 8. Bottlenecks and Trade-offs

- **OT's server-side sequencing point** — every operation for a given document ultimately needs one authoritative order to transform against, which is a natural (if small-scale) bottleneck per document; it's rarely a real problem in practice because concurrent editors per document is small, but it's worth naming as the trade-off OT makes in exchange for being lighter-weight than a full CRDT.
- **Very large documents** — replaying an entire operation history to reconstruct current state doesn't scale to a document with years of edits, which is exactly why periodic snapshots exist as a checkpoint, letting a client load "snapshot + operations since the snapshot" instead of "every operation since document creation."
- **Merge quality under long offline periods** — OT guarantees the document doesn't corrupt or silently drop either user's changes, but it doesn't guarantee the *result* is what either user would have wanted if their changes genuinely conflicted in intent (both rewriting the same paragraph completely differently) — this is a real, honest limitation to name rather than paper over.

## 9. Trade-off Summary

This design makes editing feel instantaneous by applying every edit locally first and reconciling with the server asynchronously in the background, using Operational Transformation to guarantee every collaborator's document converges to the identical final state regardless of the order operations actually arrived in — trading a real amount of algorithmic complexity (correct OT implementation is genuinely hard to get right) for an editing experience with zero perceived latency, which is the one non-negotiable requirement this whole system exists to satisfy.

## Interview Questions and Answers

### 1. Why can't concurrent edits just be applied to the document in whatever order they arrive at the server?

**Answer:** Each edit was made against the editor's own last-known document state, before seeing the other person's edit — naively applying both in arrival order lets their positions collide, since one edit's target position assumed a document state the other edit has since changed. Operational Transformation exists specifically to adjust ("transform") one operation's effect to account for another's, so the final result is correct regardless of arrival order.

### 2. What's the practical difference between OT and CRDTs, and why does Google Docs use OT specifically?

**Answer:** OT transforms operations against each other through a central sequencing authority (typically a server), while CRDTs give every element a stable identifier that lets operations merge correctly in any order with no transformation step or central authority needed. OT fits Google Docs' actual client-server architecture well and is comparatively lighter-weight; CRDTs shine more in fully peer-to-peer or heavily offline-first systems where there's no natural server to act as the transformation authority.

### 3. How does offline editing get reconciled once a client reconnects?

**Answer:** The client keeps composing local operations against its last-known version while offline, then sends them to the server on reconnect, which transforms them against every operation that landed while the client was disconnected — using exactly the same transformation machinery used for a simple few-hundred-millisecond network delay, with no special-case logic for "this client was offline for an hour."

### 4. Why must a remote collaborator's incoming edit adjust the local user's own cursor position?

**Answer:** If another user inserts text before your cursor and your cursor position isn't adjusted, it silently ends up pointing at different text than what you were actually looking at and about to type into — a real, highly visible bug in a hand-rolled collaborative editor, and one of the trickiest correctness details to get right in this whole system.

### 5. Why does this design store the full operation log instead of just the current document snapshot?

**Answer:** The operation log is what makes version history and "who wrote this specific word" attribution possible at all — a snapshot alone only has the current state, with no record of how it got there. The periodic snapshot exists purely as a load-time optimization so a client doesn't have to replay the entire history from the document's creation on every open.

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It trades real algorithmic complexity (a correct OT implementation, cursor-position reconciliation on incoming remote edits) for an editing experience with zero perceived latency, since every keystroke applies locally and instantly while server-side reconciliation happens invisibly in the background.

## Revision Checklist

- [ ] Walk through all 8 template steps for a collaborative document editor unprompted.
- [ ] Explain, with a concrete example, why naively applying concurrent edits in arrival order corrupts a document.
- [ ] Explain what Operational Transformation actually does, and contrast it with a CRDT's approach.
- [ ] Explain how offline editing reconciles on reconnect using the same OT machinery as a normal network delay.
- [ ] Explain the cursor-position-adjustment bug and why it's the most common real implementation mistake.
- [ ] Explain why the operation log, not just a snapshot, is needed for version history.
- [ ] State this design's core trade-off in one clear sentence.
