# Design Uber / Ola (Ride-Hailing)

Same [7-step template](01-System-Design-Fundamentals.md#1-the-reusable-interview-template). A ride-hailing platform's hard problem is fundamentally geospatial and real-time: track millions of moving drivers, and match a rider to a nearby driver in seconds — a genuinely different flavor of "hard" from Twitter's fan-out or Netflix's delivery problem, which is exactly why interviewers like asking it.

## 1. Clarify Requirements

**Functional:** rider requests a ride, system matches with a nearby driver, both parties track the ride live, payment on completion, ratings.

**Non-functional:** How many concurrent drivers reporting location, and how often? (This single number — location update frequency × driver count — dominates the system's write load, more than ride requests themselves.) What's an acceptable matching latency? (Under ~30 seconds is the real bar; riders abandon the app past that.) Does pricing need to respond to real-time supply/demand? (Yes — this is what makes surge pricing a real design component, not a footnote.)

## 2. Estimate Scale

- 100M users, 5M active drivers, 50M rides/day.
- Ride-matching QPS (Queries Per Second — requests the system must handle every second): 50M / 86,400 ≈ 580 QPS average — genuinely modest.
- **Location update QPS is the real load:** 5M drivers reporting location every ~4 seconds ≈ 1.25M updates/second. This single number is why the location-tracking subsystem, not the ride-matching logic itself, drives most of the infrastructure decisions in this design.

## 3. Core API and Data Model

```text
POST /rides/request       {pickup, dropoff}         → ride_id, matched_driver
PUT  /drivers/{id}/location {lat, lng}               → ack (called every few seconds by the driver app)
POST /rides/{id}/complete  {finalLocation}           → fare, receipt
```

```text
Location Service (Redis, geospatial):
  GEOADD active_drivers <lng> <lat> driver:1001
  GEORADIUS active_drivers <riderLng> <riderLat> 5 km   → nearby driver IDs

Rides (relational, needs real transactional guarantees):
  rides(ride_id PK, rider_id, driver_id, pickup, dropoff, fare, status, created_at)
```

Location data and ride/payment data have genuinely different consistency needs — a driver's location can be a few seconds stale with no real consequence, but a ride's fare and status need the transactional guarantees relational storage provides — which is exactly why they live in two different kinds of storage rather than one, and is worth stating explicitly as a deliberate choice.

## 4. High-Level Architecture

```text
Driver App → Location Service (Redis, geospatial index) ─┐
                                                            ├─→ Matching Service ─→ Notification Service (push to both parties)
Rider App → API Servers → Matching Service ────────────────┘
                        → Payment Service (idempotent, third-party processor)
                        → Rides DB (relational)
```

The location service is deliberately separate from the primary rides database — it's an extremely high-write, low-durability-requirement workload (losing one stale GPS ping is a non-event) that would overwhelm a relational database's write path if it lived there instead of in an in-memory geospatial store.

## 5. Deep Dive 1: Real-Time Location Tracking and Matching

Driver location is stored in Redis using its native geospatial commands, not in the relational database — `GEOADD` to update a driver's position, `GEORADIUS`/`GEOSEARCH` to find every driver within a given radius of a point. This is the direct, purpose-built tool for "who is near this location right now," versus running a distance calculation over every row of a relational table on every single match request, which doesn't scale past a small fleet.

```text
Matching flow when a rider requests a ride:
  1. GEORADIUS active_drivers <riderLocation> 5km → candidate driver IDs
  2. Rank candidates by: distance, estimated time to reach rider, driver rating,
     recent acceptance rate (a driver who declines constantly ranks lower)
  3. Send the offer to the top-ranked driver first (or top few in parallel with a short timeout)
  4. First driver to accept is matched; others' offers are cancelled
```

**Why geohashing matters underneath this:** a naive spatial query still has to check every driver's exact coordinates against the search radius. Geohashing encodes a location into a string where geographically nearby points share a common prefix, letting the search be reduced to a small set of grid cells first — this is what Redis's geospatial index does internally, and it's the reason the radius search stays fast even with millions of active drivers.

## 6. Deep Dive 2: Surge Pricing

When demand (ride requests in an area) outpaces supply (available nearby drivers), the fare multiplier increases — both to ration limited driver capacity toward riders who value it most urgently, and to incentivize more drivers to move into that area.

```text
surge_multiplier(area) = f(current_requests_in_area / current_available_drivers_in_area)

Example: 1,000 pending requests / 500 available drivers in a zone → 2.0x multiplier
```

The system-design-relevant detail isn't the pricing formula itself — it's that this requires a **real-time, per-geographic-zone aggregate** (current supply and demand counts, refreshed continuously, not batch-computed overnight) which is exactly the same geospatial infrastructure from the matching deep dive, queried for counts instead of individual matches.

## 7. Frontend Perspective

- **Real-time channel is the central frontend decision here:** the rider app needs the driver's live position updating on the map continuously during matching and the ride itself — this is a genuine case for a persistent WebSocket connection (or a managed real-time service), not polling, because the update frequency (every few seconds) and the two-way nature (driver location flows to rider, ride status/cancellation flows both ways) both favor it over the lighter-weight SSE (Server-Sent Events — a one-directional server-to-client push channel)/polling choice a social feed makes.
- **Rendering strategy:** almost entirely CSR — there's no meaningful SEO surface in a ride-hailing app's core flow (it's a logged-in, live, personal transaction), so this is one of the clearer "just build an SPA" cases rather than a genuine SSR/SSG trade-off.
- **Optimistic UI, used carefully:** requesting a ride can show an immediate "finding your driver" state optimistically, but the actual match/confirmation must wait for the server, since a false-positive "driver found" shown before the match is real would be a much worse experience than a brief loading state.
- **Map rendering performance:** continuously updating a driver's marker position on a map (via a mapping SDK) many times a second across a live ride needs to interpolate/animate smoothly between position updates rather than snapping the marker instantly, or the movement looks janky — a real, specific frontend performance detail worth mentioning.
- **Failure/offline handling:** a dropped connection mid-ride (a common real scenario — cellular dead zones) shouldn't cancel the ride; the client should reconnect and resync ride state, treating the WebSocket as a resumable stream, not a single point of failure for the ride itself.

## 8. Bottlenecks and Trade-offs

- **1.25M location updates/second** — the dominant load, absorbed by an in-memory geospatial store rather than the relational database, and tolerant of occasionally dropping a stale update (the next one arrives in ~4 seconds regardless).
- **Payment idempotency** — a ride-completion request retried due to a network blip must not charge the rider twice; the payment flow needs an idempotency key (the ride ID itself works) checked against a unique constraint before charging, the same pattern covered generally in the [Common Backend Problems guide](../Backend/Springboot/07-Common-Backend-Problems.md#4-idempotency).
- **Matching fairness vs speed** — always picking the single closest driver is fast but can create pockets of driver dissatisfaction (the same few drivers always get offers); ranking by a blend of distance, rating, and acceptance rate is a deliberate trade of pure speed for a fairer, more sustainable marketplace.

## 9. Trade-off Summary

This design accepts **slightly stale, best-effort location data in exchange for handling over a million location updates per second**, while keeping the ride and payment path fully consistent — because a driver's pin being a few seconds old is invisible to the rider experience, but a duplicated charge or a lost ride record is not, and those two halves of the system are deliberately built on different storage with different guarantees for exactly that reason.

## Interview Questions and Answers

### 1. Why does driver location get stored in Redis instead of the primary relational database?

**Answer:** Location updates arrive at extremely high volume (millions per second across a large driver fleet) and each individual update has very low durability requirements — losing one stale GPS ping is a non-event since another arrives in a few seconds. A relational database's transactional write path isn't built for that volume/durability trade-off; an in-memory geospatial store is exactly the right tool, while ride and payment data still need the relational database's transactional guarantees.

### 2. What does geohashing actually buy the matching system?

**Answer:** It encodes geographic coordinates so that nearby locations share a common string prefix, letting a "find everything within X km" query narrow down to a small set of grid cells first instead of computing an exact distance against every single driver's raw coordinates. This is what keeps a radius search fast even as the number of active drivers grows into the millions.

### 3. Why doesn't the matching algorithm just always send the ride offer to the single geographically closest driver?

**Answer:** Distance alone as the sole ranking factor can create fairness problems — a cluster of drivers near busy pickup zones always wins offers while others rarely get matched — and ignores real signals like a driver's likelihood to actually accept. Ranking by a blend of distance, rating, and recent acceptance rate trades a small amount of matching speed for a fairer, more sustainable driver marketplace.

### 4. Why must the ride-completion/payment endpoint be idempotent, and how would you implement that?

**Answer:** A network retry (the client resending a request it didn't get a confirmed response for) must not charge the rider a second time for the same ride. Using the ride ID itself as an idempotency key, checked against a unique constraint before processing the charge, ensures a duplicate request either no-ops or returns the original result instead of double-charging.

### 5. What real-time infrastructure does surge pricing actually depend on?

**Answer:** A continuously updated, per-geographic-zone count of pending ride requests versus currently available nearby drivers — the same geospatial location infrastructure used for matching, queried for aggregate counts rather than individual nearest-driver lookups. Without that real-time supply/demand signal, surge pricing would be reacting to stale data and either over- or under-price a genuinely changing situation.

### 6. What's this design's core trade-off, in one sentence?

**Answer:** It accepts occasionally stale, best-effort driver location data — tolerable because a GPS pin being a few seconds old is invisible to the user — in exchange for being able to absorb over a million location updates per second, while keeping the ride and payment path on fully consistent, transactional storage where staleness or duplication would be a real, visible problem.

### 7. Why does a ride-hailing app's frontend need a persistent WebSocket rather than the polling/SSE (Server-Sent Events) choice a social feed makes?

**Answer:** Live driver location needs frequent (every few seconds), continuous updates during an active match or ride, and the connection is genuinely bidirectional — ride status and cancellations flow from both sides, not just server-to-client. That combination of frequency and bidirectionality is exactly what a persistent WebSocket is suited for, unlike a social feed's much lower-frequency, one-directional "something new exists" signal.

### 8. Why should a dropped connection mid-ride not cancel the ride itself?

**Answer:** A cellular dead zone or brief network drop is common and shouldn't be treated as a ride-ending failure — the client should reconnect and resync the current ride state from the server, treating the real-time connection as a resumable stream layered on top of the ride's actual source of truth (the ride record in the database), not as the ride's only representation.

## Revision Checklist

- [ ] Walk through all 8 template steps for a ride-hailing platform unprompted.
- [ ] Explain why location data and ride/payment data live in different storage systems with different guarantees.
- [ ] Explain geohashing's role in making radius-based driver search fast at scale.
- [ ] Explain the fairness trade-off in ranking driver candidates beyond pure distance.
- [ ] Design an idempotent payment flow for ride completion.
- [ ] Cover the frontend perspective explicitly: why WebSocket over polling here, optimistic UI limits, and reconnect-and-resync behavior on a dropped connection.
- [ ] State this design's core trade-off in one clear sentence.
