# DevOps & Cloud — Master Question Bank

This file aggregates every interview question, with its full answer, from every file in this `DevOps-Cloud/` folder — [01-CI-CD-Fundamentals.md](01-CI-CD-Fundamentals.md), [02-AWS-Basics.md](02-AWS-Basics.md), [03-Microservices-Architecture.md](03-Microservices-Architecture.md), and [docker-notes-twitter-clone.md](docker-notes-twitter-clone.md) — into one place for quick revision. Each question is reproduced verbatim from its source file and links back to that file (and the exact heading within it) so you can open the original for the full surrounding context, scenarios, and diagrams.

---

## [1. CI/CD Fundamentals (Beginner-Friendly)](01-CI-CD-Fundamentals.md)

### 1. What's the difference between CI, Continuous Delivery, and Continuous Deployment?

**Answer:** Think of it as three levels, each one automating more than the last. CI is the first level — every time code gets merged, it's automatically built and tested, so if something's broken you find out in minutes, not days. Continuous Delivery is the next level up — once code passes CI, it's packaged and sitting ready to ship, but a human still clicks the button to release it. Continuous Deployment is the last level — that approval step disappears too, so a change that passes everything goes live on its own.

*Source: [01-CI-CD-Fundamentals.md#1-whats-the-difference-between-ci-continuous-delivery-and-continuous-deployment](01-CI-CD-Fundamentals.md#1-whats-the-difference-between-ci-continuous-delivery-and-continuous-deployment)*

### 2. Describe a CI/CD pipeline for a Spring Boot service.

**Answer:** Picture the journey a single code change takes, step by step. It starts with a push to Git, which triggers a webhook that kicks off the pipeline. The pipeline builds the JAR, then runs unit tests, then integration tests, then a quality and security scan. Next it builds a Docker image exactly once and tags it — that one image is what travels through every later stage, nothing gets rebuilt. It pushes that image to a registry, deploys it to staging, and smoke-tests it there. Finally it deploys to production — either automatically or with manual approval — using a gradual rollout, and monitoring keeps watching error rate and latency the whole way through.

*Source: [01-CI-CD-Fundamentals.md#2-describe-a-cicd-pipeline-for-a-spring-boot-service](01-CI-CD-Fundamentals.md#2-describe-a-cicd-pipeline-for-a-spring-boot-service)*

### 3. How do you handle secrets in CI/CD?

**Answer:** Golden rule: a real secret never touches source control, full stop. Instead, it goes into an encrypted secrets manager — something like GitHub Secrets, AWS Secrets Manager, or Vault — and the pipeline just references it by name. On top of that, each pipeline only gets access to the secrets it actually needs, nothing more, and you rotate secrets periodically so a leaked one doesn't stay dangerous forever.

*Source: [01-CI-CD-Fundamentals.md#3-how-do-you-handle-secrets-in-cicd](01-CI-CD-Fundamentals.md#3-how-do-you-handle-secrets-in-cicd)*

### 4. How would you deploy with zero downtime?

**Answer:** The go-to answer here is blue-green deployment. Picture two identical environments, blue and green — one live, one idle. You bring the new version up fully in the idle one, health-check it, and once it's healthy the load balancer flips all traffic over in one shot. The old version doesn't get torn down right away — it keeps running for a while — so if anything goes wrong, rollback is just flipping traffic back.

*Source: [01-CI-CD-Fundamentals.md#4-how-would-you-deploy-with-zero-downtime](01-CI-CD-Fundamentals.md#4-how-would-you-deploy-with-zero-downtime)*

### 5. Blue-green vs. canary vs. rolling — when would you use each?

**Answer:** Three strategies, three trade-offs. Blue-green is the fastest — instant switch, instant rollback — but it costs you a whole second environment sitting idle. Canary is the cautious one: you send just a small slice of traffic to the new version first, and only grow that slice if the metrics stay healthy — perfect when you want to limit how many users a bad build could hurt. Rolling is the cheap one: it swaps out instances gradually, no second environment needed, but it's slower, and it only works safely if the old and new versions can run side by side without conflicting.

*Source: [01-CI-CD-Fundamentals.md#5-blue-green-vs-canary-vs-rolling--when-would-you-use-each](01-CI-CD-Fundamentals.md#5-blue-green-vs-canary-vs-rolling--when-would-you-use-each)*

### 6. What is a build artifact, and why not just rebuild it at every stage?

**Answer:** An artifact is just the actual thing you deploy — a JAR, a Docker image. Here's the danger of rebuilding it fresh at every stage: even a tiny difference, like a dependency version, means you could end up shipping something that was never actually tested. So the rule is "build once, deploy everywhere" — you build the artifact one time, tag it, and that exact same artifact rides through every later stage untouched. That way you can guarantee what you ship is exactly what you tested.

*Source: [01-CI-CD-Fundamentals.md#6-what-is-a-build-artifact-and-why-not-just-rebuild-it-at-every-stage](01-CI-CD-Fundamentals.md#6-what-is-a-build-artifact-and-why-not-just-rebuild-it-at-every-stage)*

### 7. What do you monitor after a deployment, and what triggers a rollback?

**Answer:** There are three buckets to watch after a deploy: application metrics like error rate and latency, infrastructure metrics like CPU and memory, and business metrics when they're relevant. The key idea is that rollback shouldn't wait on a human noticing something's wrong — it should be automated, firing the moment error rate or latency crosses a set threshold shortly after the deploy goes out.

*Source: [01-CI-CD-Fundamentals.md#7-what-do-you-monitor-after-a-deployment-and-what-triggers-a-rollback](01-CI-CD-Fundamentals.md#7-what-do-you-monitor-after-a-deployment-and-what-triggers-a-rollback)*

### 8. Why run automated tests in the pipeline instead of relying on manual testing?

**Answer:** Simple way to put it: a pipeline never forgets a step, a human sometimes does. Automated tests run the exact same checks the exact same way on every single commit, and they finish in minutes, so every developer gets the same fast feedback loop. That doesn't make manual testing useless — it's still valuable for exploratory testing and checking the UX — it's just not a substitute for automatically catching regressions every time, consistently.

*Source: [01-CI-CD-Fundamentals.md#8-why-run-automated-tests-in-the-pipeline-instead-of-relying-on-manual-testing](01-CI-CD-Fundamentals.md#8-why-run-automated-tests-in-the-pipeline-instead-of-relying-on-manual-testing)*

---

## [2. AWS Basics (Beginner-Friendly)](02-AWS-Basics.md)

### 1. Design a web application on AWS for ~1M users, 1k requests/sec, high availability.

**Answer:** Picture the request coming in and follow it through the stack. Route 53 handles DNS. CloudFront caches static assets close to the user. Requests hit an ALB, which spreads them across an EC2 Auto Scaling Group — say 10 `t3.large` instances as a baseline, scaling up with load. Data lives in RDS with Multi-AZ turned on. Files and backups sit in S3. CloudWatch watches over all of it. And where does the high availability actually come from? Three specific things: EC2 spread across multiple availability zones, RDS Multi-AZ failover, and the load balancer's health checks quietly removing anything unhealthy.

*Source: [02-AWS-Basics.md#1-design-a-web-application-on-aws-for-1m-users-1k-requestssec-high-availability](02-AWS-Basics.md#1-design-a-web-application-on-aws-for-1m-users-1k-requestssec-high-availability)*

### 2. How do you handle failures?

**Answer:** Best way to answer this is scenario by scenario. If an EC2 instance dies, the load balancer's health check notices within seconds and pulls it out of rotation, then Auto Scaling launches a replacement — worst case, a user sees one failed request. If the RDS primary dies, Multi-AZ automatically promotes the standby in one to two minutes, and the app doesn't even need a new connection string. If a whole region goes down — the hard one — you need a second region already built, a cross-region replica, and Route 53 doing DNS failover, and even then expect a few minutes of downtime. Through all of this, CloudWatch alarms — on things like error rate or latency thresholds — are what actually tell a human that something happened.

*Source: [02-AWS-Basics.md#2-how-do-you-handle-failures](02-AWS-Basics.md#2-how-do-you-handle-failures)*

### 3. How do you optimize AWS costs?

**Answer:** Think of it as matching the pricing model to the workload. For anything running continuously, use Reserved Instances or a Savings Plan — that's 40 to 70 percent off versus On-Demand. For batch work that can tolerate being interrupted, Spot Instances save around 70 percent. For storage with unpredictable access patterns, use S3 Intelligent-Tiering. For short, occasional jobs, use Lambda instead of leaving an EC2 instance idle. And CloudFront cuts your origin bandwidth costs. The catch with every one of these is a trade-off — a commitment, an interruption risk, a cold start — and it only actually saves money if it matches the real workload.

*Source: [02-AWS-Basics.md#3-how-do-you-optimize-aws-costs](02-AWS-Basics.md#3-how-do-you-optimize-aws-costs)*

### 4. EC2 vs Lambda — when would you use each?

**Answer:** Rule of thumb: EC2 for anything long-running, Lambda for anything short and event-driven. Use EC2 for your main server — like the core Spring Boot app — or anything that needs more than 15 minutes to run or needs full control over the OS. Use Lambda for short, triggered work — resizing an image after upload, a scheduled job, a low-traffic endpoint — where you don't want to manage a server at all, and you only pay for the time it actually runs.

*Source: [02-AWS-Basics.md#4-ec2-vs-lambda--when-would-you-use-each](02-AWS-Basics.md#4-ec2-vs-lambda--when-would-you-use-each)*

### 5. What do full-stack developers actually use S3 for?

**Answer:** S3 is for whole files, not queries. Full-stack developers reach for it to store user uploads, host static frontend files, keep backups and exports, and let the browser upload directly using a presigned URL. What it's not for: querying structured data — that's RDS or DynamoDB's job — or fast key lookups, which is what a cache is for.

*Source: [02-AWS-Basics.md#5-what-do-full-stack-developers-actually-use-s3-for](02-AWS-Basics.md#5-what-do-full-stack-developers-actually-use-s3-for)*

### 6. What's a security group, and how is it different from a VPC?

**Answer:** Easiest way to remember it: a VPC is the building, a security group is the lock on one door. The VPC is the shape of your whole private network — what subnets exist, how they connect to each other. A security group is much narrower — it's a firewall on one specific resource, saying exactly what traffic is allowed in or out of it.

*Source: [02-AWS-Basics.md#6-whats-a-security-group-and-how-is-it-different-from-a-vpc](02-AWS-Basics.md#6-whats-a-security-group-and-how-is-it-different-from-a-vpc)*

### 7. RDS vs DynamoDB — when would you pick each?

**Answer:** It's really the same SQL-versus-NoSQL decision, just wearing AWS's managed clothing. Pick RDS — managed Postgres or MySQL — when your data has real relationships and you need transactions or joins; that's the default for most application data. Pick DynamoDB — managed key-value or document storage — when you need extremely fast lookups by key at massive scale and joins aren't part of the picture.

*Source: [02-AWS-Basics.md#7-rds-vs-dynamodb--when-would-you-pick-each](02-AWS-Basics.md#7-rds-vs-dynamodb--when-would-you-pick-each)*

---

## [3. Microservices Architecture (Beginner-Friendly)](03-Microservices-Architecture.md)

### 1. When should you use microservices?

**Answer:** Rule of thumb: start as a monolith, split only when it actually hurts. Microservices earn their keep when different parts of the system need to scale independently, need different tech stacks, need to deploy on their own schedule, or are owned by separate teams that need a clear boundary between them. But if you're a small team, don't have a real scaling need, or your logic is tightly interconnected, skip it — the operational overhead of service discovery, distributed tracing, and just having more moving parts isn't worth paying without a real pain point driving it.

*Source: [03-Microservices-Architecture.md#1-when-should-you-use-microservices](03-Microservices-Architecture.md#1-when-should-you-use-microservices)*

### 2. Design the microservices for an e-commerce system like ShopEasy.

**Answer:** Picture ShopEasy broken into services, each one owning its own slice of the business and its own database: User, Product/Catalog, Cart — often backed by Redis — Order, Payment, Shipping, and Notification. For communication, the rule is simple: need an answer right now, use synchronous REST — like checking product availability. It's just a side effect that can happen a little later, use async events over Kafka or RabbitMQ — like sending an order confirmation email. Order creation is the tricky part — it runs as a Saga that flows through Order, then Payment, then Shipping, and if a later step fails, it triggers a compensating transaction, like a refund, to undo an earlier one. That means the system accepts eventual consistency rather than a hard rollback. On top of that, an API Gateway sits in front as the single entry point, Docker and Kubernetes handle deployment and let each service scale independently — say, scaling up Product Service more than Notification during a big sale — and distributed tracing plus centralized logging are what make the whole thing debuggable.

*Source: [03-Microservices-Architecture.md#2-design-the-microservices-for-an-e-commerce-system-like-shopeasy](03-Microservices-Architecture.md#2-design-the-microservices-for-an-e-commerce-system-like-shopeasy)*

### 3. How do you handle data consistency across services?

**Answer:** The answer here is the Saga pattern. Instead of one big transaction spanning services — which doesn't really exist in a distributed system — you run a sequence of local transactions, each one triggered by an event, and each one designed to be idempotent. If a later step fails, you can't roll back the earlier ones — there's no cross-service rollback — so instead you run a compensating transaction, like issuing a refund, to undo the effect. The system accepts eventual consistency rather than reaching for a distributed transaction — two-phase commit — which doesn't scale well and isn't broadly supported anyway.

*Source: [03-Microservices-Architecture.md#3-how-do-you-handle-data-consistency-across-services](03-Microservices-Architecture.md#3-how-do-you-handle-data-consistency-across-services)*

### 4. What is an API Gateway, and why does a microservices system need one?

**Answer:** Think of the API Gateway as the one front door for a system full of services behind it. Clients only ever talk to the gateway; it routes each request to the right backend service, and it handles authentication, rate limiting, and logging once, centrally — instead of every single service reimplementing all of that on its own. Without a gateway, every client would need to know the address of every service individually, which doesn't scale.

*Source: [03-Microservices-Architecture.md#4-what-is-an-api-gateway-and-why-does-a-microservices-system-need-one](03-Microservices-Architecture.md#4-what-is-an-api-gateway-and-why-does-a-microservices-system-need-one)*

### 5. What is service discovery?

**Answer:** Picture a phone book that updates itself in real time. Every service instance registers itself in that registry on startup and keeps sending heartbeats to prove it's still alive. Other services look it up by name instead of relying on a hardcoded address — which would break the moment instances scale up or down. Kubernetes DNS, Eureka, and Consul are the common ways to actually implement this.

*Source: [03-Microservices-Architecture.md#5-what-is-service-discovery](03-Microservices-Architecture.md#5-what-is-service-discovery)*

### 6. Why can't microservices just share one database?

**Answer:** Short answer: sharing a database quietly brings back the exact coupling microservices were supposed to remove. If one team changes the schema, it can break another team's service without warning. If one team runs a heavy query, it can degrade performance for everyone else. And no service gets to pick a database technology that actually fits its own workload. So the rule is: each service owns its own database, and if another service needs that data, it goes through an API, not a direct query.

*Source: [03-Microservices-Architecture.md#6-why-cant-microservices-just-share-one-database](03-Microservices-Architecture.md#6-why-cant-microservices-just-share-one-database)*

### 7. REST vs a message queue for calling another service — how do you choose?

**Answer:** Simple rule: if the caller is standing there waiting for the answer, use REST; if it's just a side effect, use a queue. Use REST — synchronous — when you need the answer immediately to keep going, like checking whether a user exists before creating an order. The trade-off is that if the callee is slow or down, your request gets stuck too. Use a message queue — Kafka, RabbitMQ, SQS — when the caller doesn't need to wait around, like sending a confirmation email. The trade-off there is the two services only stay eventually consistent, not immediately in sync.

*Source: [03-Microservices-Architecture.md#7-rest-vs-a-message-queue-for-calling-another-service--how-do-you-choose](03-Microservices-Architecture.md#7-rest-vs-a-message-queue-for-calling-another-service--how-do-you-choose)*

### 8. What does Kubernetes actually solve that manual deployment doesn't?

**Answer:** The core idea is you tell Kubernetes the state you want, and it just keeps making that true. You declare something like "I want 3 replicas running," and Kubernetes enforces it continuously: it restarts crashed pods on its own — that's self-healing — it scales replicas up or down based on load through a `HorizontalPodAutoscaler`, which solves the monolith's old problem of having to scale everything together. It also rolls out updates with zero downtime, and it gives every service discoverability through internal DNS automatically.

*Source: [03-Microservices-Architecture.md#8-what-does-kubernetes-actually-solve-that-manual-deployment-doesnt](03-Microservices-Architecture.md#8-what-does-kubernetes-actually-solve-that-manual-deployment-doesnt)*

### 9. Why split services by business capability instead of by technical layer?

**Answer:** Here's the trap: splitting services by technical layer — a "database service," an "API service" — sounds like a split, but it isn't really one, because almost everything still needs constant calls back and forth between those layers. That just adds network overhead without actually removing the coupling. Splitting by business capability instead — this is Domain-Driven Design — means each service owns both the logic and the data for one real part of the business, so it actually has an independent boundary that means something.

*Source: [03-Microservices-Architecture.md#9-why-split-services-by-business-capability-instead-of-by-technical-layer](03-Microservices-Architecture.md#9-why-split-services-by-business-capability-instead-of-by-technical-layer)*

---

## [4. Docker Fundamentals (Beginner-Friendly)](docker-notes-twitter-clone.md)

### 1. What's the actual difference between an image and a container?

**Answer:** Easiest way to remember it: an image is a class, a container is an object made from that class. The image is the read-only blueprint, built once from a Dockerfile. A container is one running instance of that blueprint, and you can start as many separate, independent containers from the same image as you want.

*Source: [docker-notes-twitter-clone.md#1-whats-the-actual-difference-between-an-image-and-a-container](docker-notes-twitter-clone.md#1-whats-the-actual-difference-between-an-image-and-a-container)*

### 2. Why use a multi-stage Dockerfile instead of one stage?

**Answer:** The key insight is that build tools and source code are only needed to *produce* the final artifact — they don't need to ship with it. Things like Maven or npm, plus the raw source code, are only there to build the jar or the bundled JS app; production doesn't need any of that hanging around. A multi-stage build does the compiling in one stage, then copies over only the finished output into a lean final stage. That's exactly why the Twitter-clone backend image ends up as just a JRE plus a jar — not a full Maven-and-JDK toolchain along for the ride.

*Source: [docker-notes-twitter-clone.md#2-why-use-a-multi-stage-dockerfile-instead-of-one-stage](docker-notes-twitter-clone.md#2-why-use-a-multi-stage-dockerfile-instead-of-one-stage)*

### 3. What does Docker Compose actually solve that plain `docker run` doesn't?

**Answer:** Real apps are almost never just one container — usually it's a database, a backend, and a frontend, all needing to start together, share a network, and find each other by name. Compose lets you define all of that once, in a single YAML file, instead of manually typing out a long sequence of `docker run` commands with matching network and port flags every single time.

*Source: [docker-notes-twitter-clone.md#3-what-does-docker-compose-actually-solve-that-plain-docker-run-doesnt](docker-notes-twitter-clone.md#3-what-does-docker-compose-actually-solve-that-plain-docker-run-doesnt)*

### 4. Why can't two containers reach each other using `localhost`?

**Answer:** The thing to remember: each container thinks it's its own little machine. Every container gets its own isolated network namespace, so `localhost` inside a container only ever points back to that same container — not the host, not any other container. To talk to each other, containers on the same Docker network use the service or container **name** instead — that's why a backend connects using something like `jdbc:postgresql://db:5432/...`, where `db` is just the database service's name from `docker-compose.yml`.

*Source: [docker-notes-twitter-clone.md#4-why-cant-two-containers-reach-each-other-using-localhost](docker-notes-twitter-clone.md#4-why-cant-two-containers-reach-each-other-using-localhost)*

### 5. What's a Docker volume for, and why does removing a container lose data without one?

**Answer:** Here's the mental picture: a container's writable layer is temporary, a volume is permanent. The moment you remove a container, its own writable layer gets deleted, and anything written there — like a database's data files — disappears with it. A volume lives outside that writable layer, so the data survives even after the container using it is stopped or removed. That's exactly why the Postgres service mounts `db-data:/var/lib/postgresql/data`.

*Source: [docker-notes-twitter-clone.md#5-whats-a-docker-volume-for-and-why-does-removing-a-container-lose-data-without-one](docker-notes-twitter-clone.md#5-whats-a-docker-volume-for-and-why-does-removing-a-container-lose-data-without-one)*

### 6. Why isn't `depends_on` alone enough to guarantee the database is ready?

**Answer:** `depends_on` only checks that the container has started — not that the software inside it is actually ready to do its job. A database container can be "started" for several seconds before Postgres itself is actually ready to accept connections. The fix is a healthcheck — something like `pg_isready` — combined with `condition: service_healthy`, which makes a dependent service actually wait for genuine readiness instead of just a started container.

*Source: [docker-notes-twitter-clone.md#6-why-isnt-depends_on-alone-enough-to-guarantee-the-database-is-ready](docker-notes-twitter-clone.md#6-why-isnt-depends_on-alone-enough-to-guarantee-the-database-is-ready)*

### 7. Why does the frontend proxy `/api/` through Nginx instead of the browser calling the backend directly?

**Answer:** The short version: routing through Nginx keeps the browser talking to only one origin, which sidesteps CORS entirely. If the browser called the backend directly, that would be a different origin, and that runs straight into CORS restrictions. By routing `/api/` through Nginx instead, the browser only ever talks to one origin, and Nginx forwards the request to the backend server-to-server, where CORS doesn't apply at all.

*Source: [docker-notes-twitter-clone.md#7-why-does-the-frontend-proxy-api-through-nginx-instead-of-the-browser-calling-the-backend-directly](docker-notes-twitter-clone.md#7-why-does-the-frontend-proxy-api-through-nginx-instead-of-the-browser-calling-the-backend-directly)*
