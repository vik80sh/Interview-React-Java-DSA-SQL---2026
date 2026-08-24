# AWS Basics (Beginner-Friendly)

This file follows the same approach as [Spring Boot Fundamentals](../Backend/Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name.

Running example: **PageTurner**, an online bookstore whose backend is a Spring Boot app.

---

## 1. The Problem: One Server, One Point of Failure

PageTurner starts on one rented server. Then: it crashes at 2 AM (disk full, no one watching), a sale-day traffic spike overwhelms it, or its one datacenter has an outage — and PageTurner is just down, with no quick fix.

**Cloud computing** is the fix: instead of owning hardware, you rent servers/storage/databases from a provider that already runs thousands of machines worldwide, and provision or destroy capacity in minutes. **AWS (Amazon Web Services)** is the largest such provider (Azure and Google Cloud are the other two you'll hear about). It offers 200+ services; this file covers the handful a full-stack developer actually touches: a server (EC2), file storage (S3), a managed database (RDS), on-demand code execution (Lambda), networking (VPC), traffic distribution (Load Balancer), and content delivery (CloudFront).

Quick vocabulary: **IaaS** (Infrastructure as a Service — you manage the OS, e.g. EC2), **PaaS** (Platform as a Service — you just run code, e.g. Lambda), **SaaS** (Software as a Service — you use finished software, e.g. Gmail).

**Regions** are geographic AWS locations (`us-east-1`, `ap-southeast-1`, 30+ worldwide) — pick one near your users for lower latency. Each region has 2–4 **Availability Zones (AZs)** — physically separate datacenters with independent power. Spreading your app across AZs means one datacenter failing doesn't take you down; a backup in a second region protects against a whole region failing (rare, but see section 10).

---

## 2. EC2: Renting a Virtual Machine by the Hour

**EC2 (Elastic Compute Cloud)** is a virtual machine you rent by the hour, launched in minutes instead of bought and racked over weeks.

**Instance types** (pick CPU/RAM to fit the job): `t3.micro` (1 vCPU/1GB, free tier), `t3.medium` (2 vCPU/4GB, ~$34/mo), `m5.large` (2 vCPU/8GB, ~$96/mo), plus `c5`/`r5` families for CPU- or memory-heavy work.

**Pricing models:** On-Demand (pay per hour, no commitment, most expensive), Spot (bid for spare capacity, ~70% cheaper, can be reclaimed on short notice — never for your only server), Reserved (1–3 year commitment, 40–60% off), Savings Plan (similar discount, more flexible than Reserved).

**EBS (Elastic Block Store)** is a virtual disk that attaches to an instance and survives independently of it (~$0.10/GB/month) — local disk on the instance itself disappears when the instance is terminated.

**Launching:** Console → EC2 → Launch Instance → pick an **AMI (Amazon Machine Image)**, a template with an OS pre-installed → pick instance type → attach EBS and a security group (section 6) → launch → `ssh -i key.pem ec2-user@<ip>`.

One instance still doesn't scale itself for a sale-day spike. **Auto Scaling** fixes that: define a group of identical instances and a rule ("CPU > 70% → launch one more; CPU < 30% → terminate one"), and AWS adjusts capacity automatically instead of someone manually launching servers at 2 AM.

---

## 3. S3: Where Do Uploaded Files Live?

**Scenario:** PageTurner lets users upload profile pictures and book covers. Saving them to the EC2 instance's own disk runs out of space, and once you have multiple instances behind a load balancer, a file uploaded to instance A simply doesn't exist on instance B.

**S3 (Simple Storage Service)** is object (file) storage that lives independently of any EC2 instance, reachable by every server at the same path:

```text
PUT s3://pageturner-uploads/covers/isbn-9780134685991.jpg
GET s3://pageturner-uploads/covers/isbn-9780134685991.jpg
```

You store objects in a **bucket** (globally unique name). AWS advertises 99.999999999% durability (replicated across facilities) and 99.99% availability.

**Everyday uses:** user-uploaded files, static frontend hosting (a React build, usually paired with CloudFront), backups/exports, and presigned URLs (a signed link that lets the browser upload directly to S3, skipping your app server). Not for querying data (that's RDS) or fast key lookups (that's a cache).

**Storage classes** trade cost for access speed: Standard (frequent access, ~$0.023/GB/mo), Infrequent Access (~$0.0125/GB/mo), Glacier (archive, slow retrieval, ~$0.004/GB/mo), Deep Archive (cheapest, slowest). **Intelligent-Tiering** moves objects between tiers automatically based on actual access. **Versioning** keeps prior versions of an object so an overwrite/delete can be rolled back (at extra storage cost). A bucket can also serve a **static website** directly — upload the build, enable hosting, make it public, put CloudFront in front.

---

## 4. RDS: Who Backs Up Your Database?

**Scenario:** running your own PostgreSQL on an EC2 instance means *you* patch it and back it up — and it's easy for a backup cron job to fail silently for weeks without anyone noticing, until the day you actually need it.

**RDS (Relational Database Service)** is a managed database (PostgreSQL, MySQL, Oracle, SQL Server): AWS handles automated backups (with point-in-time recovery), patching, and replication. You pick an instance size (`db.t3.micro` up to `db.m5.large`+) and pay for it plus storage (~$0.23/GB/mo) — there's no server to SSH into.

**Multi-AZ** runs a synced standby in a second AZ; if the primary fails, RDS auto-promotes the standby (1–2 minutes, no connection-string change) — this is the availability fix for the same "one AZ can go down" problem from section 1, applied to your database. **Read replicas** are a separate, read-only copy for spreading read load off the primary (and can be promoted manually in a disaster-recovery scenario, but that's secondary).

**Setup:** Console → RDS → choose engine → choose size, enable Multi-AZ for production → set credentials (never hardcode them) → confirm backup retention → restrict access via a security group → connect using the endpoint AWS gives you (`pageturner-db.xxxxx.rds.amazonaws.com`).

---

## 5. Lambda: Running Code Without a Server Sitting Idle

**Scenario:** resizing a book cover into a thumbnail after upload takes a couple seconds, a few hundred times a day. Running a whole EC2 instance just to wait around for that is mostly paying for idle time.

**Lambda** runs a function only when triggered, billed per execution time, with no server for you to manage at all. Triggers: an S3 event (upload), an API Gateway request, a scheduled CloudWatch event, a DynamoDB stream, or a direct invocation.

```python
def lambda_handler(event, context):
    name = event.get('name', 'World')
    return {'statusCode': 200, 'body': f"Hello, {name}!"}
```

**Trade-offs:** no servers to patch, auto-scales, pay-per-use — versus a **cold start** (first call after idle is slower while AWS spins up an environment), a 15-minute max runtime, and up to 10GB memory. Fine for the thumbnail job; wrong for PageTurner's main always-on app.

**Deploying:** zip the code + dependencies → upload → set the handler → set memory/timeout → attach an IAM (Identity and Access Management) execution role scoped to only what the function needs (e.g. read/write on one S3 bucket) → done, it scales on its own from there.

---

## 6. VPC: Putting Your Servers and Database Behind a Locked Door

**Scenario:** without deliberately configuring a network, it's easy to end up with a database reachable straight from the public internet, protected by nothing but a password.

**VPC (Virtual Private Cloud)** is a private network you define in AWS — like a building's floor plan: which subnets exist, and which can be reached from outside.

- **Subnets:** a **public subnet** is reachable from the internet, a **private subnet** is not. PageTurner's EC2 servers sit in public; RDS sits in private.
- **Internet Gateway:** what connects the VPC to the internet at all.
- **NAT Gateway:** lets private-subnet instances make *outbound* calls (e.g. downloading updates) without being reachable *from* the internet.
- **Route tables:** rules deciding where a subnet's traffic goes.
- **Security groups:** a firewall on one specific resource — "allow port 443 from anywhere," "allow port 5432 only from the web servers." A VPC is the network's shape; a security group is the lock on one door within it.

```text
Internet -> Internet Gateway -> VPC (10.0.0.0/16)
  Public subnet (10.0.1.0/24):  EC2 web servers, allow 80/443
  Private subnet (10.0.2.0/24): RDS, allow 5432 only from web servers
```

---

## 7. Load Balancer: Spreading Traffic Across Multiple Servers

**Scenario:** Auto Scaling (section 2) can launch several EC2 instances during a spike, but something still has to decide which instance each request goes to, and stop sending traffic to one that's stopped responding.

An **ELB (Elastic Load Balancer)** sits in front of your instances and distributes requests, using **health checks** to detect and route around unhealthy ones — this is exactly what makes an instance failure invisible to users (section 10).

**Types:** **ALB (Application Load Balancer)** — Layer 7 (HTTP-aware, routes by host/path), the normal choice for a web app. **NLB (Network Load Balancer)** — Layer 4, for extreme throughput. Classic Load Balancer is the older, effectively deprecated option.

**Setup:** create the ALB in your VPC → create a target group and register EC2 instances → add a listener (e.g. port 443 → target group) → attach an SSL/TLS certificate if terminating HTTPS here → traffic is now distributed and health-checked automatically.

---

## 8. CloudFront: Serving Content Fast to Distant Users

**Scenario:** PageTurner's servers run in `us-east-1`. A user in Singapore requesting a book cover waits for the round trip to Virginia and back — a distance problem no server-side code can fix.

**CloudFront** is AWS's CDN (Content Delivery Network): 200+ edge locations that cache content near the requester, so repeat requests are served locally instead of crossing continents. Point its origin at an S3 bucket (static assets) or a load balancer (dynamic content), set a cache TTL, and it deploys in minutes. Benefits: lower latency, reduced load/bandwidth on your origin, built-in DDoS protection, and SSL/TLS.

---

## 9. Putting It All Together

```text
Users
  -> CloudFront (caches static assets at the edge)
  -> Route 53 (DNS: resolves pageturner.com)
  -> Application Load Balancer (health-checks, distributes traffic)
  -> EC2 Auto Scaling Group (public subnet, Spring Boot app x N)
  -> RDS Multi-AZ PostgreSQL (private subnet, primary + standby)
  -> S3 (uploads, backups, static files)
  -> CloudWatch (monitors all of the above)
```

Route 53 is just AWS's managed DNS — it translates the domain name into the load balancer's address. Every arrow here is one of the sections above; reading it top to bottom is the actual request path.

---

## Interview Questions and Answers

### 1. Design a web application on AWS for ~1M users, 1k requests/sec, high availability.

**Answer:** Route 53 for DNS, CloudFront for static assets, an ALB across an EC2 Auto Scaling Group (e.g. 10 `t3.large` baseline, scaling with load), RDS Multi-AZ for the database, S3 for files/backups, CloudWatch for monitoring. High availability specifically comes from multi-AZ EC2, Multi-AZ RDS failover, and load-balancer health checks.

### 2. How do you handle failures?

**Answer:** EC2 instance dies → load balancer's health check removes it within seconds, Auto Scaling launches a replacement — users see at most one failed request. RDS primary dies → Multi-AZ auto-promotes the standby in 1–2 minutes, no connection-string change needed. Region-wide outage → requires a pre-built second region, cross-region replica, and Route 53 DNS failover; expect a few minutes of downtime even then. CloudWatch alarms (e.g. error rate or latency thresholds) are what actually tell a human something happened.

### 3. How do you optimize AWS costs?

**Answer:** Reserved Instances or a Savings Plan for anything running continuously (40–70% off vs On-Demand); Spot Instances for interruption-tolerant batch work (~70% off); S3 Intelligent-Tiering for unpredictable access patterns; Lambda instead of an idle EC2 instance for short, occasional jobs; CloudFront to cut origin bandwidth costs. Each has a trade-off (commitment, interruption risk, cold starts) that has to match the actual workload.

### 4. EC2 vs Lambda — when would you use each?

**Answer:** EC2 for a long-running server (the main Spring Boot app) or anything needing more than 15 minutes or full OS control. Lambda for short, event-triggered work (resize an image on upload, a scheduled job, a low-traffic endpoint) where you don't want to manage a server and only pay for actual execution time.

### 5. What do full-stack developers actually use S3 for?

**Answer:** Storing files — user uploads, static frontend hosting, backups/exports, and presigned-URL direct uploads from the browser. Not for querying data (RDS/DynamoDB) or fast key lookups (a cache) — S3 is built for whole files.

### 6. What's a security group, and how is it different from a VPC?

**Answer:** A VPC is the whole private network's shape (which subnets exist, how they connect). A security group is a firewall on one specific resource, saying exactly what traffic is allowed in/out. VPC is the building's floor plan; a security group is the lock on one door.

### 7. RDS vs DynamoDB — when would you pick each?

**Answer:** RDS (managed relational, Postgres/MySQL) when data has real relationships and you need transactions/joins — the default for most app data. DynamoDB (managed key-value/document) for extremely fast lookups by key at massive scale, no joins needed. Same SQL-vs-NoSQL decision, just AWS's managed versions of each.

---

## Revision Checklist

- [ ] Explain why a single server/AZ/region is a risk, and what Regions and AZs are for.
- [ ] Explain EC2 instance types, the four pricing models, and what EBS and Auto Scaling each solve.
- [ ] Explain why S3 exists instead of storing files on EC2 disk, plus storage classes and versioning.
- [ ] Explain what "managed" means in RDS, and the difference between Multi-AZ and a read replica.
- [ ] Explain when Lambda is the right choice over EC2, and its real limitations.
- [ ] Draw a VPC with public/private subnets and explain VPC vs security group.
- [ ] Explain what a load balancer's health check does and how ALB differs from NLB.
- [ ] Explain what CloudFront caches and why it helps distant users.
- [ ] Draw the full architecture (section 9) from memory and narrate one request through it.
- [ ] Answer all 7 interview questions without looking at the notes.
