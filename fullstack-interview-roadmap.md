# Full Stack Interview Roadmap

## Target: Big Tech and Product Companies | Timeline: 1-2 Months | Focus: Heavy Frontend + Solid Backend

This roadmap is the master plan tying together every folder in this repo. Each phase below names the actual files to read, in order — not generic topic names — so "what do I study today" always has one concrete answer.

## Repo Map

```text
Backend/
  Java/        01-13 + INDEX  — JVM, OOP, collections, concurrency, Java 8, generics, SOLID, design patterns
  Springboot/  01-08 + INDEX  — Spring fundamentals, REST, JPA/Hibernate, security, testing, concurrency, reliability, AOP/Actuator
  Database/    01-08 + INDEX  — choosing a DB, SQL, joins, ACID, isolation levels, indexing, normalization, MongoDB/Redis
  INDEX.md                    — master index across all three

Frontend/
  JavaScript/  01-16 + INDEX  — scope/closures/this/prototypes, event loop, promises, memory, browser APIs, networking, TypeScript
  React/       01-13 + INDEX  — rendering/Fiber, hooks, performance, patterns, TypeScript, testing, state mgmt, SSR/Next.js, system design
  HTML-CSS/    01-09 + INDEX  — semantics/a11y, box model, flexbox/grid, specificity, responsive design, rendering pipeline, Core Web Vitals
  INDEX.md                    — master index across all three

DSA/           01-08 + INDEX  — fundamentals, arrays/strings, trees/graphs/linked lists, DP patterns + 2 revision cheat sheets, study plan
SystemDesign/  01-11 + INDEX  — fundamentals/template, scalability, database design, then 8 fully worked scenarios (Twitter, Netflix,
                                Uber, e-commerce, large file upload, chat, Google Docs, URL shortener)
DevOps-Cloud/  01-03 + docker notes + INDEX — CI/CD, AWS basics, microservices, Docker/Compose
```

## Phase 1: Assessment and Foundation (Week 1)

**Frontend — audit your gaps against:**
- [ ] [Frontend/React/02-Hooks-Deep-Dive.md](Frontend/React/02-Hooks-Deep-Dive.md) and [04-Performance-Optimization.md](Frontend/React/04-Performance-Optimization.md)
- [ ] [Frontend/JavaScript/15-TypeScript-Language-Fundamentals.md](Frontend/JavaScript/15-TypeScript-Language-Fundamentals.md) and [React/06-TypeScript-with-React.md](Frontend/React/06-TypeScript-with-React.md)
- [ ] [Frontend/React/07-Testing-React-Jest-RTL.md](Frontend/React/07-Testing-React-Jest-RTL.md)
- [ ] [Frontend/React/08-State-Management-Context-Redux-Zustand.md](Frontend/React/08-State-Management-Context-Redux-Zustand.md)

**Backend — Java + Spring Boot baseline (8-10 hours):**
- [ ] [Backend/Springboot/01-Spring-Boot-Fundamentals.md](Backend/Springboot/01-Spring-Boot-Fundamentals.md) — IoC/DI, bean lifecycle, auto-configuration
- [ ] [Backend/Springboot/02-REST-API-Design.md](Backend/Springboot/02-REST-API-Design.md)
- [ ] [Backend/Database/02-SQL-Queries-Fundamentals.md](Backend/Database/02-SQL-Queries-Fundamentals.md) and [03-SQL-Joins-Explained.md](Backend/Database/03-SQL-Joins-Explained.md)
- [ ] Build a small CRUD slice yourself, following [Backend/Springboot/01](Backend/Springboot/01-Spring-Boot-Fundamentals.md)'s layered example

**DSA foundation (15-20 hours/week — this is the highest-leverage category, start immediately):**
- [ ] [DSA/01-DSA-Fundamentals-Complexity.md](DSA/01-DSA-Fundamentals-Complexity.md), then [02-Arrays-Strings.md](DSA/02-Arrays-Strings.md)
- [ ] LeetCode Easy → Medium, 3-4 problems/day, following [DSA/05-LeetCode-Study-Plan.md](DSA/05-LeetCode-Study-Plan.md)'s weekly order

## Phase 2: Frontend Mastery (Week 2-3)

**Advanced React patterns:**
- [ ] [Frontend/React/05-Advanced-Component-Patterns.md](Frontend/React/05-Advanced-Component-Patterns.md) — controlled/uncontrolled, compound components, render props vs HOC vs hooks, state machines, error boundaries, portals
- [ ] [Frontend/React/03-Custom-Hooks.md](Frontend/React/03-Custom-Hooks.md) — build `useLocalStorage`, `useFetch`, `useDebounce` yourself
- [ ] [Frontend/React/09-DOM-Refs-and-Event-Handling.md](Frontend/React/09-DOM-Refs-and-Event-Handling.md)
- [ ] [Frontend/JavaScript/16-DOM-Events-Bubbling-Capturing-Delegation.md](Frontend/JavaScript/16-DOM-Events-Bubbling-Capturing-Delegation.md) — the plain-JS mechanics underneath React's synthetic events

**TypeScript mastery:**
- [ ] [Frontend/JavaScript/15-TypeScript-Language-Fundamentals.md](Frontend/JavaScript/15-TypeScript-Language-Fundamentals.md) — generics, discriminated unions, conditional types, utility types
- [ ] [Frontend/React/06-TypeScript-with-React.md](Frontend/React/06-TypeScript-with-React.md) — typing props/hooks/forwardRef/Redux

**Testing:**
- [ ] [Frontend/React/07-Testing-React-Jest-RTL.md](Frontend/React/07-Testing-React-Jest-RTL.md) — behavior-not-implementation, RTL query priority, mocking

**Performance and rendering fundamentals:**
- [ ] [Frontend/React/04-Performance-Optimization.md](Frontend/React/04-Performance-Optimization.md) — memoization, code splitting, virtualization
- [ ] [Frontend/HTML-CSS/07-Critical-Rendering-Path-and-Browser-Rendering.md](Frontend/HTML-CSS/07-Critical-Rendering-Path-and-Browser-Rendering.md) and [08-Web-Performance-and-Core-Web-Vitals.md](Frontend/HTML-CSS/08-Web-Performance-and-Core-Web-Vitals.md)

**Deliverable:** build one small app exercising a custom hook, a compound component, TypeScript throughout, and a real test suite.

## Phase 3: Backend Essentials (Week 3-4)

**Java core (if rusty — this underpins everything Spring does):**
- [ ] [Backend/Java/03-OOP-Fundamentals.md](Backend/Java/03-OOP-Fundamentals.md), [06-Collections-Framework.md](Backend/Java/06-Collections-Framework.md), [08-Multithreading-Concurrency.md](Backend/Java/08-Multithreading-Concurrency.md)
- [ ] [Backend/Java/12-SOLID-Principles.md](Backend/Java/12-SOLID-Principles.md) — a very common "review this code" interview format
- [ ] [Backend/Java/09-Java8-Lambda-Stream-Optional.md](Backend/Java/09-Java8-Lambda-Stream-Optional.md)

**Spring Boot deep dive:**
- [ ] [Backend/Springboot/01-Spring-Boot-Fundamentals.md](Backend/Springboot/01-Spring-Boot-Fundamentals.md) — bean lifecycle, `BeanFactory` vs `ApplicationContext`, circular dependencies
- [ ] [Backend/Springboot/03-Database-JPA-Hibernate.md](Backend/Springboot/03-Database-JPA-Hibernate.md) — entity relationships, lazy/eager, N+1, transactions
- [ ] [Backend/Springboot/04-Authentication-Security.md](Backend/Springboot/04-Authentication-Security.md) — JWT, `SecurityContextHolder`, CSRF vs CORS
- [ ] [Backend/Springboot/08-AOP-Actuator-Microservices.md](Backend/Springboot/08-AOP-Actuator-Microservices.md) — AOP proxies, Actuator/liveness-readiness, Resilience4j
- [ ] [Backend/Springboot/07-Common-Backend-Problems.md](Backend/Springboot/07-Common-Backend-Problems.md) — caching, idempotency, outbox, circuit breakers

**Database fundamentals:**
- [ ] [Backend/Database/01-Database-Fundamentals-and-Choosing-One.md](Backend/Database/01-Database-Fundamentals-and-Choosing-One.md) through [04-ACID-Properties-and-Transactions.md](Backend/Database/04-ACID-Properties-and-Transactions.md)
- [ ] [Backend/Database/06-Indexes-and-Query-Optimization.md](Backend/Database/06-Indexes-and-Query-Optimization.md) — read an `EXPLAIN` plan, size a composite index
- [ ] Write 10+ real queries against a schema you design yourself, including at least one of each join type

**Practice project (6-8 hours):** a REST API in Spring Boot with auth, CRUD, a real database, error handling via `@RestControllerAdvice`, and both unit and slice tests.

## Phase 4: System Design and Architecture (Week 4-5)

Read [SystemDesign/01-System-Design-Fundamentals.md](SystemDesign/01-System-Design-Fundamentals.md) first — it defines the **8-step template** every scenario file below follows: clarify requirements → estimate scale → core API/data model → high-level architecture → backend deep dive → **frontend perspective** → bottlenecks/trade-offs → one-sentence trade-off summary. Then [02-Scalability-Load-Balancing.md](SystemDesign/02-Scalability-Load-Balancing.md) and [03-Database-Design.md](SystemDesign/03-Database-Design.md).

**Work through these 8 fully-worked scenarios, in order of increasing complexity:**
1. [11-Design-URL-Shortener.md](SystemDesign/11-Design-URL-Shortener.md) — the classic warm-up (ID generation, redirect performance)
2. [04-Design-Twitter-Social-Feed.md](SystemDesign/04-Design-Twitter-Social-Feed.md) — feed fan-out (push vs pull vs hybrid)
3. [07-Design-E-Commerce-Platform.md](SystemDesign/07-Design-E-Commerce-Platform.md) — the overselling race condition, the checkout saga, SEO-driven rendering split
4. [05-Design-Netflix-Video-Streaming.md](SystemDesign/05-Design-Netflix-Video-Streaming.md) — adaptive bitrate streaming, recommendations
5. [06-Design-Uber-Ride-Hailing.md](SystemDesign/06-Design-Uber-Ride-Hailing.md) — geospatial matching, real-time location
6. [08-Design-Large-File-Upload.md](SystemDesign/08-Design-Large-File-Upload.md) — chunked resumable upload, direct-to-storage
7. [09-Design-Chat-System.md](SystemDesign/09-Design-Chat-System.md) — WebSocket fleet routing, message durability
8. [10-Design-Google-Docs-Collaborative-Editor.md](SystemDesign/10-Design-Google-Docs-Collaborative-Editor.md) — Operational Transformation, offline merge

**For each:** close the file, explain all 8 steps out loud from memory, then check what you missed — the frontend perspective (step 6) is the step most frontend-leaning candidates still skip, so double-check that one specifically.

## Phase 5: DSA Intensive (Weeks 2-5, ongoing throughout)

- [ ] [DSA/02-Arrays-Strings.md](DSA/02-Arrays-Strings.md) and [03-Trees-Graphs-LinkedLists.md](DSA/03-Trees-Graphs-LinkedLists.md) — read once, then drill via the study plan
- [ ] [DSA/04-DP-Backtracking.md](DSA/04-DP-Backtracking.md) for the basics, then [06-Dynamic-Programming-Patterns-and-Thinking-Process.md](DSA/06-Dynamic-Programming-Patterns-and-Thinking-Process.md) the moment a DP problem feels unfamiliar rather than routine — it teaches the 4-step thinking process and all 12 pattern families, not memorized solutions
- [ ] [DSA/05-LeetCode-Study-Plan.md](DSA/05-LeetCode-Study-Plan.md) for the week-by-week problem list (73 problems, all cross-checked into the cheat sheets below)
- [ ] **Morning-of-the-interview re-read:** [DSA/07-DP-Quick-Revision-Cheatsheet.md](DSA/07-DP-Quick-Revision-Cheatsheet.md) for DP, [08-DSA-Complete-Cheatsheet.md](DSA/08-DSA-Complete-Cheatsheet.md) for everything else — both give a real example, the specific tip, and the pattern for 90+ problems, fast to scan under time pressure

**Goal:** 60+ medium problems solved, 70%+ solvable in under 30 minutes without hints.

## Phase 6: Project, DevOps Basics, and Interview Prep (Week 5-6)

**DevOps/Cloud basics (a full-stack dev needs working knowledge, not depth):**
- [ ] [DevOps-Cloud/docker-notes-twitter-clone.md](DevOps-Cloud/docker-notes-twitter-clone.md) — Docker/Compose through a real Spring Boot + React project
- [ ] [DevOps-Cloud/01-CI-CD-Fundamentals.md](DevOps-Cloud/01-CI-CD-Fundamentals.md) and [02-AWS-Basics.md](DevOps-Cloud/02-AWS-Basics.md) — EC2 vs Lambda, S3, RDS vs DynamoDB, security groups
- [ ] [DevOps-Cloud/03-Microservices-Architecture.md](DevOps-Cloud/03-Microservices-Architecture.md) — API Gateway, service discovery, why services don't share a database

**Build your showpiece project:**
- Frontend: React + TypeScript + tests, following the patterns in [Frontend/React/](Frontend/React/INDEX.md)
- Backend: Spring Boot API, following [Backend/Springboot/](Backend/Springboot/INDEX.md) and [Backend/Database/](Backend/Database/INDEX.md)
- Containerized with Docker, following [DevOps-Cloud/docker-notes-twitter-clone.md](DevOps-Cloud/docker-notes-twitter-clone.md)
- Deployed somewhere real (Vercel/Netlify for frontend, a free-tier cloud service for backend)
- Must include: auth, CRUD, error handling, unit + component tests, a README with setup instructions

**Mock interview practice (Week 5-6):** 2-3 DSA rounds, 1-2 system design rounds (pick two scenarios you haven't reviewed recently), 1-2 behavioral rounds.

## Behavioral and Soft Skills (Throughout)

Prepare 5-7 STAR-method stories covering: a complex full-stack problem you solved, a technical challenge you overcame, a conflict with a teammate and its resolution, a time you shipped something fast, a time you learned something new quickly under pressure, your best architecture/code decision, and a failure and what you learned from it.

## Weekly Schedule Template

| Week | Daily focus (Mon-Fri) | Weekend |
|---|---|---|
| 1 | 2h React/TS review + 1h Spring Boot basics + 1.5h DSA (easy) | 3h project setup |
| 2-4 | 2.5h Backend/Database OR DSA (rotate) + 1.5h Frontend patterns/testing + 2h DSA (medium, 3-4 problems) | 5h project building or System Design reading |
| 5-6 | 2h mock interviews or project polish + 2h DSA weak-area review + 1h behavioral practice | 6h final project push + mock rounds |

**Total commitment:** ~45-50 hours/week for 6 weeks — adjust down if working full-time, and extend the timeline rather than cutting DSA or System Design short.

## Interview Round Patterns

**Frontend round (60 min):** 1-2 DSA problems (array/tree/string-focused), a frontend-flavored system design (e.g. an autocomplete search, a data grid), a React pattern question + live coding.

**Backend round (60 min):** 1-2 DSA problems, a Spring Boot API design question, a database design/query question (expect an N+1 or a join-explanation question specifically).

**System design round (60 min):** one full scenario from [SystemDesign/](SystemDesign/INDEX.md), worked through the 8-step template live, with explicit frontend AND backend coverage.

**Behavioral round (45 min):** 4-5 STAR stories, culture-fit questions, and your own questions for them.

## Must-Know Concepts Checklist

**Frontend:** React Fiber/reconciliation, Rules of Hooks and why self-invocation/closures break them, TypeScript generics and discriminated unions, state management trade-offs (Context vs Zustand vs Redux), the Critical Rendering Path, Core Web Vitals.

**Backend (Java/Spring):** constructor injection and why field injection is avoided, bean lifecycle and `BeanFactory` vs `ApplicationContext`, AOP proxies and why self-invocation breaks `@Transactional`/`@Async`, entity relationships and N+1, JWT/`SecurityContextHolder`, SOLID principles with a real code example for each.

**Database:** all 6 join types traced by hand, all 4 ACID properties with a real failure mode each, the 3 concurrency anomalies (dirty/non-repeatable/phantom read) and their isolation levels, reading an `EXPLAIN` plan.

**System design:** the 8-step template from memory, capacity estimation (DAU → QPS → storage → bandwidth) derived live, CAP theorem's practical CP/AP framing, and at least 4 of the 8 worked scenarios explained end to end including the frontend perspective.

**DSA:** the 12 DP pattern families and how to recognize each from a problem's phrasing, two pointers vs sliding window, DFS vs BFS, when binary search works on an unsorted array, monotonic stacks.

## Red Flags to Avoid

- [ ] Only knowing one framework deeply — show breadth across the stack
- [ ] Can't explain how your own tech works under the hood (ask yourself "why," not just "what")
- [ ] No experience with testing or performance optimization
- [ ] Can't design a schema or write a real SQL join without help
- [ ] DSA is rusty — daily practice until the day before the interview
- [ ] No real, deployed project to show
- [ ] Can't discuss a design's trade-offs, only its components

## Success Metrics (End of Week 6)

- [ ] Completed 60+ LeetCode medium problems, solving most in under 20-30 minutes
- [ ] Can work through any of the 8 SystemDesign scenarios end to end, including the frontend perspective, without notes
- [ ] Built and deployed a full-stack project (React + Spring Boot + a real database, containerized)
- [ ] Passed 3-4 mock interviews with a 70%+ self-assessed score
- [ ] Have 5-7 strong STAR stories ready
- [ ] Can explain React, Spring Boot, and SQL/transaction internals confidently, not just their APIs

## Final Tips

1. **Think out loud** — interviewers grade the reasoning, not just the final answer.
2. **Ask clarifying questions**, especially in system design — assuming instead of asking is the most common way candidates lose early points (see [SystemDesign/01](SystemDesign/01-System-Design-Fundamentals.md)'s template step 1).
3. **Discuss trade-offs** — every guide in this repo ends with a Q&A section specifically because "why this, not that" is what's actually being evaluated.
4. **Show your full stack** — even in a "frontend round," mention how your answer touches the backend and vice versa; that's the whole point of a full-stack candidate.
5. **Deploy your project** — a live link beats a local `git clone` every time.

Good luck — the depth is already in this repo; the roadmap is just the order to walk through it.
