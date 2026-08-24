# DevOps & Cloud — Master Question Bank

This file aggregates every interview question, with its full answer, from every file in this `DevOps-Cloud/` folder — [01-CI-CD-Fundamentals.md](01-CI-CD-Fundamentals.md), [02-AWS-Basics.md](02-AWS-Basics.md), [03-Microservices-Architecture.md](03-Microservices-Architecture.md), and [docker-notes-twitter-clone.md](docker-notes-twitter-clone.md) — into one place for quick revision. Each question is reproduced verbatim from its source file and links back to that file (and the exact heading within it) so you can open the original for the full surrounding context, scenarios, and diagrams.

---

## [1. CI/CD Fundamentals (Beginner-Friendly)](01-CI-CD-Fundamentals.md)

### 1. What's the difference between CI, Continuous Delivery, and Continuous Deployment?

**Answer:** CI automatically builds and tests every change as soon as it's merged, so problems surface within minutes. Continuous Delivery means a change that passes CI is packaged and ready to release, but a human still approves the release. Continuous Deployment removes that approval — a passing change goes live automatically. Each builds on the one before it.

*Source: [01-CI-CD-Fundamentals.md#1-whats-the-difference-between-ci-continuous-delivery-and-continuous-deployment](01-CI-CD-Fundamentals.md#1-whats-the-difference-between-ci-continuous-delivery-and-continuous-deployment)*

### 2. Describe a CI/CD pipeline for a Spring Boot service.

**Answer:** Push to Git triggers a webhook. The pipeline builds the JAR, runs unit then integration tests, runs a quality/security scan, builds and tags a Docker image once, pushes it to a registry, deploys that same image to staging, smoke-tests it, then deploys it to production (auto or manually approved) using a gradual rollout, with monitoring watching error rate and latency throughout.

*Source: [01-CI-CD-Fundamentals.md#2-describe-a-cicd-pipeline-for-a-spring-boot-service](01-CI-CD-Fundamentals.md#2-describe-a-cicd-pipeline-for-a-spring-boot-service)*

### 3. How do you handle secrets in CI/CD?

**Answer:** Never commit a real secret to source control. Store it in an encrypted secrets manager (GitHub Secrets, AWS Secrets Manager, Vault), reference it by name, give each pipeline only the access it needs, and rotate secrets periodically.

*Source: [01-CI-CD-Fundamentals.md#3-how-do-you-handle-secrets-in-cicd](01-CI-CD-Fundamentals.md#3-how-do-you-handle-secrets-in-cicd)*

### 4. How would you deploy with zero downtime?

**Answer:** Blue-green deployment — the new version comes up fully alongside the old one, gets health-checked, then the load balancer switches all traffic over at once. The old version keeps running for a while, so rollback is just switching traffic back.

*Source: [01-CI-CD-Fundamentals.md#4-how-would-you-deploy-with-zero-downtime](01-CI-CD-Fundamentals.md#4-how-would-you-deploy-with-zero-downtime)*

### 5. Blue-green vs. canary vs. rolling — when would you use each?

**Answer:** Blue-green gives instant switch-over and instant rollback but needs a second full environment. Canary sends a small percentage of traffic to the new version first and grows it only if metrics stay healthy — best when you want to limit how many users a bad build can affect. Rolling replaces instances gradually with no second environment, cheaper but slower, and only safe if old and new versions can run side by side without conflicting.

*Source: [01-CI-CD-Fundamentals.md#5-blue-green-vs-canary-vs-rolling--when-would-you-use-each](01-CI-CD-Fundamentals.md#5-blue-green-vs-canary-vs-rolling--when-would-you-use-each)*

### 6. What is a build artifact, and why not just rebuild it at every stage?

**Answer:** The artifact is the actual deployable output (a JAR, a Docker image). Rebuilding it fresh at every stage risks deploying something subtly different from what was tested. Building it once, tagging it, and reusing that exact artifact through every later stage is "build once, deploy everywhere" — it guarantees you ship what you tested.

*Source: [01-CI-CD-Fundamentals.md#6-what-is-a-build-artifact-and-why-not-just-rebuild-it-at-every-stage](01-CI-CD-Fundamentals.md#6-what-is-a-build-artifact-and-why-not-just-rebuild-it-at-every-stage)*

### 7. What do you monitor after a deployment, and what triggers a rollback?

**Answer:** Application metrics (error rate, latency), infrastructure metrics (CPU, memory), and business metrics where relevant. An automated rollback should fire when error rate or latency crosses a set threshold shortly after deploy, rather than waiting for someone to notice.

*Source: [01-CI-CD-Fundamentals.md#7-what-do-you-monitor-after-a-deployment-and-what-triggers-a-rollback](01-CI-CD-Fundamentals.md#7-what-do-you-monitor-after-a-deployment-and-what-triggers-a-rollback)*

### 8. Why run automated tests in the pipeline instead of relying on manual testing?

**Answer:** A pipeline runs the same checks the same way on every commit; a human can forget a step. Automated tests finish in minutes and give every developer the same fast feedback loop. Manual testing still matters for exploratory and UX checks — it's just not a substitute for catching repeatable regressions automatically.

*Source: [01-CI-CD-Fundamentals.md#8-why-run-automated-tests-in-the-pipeline-instead-of-relying-on-manual-testing](01-CI-CD-Fundamentals.md#8-why-run-automated-tests-in-the-pipeline-instead-of-relying-on-manual-testing)*

---

## [2. AWS Basics (Beginner-Friendly)](02-AWS-Basics.md)

### 1. Design a web application on AWS for ~1M users, 1k requests/sec, high availability.

**Answer:** Route 53 for DNS, CloudFront for static assets, an ALB across an EC2 Auto Scaling Group (e.g. 10 `t3.large` baseline, scaling with load), RDS Multi-AZ for the database, S3 for files/backups, CloudWatch for monitoring. High availability specifically comes from multi-AZ EC2, Multi-AZ RDS failover, and load-balancer health checks.

*Source: [02-AWS-Basics.md#1-design-a-web-application-on-aws-for-1m-users-1k-requestssec-high-availability](02-AWS-Basics.md#1-design-a-web-application-on-aws-for-1m-users-1k-requestssec-high-availability)*

### 2. How do you handle failures?

**Answer:** EC2 instance dies → load balancer's health check removes it within seconds, Auto Scaling launches a replacement — users see at most one failed request. RDS primary dies → Multi-AZ auto-promotes the standby in 1–2 minutes, no connection-string change needed. Region-wide outage → requires a pre-built second region, cross-region replica, and Route 53 DNS failover; expect a few minutes of downtime even then. CloudWatch alarms (e.g. error rate or latency thresholds) are what actually tell a human something happened.

*Source: [02-AWS-Basics.md#2-how-do-you-handle-failures](02-AWS-Basics.md#2-how-do-you-handle-failures)*

### 3. How do you optimize AWS costs?

**Answer:** Reserved Instances or a Savings Plan for anything running continuously (40–70% off vs On-Demand); Spot Instances for interruption-tolerant batch work (~70% off); S3 Intelligent-Tiering for unpredictable access patterns; Lambda instead of an idle EC2 instance for short, occasional jobs; CloudFront to cut origin bandwidth costs. Each has a trade-off (commitment, interruption risk, cold starts) that has to match the actual workload.

*Source: [02-AWS-Basics.md#3-how-do-you-optimize-aws-costs](02-AWS-Basics.md#3-how-do-you-optimize-aws-costs)*

### 4. EC2 vs Lambda — when would you use each?

**Answer:** EC2 for a long-running server (the main Spring Boot app) or anything needing more than 15 minutes or full OS control. Lambda for short, event-triggered work (resize an image on upload, a scheduled job, a low-traffic endpoint) where you don't want to manage a server and only pay for actual execution time.

*Source: [02-AWS-Basics.md#4-ec2-vs-lambda--when-would-you-use-each](02-AWS-Basics.md#4-ec2-vs-lambda--when-would-you-use-each)*

### 5. What do full-stack developers actually use S3 for?

**Answer:** Storing files — user uploads, static frontend hosting, backups/exports, and presigned-URL direct uploads from the browser. Not for querying data (RDS/DynamoDB) or fast key lookups (a cache) — S3 is built for whole files.

*Source: [02-AWS-Basics.md#5-what-do-full-stack-developers-actually-use-s3-for](02-AWS-Basics.md#5-what-do-full-stack-developers-actually-use-s3-for)*

### 6. What's a security group, and how is it different from a VPC?

**Answer:** A VPC is the whole private network's shape (which subnets exist, how they connect). A security group is a firewall on one specific resource, saying exactly what traffic is allowed in/out. VPC is the building's floor plan; a security group is the lock on one door.

*Source: [02-AWS-Basics.md#6-whats-a-security-group-and-how-is-it-different-from-a-vpc](02-AWS-Basics.md#6-whats-a-security-group-and-how-is-it-different-from-a-vpc)*

### 7. RDS vs DynamoDB — when would you pick each?

**Answer:** RDS (managed relational, Postgres/MySQL) when data has real relationships and you need transactions/joins — the default for most app data. DynamoDB (managed key-value/document) for extremely fast lookups by key at massive scale, no joins needed. Same SQL-vs-NoSQL decision, just AWS's managed versions of each.

*Source: [02-AWS-Basics.md#7-rds-vs-dynamodb--when-would-you-pick-each](02-AWS-Basics.md#7-rds-vs-dynamodb--when-would-you-pick-each)*

---

## [3. Microservices Architecture (Beginner-Friendly)](03-Microservices-Architecture.md)

### 1. When should you use microservices?

**Answer:** When different parts of the system need to scale independently, use different tech stacks, deploy on independent schedules, or are owned by separate teams needing clear boundaries. Avoid it for small teams, systems with no real scaling need, or tightly interconnected logic — the operational overhead (service discovery, tracing, more moving parts) isn't worth it without a real pain point to justify it. Rule of thumb: start monolith, split when needed.

*Source: [03-Microservices-Architecture.md#1-when-should-you-use-microservices](03-Microservices-Architecture.md#1-when-should-you-use-microservices)*

### 2. Design the microservices for an e-commerce system like ShopEasy.

**Answer:** User, Product/Catalog, Cart (often Redis), Order, Payment, Shipping, and Notification services, each owning its own database. Synchronous REST for anything needing an immediate answer (checking product availability); async events over Kafka/RabbitMQ for side effects (order confirmation emails). Order creation runs as a Saga across Order → Payment → Shipping with compensating transactions (refunds) on failure, accepting eventual consistency. An API Gateway fronts everything; Docker + Kubernetes handle deployment and independent scaling (Product Service scaled higher than Notification during a sale); distributed tracing and centralized logging make the whole thing debuggable.

*Source: [03-Microservices-Architecture.md#2-design-the-microservices-for-an-e-commerce-system-like-shopeasy](03-Microservices-Architecture.md#2-design-the-microservices-for-an-e-commerce-system-like-shopeasy)*

### 3. How do you handle data consistency across services?

**Answer:** With the Saga pattern — a sequence of local transactions coordinated via events, where each step is idempotent and a failed later step triggers a compensating transaction (e.g., a refund) on an earlier one, since there's no cross-service rollback. The system accepts eventual consistency rather than using a distributed transaction (2PC), which doesn't scale and isn't broadly supported.

*Source: [03-Microservices-Architecture.md#3-how-do-you-handle-data-consistency-across-services](03-Microservices-Architecture.md#3-how-do-you-handle-data-consistency-across-services)*

### 4. What is an API Gateway, and why does a microservices system need one?

**Answer:** The single entry point clients talk to — it routes requests to the correct backend service and handles auth, rate limiting, and logging once, centrally, instead of every service reimplementing them. Without one, clients need to know every service's address individually.

*Source: [03-Microservices-Architecture.md#4-what-is-an-api-gateway-and-why-does-a-microservices-system-need-one](03-Microservices-Architecture.md#4-what-is-an-api-gateway-and-why-does-a-microservices-system-need-one)*

### 5. What is service discovery?

**Answer:** A registry that every service instance registers with on startup (and sends heartbeats to), so other services can look it up by name instead of a hardcoded address that stops being valid the moment instances scale up or down. Kubernetes DNS, Eureka, and Consul are common implementations.

*Source: [03-Microservices-Architecture.md#5-what-is-service-discovery](03-Microservices-Architecture.md#5-what-is-service-discovery)*

### 6. Why can't microservices just share one database?

**Answer:** It recreates the coupling microservices are meant to remove — a schema change from one team can break another's service, one team's heavy query can degrade performance for everyone, and no service can pick a database technology suited to its own workload. Each service should own its own database and expose an API for others to get its data.

*Source: [03-Microservices-Architecture.md#6-why-cant-microservices-just-share-one-database](03-Microservices-Architecture.md#6-why-cant-microservices-just-share-one-database)*

### 7. REST vs a message queue for calling another service — how do you choose?

**Answer:** Use REST (synchronous) when you need the answer immediately to continue (checking if a user exists before creating an order) — the trade-off is that a slow or down callee makes your request stuck too. Use a message queue (Kafka/RabbitMQ/SQS) when the caller doesn't need to wait (sending a confirmation email) — the trade-off is the two services become only eventually consistent. If the user is waiting on that data, use REST; if it's a side effect, use a queue.

*Source: [03-Microservices-Architecture.md#7-rest-vs-a-message-queue-for-calling-another-service--how-do-you-choose](03-Microservices-Architecture.md#7-rest-vs-a-message-queue-for-calling-another-service--how-do-you-choose)*

### 8. What does Kubernetes actually solve that manual deployment doesn't?

**Answer:** You declare a desired state (3 replicas) and it keeps enforcing it: restarting crashed pods automatically (self-healing), scaling replicas up/down based on load via a `HorizontalPodAutoscaler` (solving the monolith's "scale everything together" problem), rolling out updates with zero downtime, and giving every service discoverability via internal DNS.

*Source: [03-Microservices-Architecture.md#8-what-does-kubernetes-actually-solve-that-manual-deployment-doesnt](03-Microservices-Architecture.md#8-what-does-kubernetes-actually-solve-that-manual-deployment-doesnt)*

### 9. Why split services by business capability instead of by technical layer?

**Answer:** A split by layer ("database service," "API service") still needs constant cross-calls for almost everything, so it adds network overhead without removing coupling. Splitting by business capability (Domain-Driven Design) means each service owns both the logic and the data for one part of the business, giving it a real, independent boundary.

*Source: [03-Microservices-Architecture.md#9-why-split-services-by-business-capability-instead-of-by-technical-layer](03-Microservices-Architecture.md#9-why-split-services-by-business-capability-instead-of-by-technical-layer)*

---

## [4. Docker Fundamentals (Beginner-Friendly)](docker-notes-twitter-clone.md)

### 1. What's the actual difference between an image and a container?

**Answer:** An image is the read-only blueprint, built once from a Dockerfile. A container is a running instance of that image. The same image can be started as many separate, independent containers at once — it's the difference between a class and an object.

*Source: [docker-notes-twitter-clone.md#1-whats-the-actual-difference-between-an-image-and-a-container](docker-notes-twitter-clone.md#1-whats-the-actual-difference-between-an-image-and-a-container)*

### 2. Why use a multi-stage Dockerfile instead of one stage?

**Answer:** Build tools (Maven, npm) and source code are only needed to *produce* the final artifact (a jar, a bundled JS app) — they don't need to ship in the image that runs in production. A multi-stage build compiles in one stage and copies only the finished output into a lean final stage, which is why the Twitter-clone backend image ends up as just a JRE + a jar, not a full Maven+JDK toolchain.

*Source: [docker-notes-twitter-clone.md#2-why-use-a-multi-stage-dockerfile-instead-of-one-stage](docker-notes-twitter-clone.md#2-why-use-a-multi-stage-dockerfile-instead-of-one-stage)*

### 3. What does Docker Compose actually solve that plain `docker run` doesn't?

**Answer:** A real app is usually several containers (a database, a backend, a frontend) that need to start together, share a network, and know about each other by name. Compose defines all of that once in a YAML file instead of a long sequence of manually-run `docker run` commands with matching network/port flags typed out by hand every time.

*Source: [docker-notes-twitter-clone.md#3-what-does-docker-compose-actually-solve-that-plain-docker-run-doesnt](docker-notes-twitter-clone.md#3-what-does-docker-compose-actually-solve-that-plain-docker-run-doesnt)*

### 4. Why can't two containers reach each other using `localhost`?

**Answer:** Each container has its own isolated network namespace, so `localhost` inside a container refers only to that container itself, not the host machine or any other container. Containers on the same Docker network reach each other by service/container **name** instead (e.g., a backend connecting to `jdbc:postgresql://db:5432/...`, where `db` is the database service's name in `docker-compose.yml`).

*Source: [docker-notes-twitter-clone.md#4-why-cant-two-containers-reach-each-other-using-localhost](docker-notes-twitter-clone.md#4-why-cant-two-containers-reach-each-other-using-localhost)*

### 5. What's a Docker volume for, and why does removing a container lose data without one?

**Answer:** A container's own writable layer is deleted the moment the container is removed, so anything written there (like a database's data files) vanishes with it. A volume is storage that lives outside that writable layer, so the data survives even after the container that used it is stopped or removed — exactly why the Postgres service mounts `db-data:/var/lib/postgresql/data`.

*Source: [docker-notes-twitter-clone.md#5-whats-a-docker-volume-for-and-why-does-removing-a-container-lose-data-without-one](docker-notes-twitter-clone.md#5-whats-a-docker-volume-for-and-why-does-removing-a-container-lose-data-without-one)*

### 6. Why isn't `depends_on` alone enough to guarantee the database is ready?

**Answer:** It only waits for the dependency's container to start, not for the software inside it to finish its own startup and become ready to accept connections. A healthcheck (like `pg_isready`) combined with `condition: service_healthy` makes a dependent service wait for genuine readiness instead.

*Source: [docker-notes-twitter-clone.md#6-why-isnt-depends_on-alone-enough-to-guarantee-the-database-is-ready](docker-notes-twitter-clone.md#6-why-isnt-depends_on-alone-enough-to-guarantee-the-database-is-ready)*

### 7. Why does the frontend proxy `/api/` through Nginx instead of the browser calling the backend directly?

**Answer:** Calling a different origin directly from the browser hits CORS restrictions. Routing `/api/` through Nginx means the browser only talks to one origin; Nginx forwards the request to the backend server-to-server, where CORS doesn't apply.

*Source: [docker-notes-twitter-clone.md#7-why-does-the-frontend-proxy-api-through-nginx-instead-of-the-browser-calling-the-backend-directly](docker-notes-twitter-clone.md#7-why-does-the-frontend-proxy-api-through-nginx-instead-of-the-browser-calling-the-backend-directly)*
