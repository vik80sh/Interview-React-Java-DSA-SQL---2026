# Design a Chat System (Slack/WhatsApp-style)

Same [8-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). A chat system's hard problem is genuinely different from everything else in this folder: it needs a real persistent, bidirectional connection to feel instant, and once you have millions of those connections open at once, routing "deliver this message to that specific user" across a fleet of connection servers becomes the actual interesting problem — not the chat UI itself.

## 1. Clarify Requirements

**Functional:** send/receive messages in a 1:1 or group conversation, see delivery/read receipts, see when someone's typing, receive messages sent while offline once you reconnect.

**Non-functional:** How fast must a message appear for the recipient? (Near-instant — sub-second — is the actual expectation users have for chat, unlike a social feed's tolerance for a few seconds of lag.) Must messages survive the server restarting? (Yes — a chat message vanishing is a real trust-breaking failure, unlike a stale like-count.) Must delivery order be guaranteed within a conversation? (Yes, at least per-conversation — messages appearing out of order is a real, confusing bug.)

## 2. Estimate Scale

- 50M DAU (Daily Active Users — unique users opening the app on a given day), each maintaining one persistent connection while the app is open, sending on the order of 40 messages/day.
- Concurrent open connections at peak ≈ tens of millions — this number, not message throughput itself, is what actually drives the architecture, because each open WebSocket connection consumes server-side memory and file-descriptor resources even while idle.
- Message write QPS (Queries Per Second — requests the system must handle every second): 50M × 40 / 86,400 ≈ 23,000 QPS — real, but far more tractable than the concurrent-connection count.

## 3. Core API and Data Model

```text
WebSocket: client connects once, then sends/receives frames like:
  {type: "message", conversationId, content}
  {type: "typing", conversationId}
  {type: "read", conversationId, messageId}

REST (for history, not live delivery):
GET /conversations/{id}/messages?before=  → paginated message history
```

```sql
messages(message_id PK, conversation_id, sender_id, content, sent_at, sequence_number)
conversation_members(conversation_id, user_id, last_read_message_id)
```

`sequence_number` (monotonically increasing per conversation) is what lets clients detect and correctly order messages even if network delivery arrives out of order — a real, necessary detail, not a nice-to-have.

## 4. High-Level Architecture

```text
Client ──(persistent WebSocket)──► Connection Gateway servers (many, stateless-ish)
                                          │
                                          ├─► Redis Pub/Sub (or Kafka) — routes a message to
                                          │     whichever gateway server the RECIPIENT is connected to
                                          │
                                          ├─► Message Service ──► Message DB (durable store)
                                          │
                                          └─► Presence Service (who's online, tracked in Redis)
```

The genuinely hard architectural fact: sender and recipient are very likely connected to two *different* gateway servers (there's no reason a load balancer would route two different users to the same server), so delivering a message isn't "write to a socket" — it's "figure out which server holds the recipient's connection, and get the message to that specific server," which is exactly what the pub/sub layer in the middle solves.

## 5. Deep Dive 1: Message Delivery Across a Fleet of Connection Servers

```text
When user A sends a message to user B:
  1. A's gateway server receives the WebSocket frame
  2. Message Service persists it durably (this happens regardless of whether B is online)
  3. Message Service publishes to a pub/sub channel keyed by B's user ID (or the specific
     gateway-server-id B is currently connected to, tracked in the Presence Service)
  4. Whichever gateway server(s) are subscribed to that channel receive the publish
  5. If B is connected to gateway server #7, server #7 pushes the message down B's WebSocket
  6. If B is NOT currently connected (offline), nothing happens at push time — but the
     message is already durably persisted, so it's simply delivered on B's next connect
     via the REST history endpoint (or a queued "you have new messages" push on reconnect)
```

This is why message persistence happens **before** the pub/sub push, not after — durability must never depend on whether the recipient happened to be online at that exact instant; the real-time push is a best-effort *optimization* for when they are, and the durable store is what guarantees the message is never lost regardless.

## 6. Deep Dive 2: Group Chats and Fan-out

A group chat message needs to reach every member's connection, wherever each of them happens to be connected — structurally the same fan-out problem as Twitter's feed delivery ([the social feed design](04-Design-Twitter-Social-Feed.md#5-deep-dive-feed-generation--the-actual-hard-problem)), scaled down to a group's member count instead of a celebrity's follower count.

```text
Small group (a typical Slack channel, tens to low hundreds of members):
  fan out the pub/sub publish to every member's channel directly — cheap at this size

Very large "group" (a broadcast channel with tens of thousands of subscribers):
  same problem shape as a celebrity's Twitter fan-out — at some size, delivering to every
  member individually in real time stops being the right model, and the system shifts toward
  "members pull recent messages on demand" rather than guaranteeing instant push to all of them
```

Recognizing that a chat system's "group" and a social feed's "celebrity follower list" are the same underlying fan-out problem, just at different typical scales, is exactly the kind of cross-scenario pattern recognition a strong candidate demonstrates.

## 7. Frontend Perspective

- **The WebSocket connection is the central frontend responsibility here**, more so than any other scenario in this folder: the client must handle connect, disconnect, and **reconnect with backoff** automatically, and on reconnect, it must reconcile: "what messages did I miss while disconnected?" — typically by requesting anything after the last message sequence number the client actually has.
- **Optimistic send:** a sent message should appear in the sender's own UI immediately, in a visually distinct "sending" state, confirmed (or marked failed, with a retry option) once the server acknowledges it — never make the sender wait for a round trip before seeing their own message appear.
- **Message ordering on the client:** because delivery can arrive out of order over an unreliable connection, the client should sort by the server-assigned `sequence_number`, not by arrival order or client-side timestamp.
- **Typing indicators and read receipts** are intentionally lossy, ephemeral signals — sent over the same WebSocket but never persisted or retried the way an actual message is, since missing one typing event has no real consequence.
- **Offline queueing:** messages composed while offline should queue locally (not silently fail) and flush automatically once the connection is restored — a real, expected behavior in any serious chat client.
- **Rendering a long message history performantly** is exactly the list-virtualization problem from the [Performance Optimization guide](../Frontend/React/04-Performance-Optimization.md#3-list-virtualization) — a chat with years of history cannot render every message as a live DOM node.

## 8. Bottlenecks and Trade-offs

- **Millions of concurrent idle connections** — each WebSocket holds server-side memory even while silent; this is what determines how many gateway servers are needed far more than message throughput does, and is the reason connection servers are typically scaled and reasoned about independently from the message-processing/database tier.
- **Ordering guarantees vs strict global ordering** — a per-conversation sequence number is enough and achievable; a single global ordering across every conversation in the entire system is unnecessary complexity nobody actually needs, and worth explicitly rejecting as a non-goal.
- **End-to-end encryption** (relevant for a WhatsApp-style prompt specifically) means the server can route and store messages but cannot read their content — this changes what the server-side "message" even contains (encrypted payload only) and rules out server-side features that would require reading content, like server-side search over message text, which is a real, statable trade-off if E2EE is in scope for the question.

## 9. Trade-off Summary

This design treats **durable persistence as the guarantee and real-time push as the optimization** — a message is safely stored the instant it's sent, and the pub/sub delivery layer is a best-effort fast path for when the recipient happens to be online, not the mechanism the system's correctness depends on — which is exactly why an offline recipient never loses a message, they simply receive it a little later, through a different path.

## Interview Questions and Answers

### 1. Why is delivering a chat message not as simple as "write to the recipient's socket"?

**Answer:** The sender and recipient are almost certainly connected to two different gateway servers in a horizontally-scaled fleet, so the sending server has no direct handle on the recipient's connection at all. A pub/sub layer in the middle, keyed by recipient (or by which specific gateway server they're connected to), is what routes the message to wherever that connection actually lives.

### 2. Why must a message be persisted to durable storage before (or independently of) the real-time push attempt?

**Answer:** If persistence depended on the recipient being online at that exact moment, an offline recipient would simply lose messages sent while they were away — a serious trust-breaking failure for a chat product. Persisting first makes durability unconditional, and the real-time push becomes a pure optimization for the common case where the recipient happens to be connected right then.

### 3. How does the client correctly order messages that might arrive out of order over the network?

**Answer:** Each message carries a server-assigned, per-conversation monotonically increasing sequence number, and the client sorts and displays messages by that sequence number rather than by arrival order or a client-side timestamp, which can't be trusted to reflect true send order under network reordering or clock skew.

### 4. How is a chat group's message fan-out the same underlying problem as a social feed's celebrity fan-out?

**Answer:** Both require delivering one piece of content to every member of a potentially large audience — a group's member list in chat, a celebrity's follower list in a feed. Both systems face the same scaling cliff at large audience sizes and the same general fix: push-based delivery for smaller audiences, and a pull-based ("fetch recent messages on demand") fallback once the audience is too large to fan out to individually in real time.

### 5. What must the frontend do differently for a chat app's WebSocket connection compared to, say, a live feed's real-time channel?

**Answer:** A chat client must reconnect automatically with backoff on disconnect and then reconcile exactly what was missed (using the last known sequence number) — a feed's "new content available" signal is comparatively low-stakes to miss briefly, while a dropped chat connection that doesn't reconcile missed messages is a real, visible bug for a product where message delivery is the core promise.

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It treats durable persistence as the actual delivery guarantee and the real-time push path as a best-effort optimization layered on top, so an offline recipient never loses a message — they just receive it a little later, through the same durable path every message goes through regardless of whether anyone was online to receive it instantly.

## Revision Checklist

- [ ] Walk through all 8 template steps for a chat system unprompted.
- [ ] Explain why message routing across a connection-server fleet needs a pub/sub layer, not a direct socket write.
- [ ] Explain why persistence happens independently of (and before) the real-time push attempt.
- [ ] Explain per-conversation sequence numbers and why they beat timestamp-based ordering.
- [ ] Connect chat group fan-out to social-feed fan-out as the same underlying pattern at different typical scales.
- [ ] Design the frontend's reconnect-and-reconcile behavior for a dropped WebSocket connection.
- [ ] State this design's core trade-off in one clear sentence.
