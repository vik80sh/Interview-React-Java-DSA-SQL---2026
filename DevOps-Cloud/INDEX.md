# DevOps & Cloud Interview Preparation

This folder covers what a full-stack developer — not a dedicated DevOps/infra engineer — realistically needs to know: how code actually gets to production, what the common AWS (Amazon Web Services) building blocks do and why, how a system gets split into services instead of one big app, and how a container actually works. It's intentionally scoped to fresher/interview-level understanding, not exhaustive platform-engineering depth. Each file follows the same approach as [Spring Boot Fundamentals](../Backend/Springboot/01-Spring-Boot-Fundamentals.md): a concrete problem first, then the term that solves it.

## Recommended Order

1. [CI/CD Fundamentals](01-CI-CD-Fundamentals.md) — how code moves from a commit to a running production server, safely.
2. [Docker, via a Real Project](docker-notes-twitter-clone.md) — what a container actually is, worked through an actual Spring Boot + React app.
3. [AWS Basics](02-AWS-Basics.md) — the handful of AWS services almost every backend touches: EC2, S3, RDS, Lambda, VPC, load balancing.
4. [Microservices Architecture](03-Microservices-Architecture.md) — why and when an app gets split into separate services, and what that costs you.

Docker is placed before AWS deliberately: understanding what a container is makes EC2/Lambda/Kubernetes discussions far easier to follow, since most of what actually *runs* on those services is a container.

## What Mastery Looks Like

- **Explain:** you can describe the mechanism in plain language — what problem it solves, not just its name.
- **Connect:** you can say how these four files relate — a pipeline (file 1) builds and ships a container (file 2) onto cloud infrastructure (file 3), and a real system might be made of several such services talking to each other (file 4).
- **Diagnose:** given a scenario ("the deploy took the site down," "the app can't reach the database," "two services need to agree on an order's final state"), you can name the mechanism that prevents or recovers from it.

## Cross-Cutting Topics to Continue With

These four files are the practical minimum for a full-stack interview, not the ceiling. When you have time, continue into: Kubernetes in more depth, Infrastructure as Code (Terraform), a service mesh, distributed tracing, and the deeper Spring-specific microservice implementation in [08-AOP-Actuator-Microservices.md](../Backend/Springboot/08-AOP-Actuator-Microservices.md) (Eureka, Resilience4j, Kafka/RabbitMQ) — that file picks up exactly where this folder's microservices file leaves off, at the code level.

## Final Readiness Checklist

- [ ] Explain the stages of a CI/CD pipeline and name at least one deployment strategy that avoids downtime.
- [ ] Explain what a container actually is and why "it works on my machine" stops being a valid excuse once you have one.
- [ ] Know what EC2, S3, RDS, Lambda, and a load balancer are each *for*, and why you'd reach for one over another.
- [ ] Explain why a team might split a monolith into microservices, and name one real cost of doing so.
- [ ] Explain how two services keep data consistent without a single shared database transaction (the Saga pattern, at a conceptual level).

## Index Interview Questions and Answers

### 1. How do these four files connect?

**Answer:** CI/CD (file 1) is the pipeline that builds and tests your code and ships it out. Docker (file 2) is usually *what* gets shipped — a container holding your app and everything it needs to run identically anywhere. AWS (file 3) is commonly *where* that container ends up running. Microservices (file 4) is a decision about *how many* separate things you're building and deploying this way, instead of one single app.

### 2. What's the difference between what's in this folder and what's in the System Design folder?

**Answer:** This folder is about the mechanics of shipping and running code — pipelines, containers, cloud services, service boundaries. System Design is about designing a specific product's architecture (a chat app, a URL shortener) end to end, which draws on these mechanics as building blocks but focuses on the specific requirements and trade-offs of that one system.

### 3. As a full-stack developer, how deep do you actually need to go here?

**Answer:** Deep enough to have an informed conversation about how your own application gets built, containerized, deployed, and scaled — and to reason about a basic system-design question that involves more than one service. You are not expected to configure a production Kubernetes cluster from scratch; you are expected to know what one is for and how your app would run inside it.
