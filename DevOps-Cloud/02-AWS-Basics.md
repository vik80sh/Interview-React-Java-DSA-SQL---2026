# AWS Basics
## EC2, S3, RDS, Lambda, VPC, Load Balancer, CloudFront

---

## TABLE OF CONTENTS
1. AWS Fundamentals
2. Core AWS Services
3. Networking & Security
4. Common Architectures
5. Interview Questions

---

# PART 1: AWS FUNDAMENTALS

## What is AWS?

```
AWS = Amazon Web Services (Cloud Platform)

Cloud Computing:
├─ IaaS (Infrastructure as a Service)
│  └─ EC2: Rent virtual machines
├─ PaaS (Platform as a Service)
│  └─ Elastic Beanstalk: Deploy applications
└─ SaaS (Software as a Service)
   └─ Gmail, Office 365

AWS MARKET SHARE:
├─ 32% (leader)
├─ Azure: 23%
├─ Google Cloud: 10%
└─ Others: 35%

Why AWS?
✅ Largest market share
✅ Most services (200+)
✅ Mature & reliable
✅ Global infrastructure
✅ Pay-as-you-go pricing
```

---

## AWS Regions & Availability Zones

```
REGIONS: Geographic locations (30+ worldwide)
├─ us-east-1 (Virginia)
├─ us-west-2 (Oregon)
├─ eu-west-1 (Ireland)
├─ ap-southeast-1 (Singapore)
└─ More in every continent

AVAILABILITY ZONES: Multiple datacenters per region
├─ us-east-1a
├─ us-east-1b
├─ us-east-1c
└─ 2-4 per region

BENEFITS:
✅ High availability (servers in different zones)
✅ Disaster recovery (backup in different region)
✅ Lower latency (pick region near users)
```

---

# PART 2: CORE AWS SERVICES

## EC2 (Elastic Compute Cloud)

```
EC2 = Virtual machine in cloud

CONCEPT:
├─ Choose machine type (t3.medium, m5.large)
├─ Choose OS (Linux, Windows)
├─ Choose storage (EBS volume)
├─ Configure networking (VPC, security groups)
└─ Launch!

INSTANCE TYPES:
t3.micro (free tier):  1 CPU, 1GB RAM     $0/month
t3.small:              2 CPU, 2GB RAM     $17/month
t3.medium:             2 CPU, 4GB RAM     $34/month
m5.large:              2 CPU, 8GB RAM     $96/month
c5.large (compute):    2 CPU, 4GB RAM     $85/month
r5.large (memory):     2 CPU, 16GB RAM    $126/month

PRICING MODELS:
1. On-Demand: Pay per hour (most expensive)
2. Spot: Bid for unused capacity (70% cheaper, can be terminated)
3. Reserved: 1-3 year commitment (40% cheaper)
4. Savings Plan: Flexible commitment (up to 72% off)

STORAGE:
EBS (Elastic Block Store):
├─ Persistent block storage
├─ Survives instance termination
├─ Like hard drive for EC2
└─ $0.10/GB/month

Example: Web server on EC2
Instance: t3.medium ($34)
Storage: 30GB EBS ($3)
Data transfer: $0.09/GB
Total: ~$40-100/month depending on traffic

LAUNCHING:
1. AWS Console → EC2
2. Click "Launch Instance"
3. Choose AMI (Amazon Machine Image)
4. Choose instance type
5. Configure storage
6. Add security group (firewall rules)
7. Review and launch
8. SSH into server: ssh -i key.pem ec2-user@ip

SCALING:
Auto Scaling Group:
- Monitor CPU usage
- If > 70%: Launch new instance
- If < 30%: Terminate instance
- Automatically scale up/down
```

---

## S3 (Simple Storage Service)

```
S3 = Object storage (like Google Drive for data)

CONCEPT:
├─ Store files (objects) in buckets
├─ Global namespace (bucket names unique worldwide)
├─ Highly available (99.99%)
├─ Highly durable (99.999999999%)
└─ Pay per GB stored + requests

USE CASES:
- Store images, documents, videos
- Backup data
- Website hosting (static)
- Data archival
- Machine learning datasets

PRICING:
Storage: $0.023/GB/month (first 50TB)
Requests: $0.0004 per PUT/COPY/POST/LIST
Transfer: $0.09/GB out (in is free)

Example: 1TB website + 10M requests/month
Storage: 1000 GB × $0.023 = $23
Requests: 10M × $0.0004 = $4
Transfer: ~$50 (depends on traffic)
Total: ~$80/month

STORAGE CLASSES:
Standard: Frequently accessed (default)
Infrequent Access: < 1x per month ($0.0125/GB)
Glacier: Archive ($0.004/GB, slow retrieval)
Deep Archive: Long-term ($0.00099/GB, very slow)

EXAMPLE: Store images
PUT s3://my-bucket/photo.jpg
GET s3://my-bucket/photo.jpg
DELETE s3://my-bucket/photo.jpg

VERSIONING:
- Keep multiple versions of objects
- Rollback to previous versions
- $0.023/GB per version stored

STATIC WEBSITE HOSTING:
1. Create S3 bucket
2. Upload HTML/CSS/JS
3. Enable static website hosting
4. Set bucket policy to public
5. CloudFront for CDN
```

---

## RDS (Relational Database Service)

```
RDS = Managed database (PostgreSQL, MySQL, Oracle, SQL Server)

MANAGED = AWS handles:
✅ Backups
✅ Patching
✅ High availability
✅ Replication
❌ You don't manage servers

INSTANCE TYPES:
db.t3.micro:   1 vCPU, 1GB RAM    $0/month (free tier)
db.t3.small:   2 vCPU, 2GB RAM    $17/month
db.m5.large:   2 vCPU, 8GB RAM    $170/month

STORAGE:
$0.23/GB/month for database size

PRICING: 1GB database, db.t3.micro
Database: 1GB × $0.23 = $0.23
Instance: Free tier
Backups: 30 days = Free
Total: Free tier!

MULTI-AZ (High Availability):
└─ Primary in us-east-1a
└─ Standby in us-east-1b (automatic failover)
└─ Additional cost: +50% (double instance)
└─ No downtime if primary fails

READ REPLICAS:
├─ Create read-only copy
├─ Different AZ or region
├─ Used for read scaling
├─ Can promote to primary (for disaster recovery)
└─ Pay for replica instance + storage

AUTOMATED BACKUPS:
├─ Daily snapshots (30-day retention)
├─ Transaction logs (point-in-time recovery)
└─ Stored in S3 (no additional cost within retention)

SETUP:
1. AWS Console → RDS
2. Create database instance
3. Choose engine (PostgreSQL, MySQL)
4. Choose instance type (db.t3.micro)
5. Set master username & password
6. Enable backups (automatic)
7. Configure security group
8. Get endpoint: mydb.xxx.rds.amazonaws.com
9. Connect: psql -h mydb.xxx.rds.amazonaws.com -U admin
```

---

## Lambda (Serverless Computing)

```
Lambda = Run code without managing servers

CONCEPT:
├─ Upload code (function)
├─ Set memory (128MB - 10GB)
├─ AWS runs function when triggered
├─ Pay per 100ms of execution
└─ Auto-scales (no servers to manage)

PRICING:
1M invocations: Free
1M-6B invocations: $0.20 per million
Memory: $0.0000166667 per GB-second

Example: 1M requests/day, 2 second execution, 512MB
Compute: 1M/day × 30 = 30M/month × $0.20/M = $6
Duration: 30M × 2s × 512MB/1024 = 30M GB-seconds × $0.0000166667 = $0.50
Total: ~$6.50/month

TRIGGERS:
- API Gateway (HTTP request)
- S3 event (file upload)
- DynamoDB stream (database change)
- SNS (notification)
- CloudWatch (scheduled)
- Direct invocation

EXAMPLE: Resize images on S3 upload
1. Image uploaded to S3
2. S3 triggers Lambda function
3. Lambda:
   - Download image from S3
   - Resize using PIL
   - Upload thumbnail to S3
4. Returns immediately

ADVANTAGES:
✅ No server management
✅ Auto-scales
✅ Pay per execution
✅ Easy to deploy
❌ Cold start (first invocation slow)
❌ Max 15 minute execution
❌ Limited to 10GB memory

EXAMPLE CODE (Python):
def lambda_handler(event, context):
    # event = input (API request, S3 event, etc.)
    # context = metadata about invocation
    
    name = event.get('name', 'World')
    message = f"Hello, {name}!"
    
    return {
        'statusCode': 200,
        'body': message
    }

DEPLOYMENT:
1. Zip function + dependencies
2. Upload to Lambda
3. Set handler (lambda_function.lambda_handler)
4. Set memory, timeout, environment variables
5. Attach execution role (IAM)
6. Done! (scales automatically)
```

---

## VPC (Virtual Private Cloud)

```
VPC = Virtual network for AWS resources

COMPONENTS:
1. Subnets: Smaller networks within VPC
   ├─ Public (accessible from internet)
   ├─ Private (internal only)
   └─ Each in different AZ for high availability

2. Internet Gateway: Connection to internet
   └─ Attached to VPC for public access

3. NAT Gateway: Private instances access internet
   ├─ Sits in public subnet
   ├─ Private instances route through it
   └─ $0.045/hour + $0.045/GB

4. Route Tables: Define traffic routing
   ├─ "Route 0.0.0.0/0 to Internet Gateway"
   ├─ "Route 10.0.0.0/16 internal"
   └─ Different for public vs private subnets

5. Security Groups: Firewall rules
   ├─ Allow SSH (port 22) from 0.0.0.0
   ├─ Allow HTTP (port 80) from 0.0.0.0
   ├─ Allow PostgreSQL (port 5432) from 10.0.1.0/24
   └─ Stateful (return traffic auto-allowed)

TYPICAL ARCHITECTURE:
Internet
    ↓
Internet Gateway
    ↓
┌───────────────────────────────┐
│ VPC (10.0.0.0/16)             │
│ ┌───────────────────────────┐ │
│ │ Public Subnet (10.0.1.0/24)│ │
│ │ EC2 Web Servers           │ │
│ │ Security Group: Allow 80  │ │
│ └───────────────────────────┘ │
│           ↓                    │
│ ┌───────────────────────────┐ │
│ │ Private Subnet (10.0.2.0) │ │
│ │ RDS Database              │ │
│ │ Security Group: Allow 5432│ │
│ │ (only from web servers)   │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘

SETUP:
1. Create VPC (10.0.0.0/16)
2. Create public subnet (10.0.1.0/24)
3. Create private subnet (10.0.2.0/24)
4. Attach Internet Gateway
5. Create route table for public subnet
6. Route public subnet traffic to IGW
7. Create security groups (firewalls)
8. Launch EC2 in public, RDS in private
```

---

## Load Balancer (ELB)

```
ELB = Distribute traffic across servers

TYPES:
1. Application Load Balancer (ALB)
   ├─ Layer 7 (Application layer)
   ├─ Route by hostname, path, port
   ├─ Good for web applications
   └─ $0.0225/hour

2. Network Load Balancer (NLB)
   ├─ Layer 4 (Transport layer)
   ├─ Ultra-high performance
   ├─ Millions of requests/sec
   └─ $0.006/hour

3. Classic Load Balancer (deprecated)
   └─ Layer 4/7 (old)

ARCHITECTURE:
Users
  ↓
Load Balancer (DNS: myapp.us-east-1.elb.amazonaws.com)
  ├─ → EC2 Server 1 (10.0.1.10)
  ├─ → EC2 Server 2 (10.0.1.20)
  └─ → EC2 Server 3 (10.0.1.30)

FEATURES:
✅ Health checks (monitor backend)
✅ Auto-scaling (launch/terminate servers)
✅ SSL/TLS (HTTPS)
✅ Sticky sessions (same user → same server)
✅ Request routing (host-based, path-based)

PRICING (ALB):
LB hours: $0.0225/hour = $16/month
LCU (Load Capacity Units):
  New connections: $0.006 per LCU
  Active connections: $0.004 per LCU
  Processed bytes: $0.006 per LCU
Total: ~$20-50/month depending on traffic

SETUP:
1. Create ALB in AWS Console
2. Choose VPC and subnets
3. Create target group (backend servers)
4. Register EC2 instances
5. Add listener (port 80 → target group)
6. Optional: Add SSL certificate (HTTPS)
7. Done! Traffic automatically distributed
```

---

## CloudFront (CDN)

```
CloudFront = AWS Content Delivery Network

PRICING:
Data transfer out: $0.085/GB (US), $0.086 (EU), etc.
Requests: $0.0075 per 10k requests
HTTP/2 PUSH: $0.01 per 10k pushes

SETUP:
1. Create distribution
2. Point origin to:
   - S3 bucket (for static files)
   - ALB/ELB (for dynamic content)
   - Custom server
3. Set cache behaviors (TTL)
4. Deploy (takes 5-10 minutes)

BENEFITS:
✅ Global edge locations (200+)
✅ Lower latency (serve from nearby)
✅ Reduced bandwidth costs
✅ DDoS protection
✅ SSL/TLS integration
```

---

# PART 3: COMMON ARCHITECTURES

## Web Application Architecture

```
ARCHITECTURE:

Users
  ↓
CloudFront (CDN) → Caches static assets
  ├─ Images, CSS, JS
  └─ Served from edge locations
  ↓
Route 53 (DNS)
  ↓
Application Load Balancer (Auto Scaling)
  ├─ Health checks every 30 seconds
  ├─ Launch new EC2 if unhealthy
  └─ Remove unhealthy instances
  ↓
┌──────────────────────────────┐
│ EC2 Auto Scaling Group       │
├──────────────────────────────┤
│ Server 1: Spring Boot app    │ (10.0.1.10)
│ Server 2: Spring Boot app    │ (10.0.1.20)
│ Server 3: Spring Boot app    │ (10.0.1.30)
└──────────────────────────────┘
  ↓ (in private subnet)
RDS Multi-AZ (PostgreSQL)
├─ Primary (10.0.2.10)
└─ Standby (10.0.2.20)
  ↓
S3 (backups, static files)
  ↓
CloudWatch (monitoring)

SCALING:
CPU 80%+ → Launch new instance
CPU 30%- → Terminate instance
Automatic load balancing

AVAILABILITY:
- Multiple AZs (if one fails, others handle)
- Multi-AZ RDS (automatic failover)
- CloudFront caching
- Auto-scaling (no single point of failure)
```

---

# PART 4: INTERVIEW QUESTIONS

## Question 1: Design a web application on AWS

**Answer:**
```
REQUIREMENTS: 1M users, 1k QPS, high availability

ARCHITECTURE:

1. DNS: Route 53 (user traffic)
2. CDN: CloudFront (static files)
3. LB: Application Load Balancer (distribute traffic)
4. Compute: EC2 Auto Scaling Group (scale based on CPU)
5. Database: RDS Multi-AZ (high availability)
6. Storage: S3 (backups, static files)
7. Monitoring: CloudWatch (metrics & alarms)

COMPONENTS DETAIL:

EC2 Instances:
- Spring Boot application
- 1k QPS / 100 QPS per instance = 10 instances
- t3.large (2 vCPU, 8GB RAM)
- Auto scaling: Scale between 10-50 instances
- Cost: 10 × $0.104/hour × 730 hours = $760/month

RDS Database:
- PostgreSQL
- Multi-AZ (primary + standby)
- db.m5.large (2 vCPU, 8GB RAM)
- 1TB storage
- Automated backups (30 days)
- Cost: $0.25/hour × 730 + $230/month = $413/month

Load Balancer:
- Application Load Balancer
- Health checks every 30 seconds
- Route to healthy instances
- Cost: $16 + $0.006 per LCU = ~$30/month

CloudFront:
- Cache static assets (images, CSS, JS)
- Global edge locations
- Cost: $0.085/GB × 10GB = $0.85/month

TOTAL: ~$1200/month
(But provides 99.99% availability, auto-scaling, disaster recovery)
```

---

## Question 2: How do you handle failures?

**Answer:**
```
FAILURE SCENARIOS:

1. EC2 Instance fails:
   ✅ Load Balancer detects (health check fails)
   ✅ Removes from pool immediately
   ✅ Auto-scaling launches replacement
   ✅ Users don't notice (others handle traffic)

2. Database primary fails:
   ✅ RDS Multi-AZ automatic failover
   ✅ Standby becomes primary (within 1-2 minutes)
   ✅ Connection strings auto-updated
   ✅ Application reconnects transparently

3. Region-wide outage:
   ✅ Have infrastructure in backup region
   ✅ Route 53 failover (DNS points to backup region)
   ✅ RDS cross-region read replica
   ✅ Promote to primary if needed
   ✅ Downtime: Few minutes for DNS propagation

MONITORING & ALERTING:
- CloudWatch monitors CPU, memory, requests
- Alert if error rate > 0.1%
- Alert if latency > 500ms
- Automatic rollback on bad deployment
```

---

## Question 3: Cost optimization

**Answer:**
```
1. Use Reserved Instances
   - 1 year: 40% savings
   - 3 year: 60% savings
   vs On-Demand

2. Use Spot Instances for flexible workloads
   - Batch processing
   - Development/testing
   - 70% cheaper
   - Risk: Can be terminated anytime

3. RDS Savings Plan
   - Commit to usage level
   - 40% cheaper than on-demand

4. S3 Intelligent Tiering
   - Auto-move between access tiers
   - 30% savings vs Standard

5. Use Lambda for occasional workloads
   - No cost when not in use
   - Better than EC2 for spiky traffic

6. CloudFront reduces bandwidth costs
   - Serve from edge
   - Reduce data transfer

SAVINGS: 50-70% with reserved instances + optimization
```

---

## Question 4: EC2 vs Lambda — when would you use each, as a full-stack developer?

**Answer:**
```
EC2 (a virtual machine you manage):
- Use for: a long-running server (your Spring Boot app, a Node API that
  must stay warm), anything needing more than ~15 minutes to run,
  or full control over the OS/runtime
- You manage: scaling, patching, uptime (or let Auto Scaling handle it)

Lambda (serverless function):
- Use for: short-lived, event-triggered work — resize an image on S3 upload,
  a scheduled cleanup job, a lightweight API endpoint with spiky/low traffic
- You DON'T manage servers at all; pay only for actual execution time
- Trade-off: "cold starts" (first call after idle is slower), 15-minute max runtime

RULE OF THUMB: if it's your main always-on application, EC2 (or a container
platform). If it's a small, occasional, event-driven task, Lambda.
```

---

## Question 5: What do full-stack developers actually use S3 for day to day?

**Answer:**
```
S3 is object storage — not a database, a place to store FILES:
- User-uploaded content (profile photos, PDFs, videos)
- Static frontend hosting (a React build's HTML/CSS/JS, often paired with CloudFront)
- Backups and exported reports/CSVs
- As the target of a presigned-URL direct upload from the browser (so large
  files never pass through your own application server — see the file upload
  system design in the SystemDesign folder for the full pattern)

It's NOT for: data you need to query (that's RDS/DynamoDB) or fast key lookups
(that's a cache like Redis) — S3 is built for storing and retrieving whole files.
```

---

## Question 6: What's a security group, and how is it different from a VPC?

**Answer:**
```
VPC = the whole private network you carve out in AWS (like designing an office
building's floor plan — which rooms/subnets exist, how they connect).

Security Group = a firewall attached to a specific resource (an EC2 instance,
an RDS database) that says exactly which traffic is allowed in and out
- Example: "allow port 443 from anywhere, allow port 5432 only from the app
  server's security group, block everything else"

ONE LINE: VPC is the network's shape; a security group is the lock on one
specific door within it.
```

---

## Question 7: RDS vs DynamoDB — when would you pick each?

**Answer:**
```
RDS (managed relational database — Postgres/MySQL):
- Use when: your data has real relationships (users, orders, payments) and
  you need transactions/joins — this is the default choice for most app data

DynamoDB (managed key-value/document store):
- Use when: you need extremely fast, simple lookups by a known key at massive
  scale (a session store, a shopping cart, a leaderboard) and don't need joins

This is the same SQL-vs-NoSQL decision covered in depth in the
Backend/Database folder — RDS and DynamoDB are just AWS's managed versions
of "relational" and "key-value/document," respectively.
```

---

# SUMMARY: AWS Mastery

✅ **Core Services:**
- [ ] Understand EC2
- [ ] Understand S3
- [ ] Understand RDS
- [ ] Understand Lambda
- [ ] Understand VPC
- [ ] Understand Load Balancer

✅ **Architecture:**
- [ ] Can design web app
- [ ] Can handle failures
- [ ] Can optimize costs
- [ ] Can ensure high availability

✅ **Interview Skills:**
- [ ] Can discuss trade-offs
- [ ] Can estimate costs
- [ ] Can design for scale
- [ ] Can handle disasters

---

**Master AWS—it's 30-40% of backend interviews! 🚀**
