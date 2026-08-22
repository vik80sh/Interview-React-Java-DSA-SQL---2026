# Microservices Architecture
## Design Patterns, Communication, Deployment, Best Practices

---

## TABLE OF CONTENTS
1. Microservices Fundamentals
2. Service Communication Patterns
3. Data Management
4. Deployment & Scaling
5. Challenges & Solutions
6. Interview Questions

---

# PART 1: MICROSERVICES FUNDAMENTALS

## Monolith vs Microservices

```
MONOLITH ARCHITECTURE:
┌─────────────────────────────┐
│       Single Application    │
├─────────────────────────────┤
│ User Service                │
│ Order Service               │
│ Payment Service             │
│ Notification Service        │
│ Admin Dashboard             │
└─────────────────────────────┘
        ↓
    Single Database

BENEFITS:
✅ Simple to build
✅ Easy to deploy (one artifact)
✅ Easier testing (no network involved)
✅ Better performance (same process)

PROBLEMS:
❌ Hard to scale (scale everything or nothing)
❌ Hard to maintain (large codebase)
❌ Hard to update (one bug stops everything)
❌ Technology locked (all same language)
❌ Hard to develop (large team, conflicts)

EXAMPLE: 1M users, but only payment slow
├─ Scale entire monolith (waste of money)
├─ Can't scale just payment service
└─ Bad resource utilization
```

---

## Microservices Architecture

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ User Service │  │ Order Service │  │Payment Service│
│ (Java)       │  │ (Python)      │  │(Go)           │
│ Port 8001    │  │ Port 8002     │  │Port 8003      │
│ User DB      │  │ Order DB      │  │Payment DB     │
└──────────────┘  └──────────────┘  └──────────────┘
     ↑                   ↑                  ↑
     └───────────────────┴──────────────────┘
                    API Gateway
                         ↑
                    Client/User

BENEFITS:
✅ Independent scaling (scale payment service only)
✅ Technology freedom (each service own language)
✅ Team autonomy (separate teams per service)
✅ Easy to deploy (deploy service independently)
✅ Fault isolation (one service fails, others work)

PROBLEMS:
❌ Distributed system complexity
❌ Data consistency challenges
❌ Network latency (inter-service calls)
❌ Testing harder (multiple services)
❌ Operational complexity (many services to monitor)
```

---

## Service Boundaries

```
What defines a microservice?

DOMAIN-DRIVEN DESIGN (DDD):
├─ Organize by business capability
├─ Each service owns its data
├─ Services are cohesive
└─ Independent deployment unit

EXAMPLE: E-commerce application

User Service:
├─ Manages user profiles
├─ Authentication
├─ User preferences
└─ Owns user_accounts table

Order Service:
├─ Manages orders
├─ Order history
├─ Order status
└─ Owns orders table (NOT users!)

Payment Service:
├─ Process payments
├─ Payment history
├─ Refunds
└─ Owns payments table

Notification Service:
├─ Send emails
├─ Send SMS
├─ Push notifications
└─ Owns notification_queue table

RULE: Each service owns its data
- Order Service does NOT read user_accounts
- Order Service calls User Service API instead
```

---

# PART 2: SERVICE COMMUNICATION PATTERNS

## Synchronous Communication (REST/gRPC)

```
REQUEST-RESPONSE PATTERN:

User Service             Order Service
    │                         │
    ├──── Create Order ───→   │ (REST/gRPC)
    │                    Call User API
    │                         │
    │      Get User ←─────────┤
    │    {name, email} ←──────┤
    │                         │
    │    Response ←───────────┤
    │ {order_id: 123} ←───────┤
    │                         │

PROS:
✅ Simple and intuitive
✅ Synchronous (immediate feedback)
✅ Easy to debug
✅ Strong consistency

CONS:
❌ Tight coupling (Order service depends on User service)
❌ Cascading failures (if User service down, Order service fails)
❌ Performance (network latency)
❌ Scaling challenges (synchronous bottleneck)

EXAMPLE: REST API call
public class OrderService {
    @Autowired
    private RestTemplate restTemplate;
    
    public Order createOrder(String userId, List<Item> items) {
        // Call User Service to get user details
        User user = restTemplate.getForObject(
            "http://user-service/api/users/" + userId,
            User.class
        );
        
        // Create order
        Order order = new Order(user, items);
        orderRepository.save(order);
        
        return order;
    }
}

WHEN TO USE:
- Real-time need (user waiting for response)
- Strong consistency required
- Simple operations
```

---

## Asynchronous Communication (Message Queue)

```
EVENT-DRIVEN PATTERN:

Order Service            Message Queue            Notification Service
    │                           │                         │
    ├─ Order Created Event ──→  │                         │
    │    (async)                │                         │
    │  Return 202 Accepted      │                         │
    │                           ├─→ OrderCreatedEvent ──→ │
    │                           │     (async)              │
    │                           │                   Send Email
    │                           │                   Log Event
    │                           │                   Update Analytics

PROS:
✅ Loose coupling (services don't know about each other)
✅ Resilient (service down? Message waits in queue)
✅ Scalable (process at own pace)
✅ Better performance (async = faster response)

CONS:
❌ Eventual consistency (not immediate)
❌ Harder to debug (distributed)
❌ Message ordering (can be tricky)
❌ Duplicate processing (need idempotency)

EXAMPLE: Kafka/RabbitMQ
public class OrderService {
    @Autowired
    private KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    
    public Order createOrder(String userId, List<Item> items) {
        Order order = new Order(userId, items);
        orderRepository.save(order);
        
        // Publish event (async)
        OrderCreatedEvent event = new OrderCreatedEvent(order.id, userId);
        kafkaTemplate.send("orders.created", event);
        
        // Return immediately (notification will be sent later)
        return order;
    }
}

public class NotificationService {
    @KafkaListener(topics = "orders.created")
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Send email notification
        emailService.send(event.userId, "Order created!");
    }
}

MESSAGE QUEUE OPTIONS:
- Kafka (high-throughput, distributed)
- RabbitMQ (reliable, lightweight)
- AWS SQS (managed, simple)
- Google Cloud Pub/Sub (managed)

WHEN TO USE:
- Eventual consistency acceptable
- Decoupling important
- Scaling needed
- Retry logic required
```

---

## Choreography vs Orchestration

```
CHOREOGRAPHY (Event-driven):

Order Service (publishes OrderCreated)
    ↓ event
Payment Service (listens, publishes PaymentProcessed)
    ↓ event
Notification Service (listens, publishes NotificationSent)
    ↓ event
Analytics Service (listens, updates metrics)

PROS: Loose coupling, scalable
CONS: Hard to track flow, complex logic

ORCHESTRATION (Service choreography):

Order Service (calls Payment Service)
    ↓
Payment Service (calls Notification Service)
    ↓
Notification Service (calls Analytics Service)

Central coordinator (Order Service) controls flow
PROS: Clear flow, easy to understand
CONS: Tight coupling, single point of failure

HYBRID APPROACH (Best practice):
- Use choreography for independent events
- Use orchestration for transaction-like flows
```

---

# PART 3: DATA MANAGEMENT

## Database per Service

```
RULE: Each microservice owns its database

BAD:
User Service          Order Service          Payment Service
    │                      │                      │
    └──────────────────────┴──────────────────────┘
                 Shared Database
                (Hard to scale, tight coupling)

GOOD:
User Service     Order Service    Payment Service
     │                │                 │
   User DB         Order DB        Payment DB
(PostgreSQL)   (PostgreSQL)      (MongoDB)
(Independent)  (Independent)     (Independent)

BENEFITS:
✅ Technology freedom (different DB for each service)
✅ Independent scaling (scale only what's needed)
✅ Fault isolation (one DB fails, others work)
✅ Independent deployment (schema changes don't affect others)

CHALLENGES:
❌ Data consistency (what if Order Service and Payment Service disagree?)
❌ Data duplication (Order Service might cache user data)
❌ Complex queries (can't do joins across services)
```

---

## Data Consistency

```
PROBLEM: Need to ensure data consistency across services

SCENARIO: Create order
1. Order Service creates order (status = PENDING)
2. Payment Service processes payment
3. Order Service updates order (status = PAID)

If Payment Service crashes between step 2-3:
- Order is PENDING (no payment)
- But payment was already charged!
- INCONSISTENT STATE

SOLUTIONS:

SOLUTION 1: SAGA PATTERN
Order Service creates order (PENDING)
    ↓ publishes OrderCreated event
Payment Service processes payment
    ↓ publishes PaymentProcessed event
Order Service updates order (PAID)

If fails at step 2:
    ↓ Order remains PENDING
    ↓ Client retries
    ↓ Payment Service is idempotent (won't double-charge)

If fails at step 3:
    ↓ Order is PAID (eventually consistent)
    ↓ Async update may take few seconds

KEY: Each step must be idempotent (can retry safely)

SOLUTION 2: DISTRIBUTED TRANSACTIONS (2-phase commit)
❌ NOT RECOMMENDED: Complex, slow, failures hard to handle

SOLUTION 3: EVENT SOURCING
└─ Store all events (immutable log)
└─ Replay to get current state
└─ Complex but powerful

RULE: Accept eventual consistency
- User may see "pending" for few seconds
- But eventually consistent
- Better than distributed transactions
```

---

# PART 4: DEPLOYMENT & SCALING

## Container Orchestration (Kubernetes)

```
KUBERNETES = Manage containers at scale

PROBLEM: Managing 100+ microservices with Docker
❌ Manual deployment = too slow
❌ Manual scaling = reactive
❌ Manual failover = error-prone
❌ Manual rolling updates = risky

KUBERNETES SOLUTION:
- Define desired state (10 replicas of order-service)
- Kubernetes maintains that state
- Auto-scale (CPU 80% → add replicas)
- Auto-failover (pod dies → create new)
- Zero-downtime rolling updates
- Service discovery (automatic)

EXAMPLE:
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3  # Kubernetes maintains 3 replicas
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: myapp/order-service:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"  # 0.25 CPU
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale at 70% CPU

BENEFITS:
✅ Auto-scaling (based on metrics)
✅ Self-healing (automatically restart failed pods)
✅ Rolling updates (zero downtime)
✅ Service discovery (automatic DNS)
✅ Load balancing (automatic)
```

---

## Container Registries

```
DOCKER REGISTRY = Store container images

REGISTRY OPTIONS:
- Docker Hub (public, free)
- AWS ECR (Elastic Container Registry)
- Google Artifact Registry
- Azure Container Registry
- Private registries (self-hosted)

WORKFLOW:
1. Build image
   docker build -t order-service:1.0 .

2. Tag with registry
   docker tag order-service:1.0 registry.example.com/order-service:1.0

3. Push to registry
   docker push registry.example.com/order-service:1.0

4. Kubernetes pulls from registry
   image: registry.example.com/order-service:1.0

5. On update
   docker build -t order-service:1.1 .
   docker tag order-service:1.1 registry.example.com/order-service:1.1
   docker push registry.example.com/order-service:1.1
   Kubernetes automatically pulls and rolls out
```

---

# PART 5: CHALLENGES & SOLUTIONS

## Common Challenges

```
CHALLENGE 1: Service Discovery
Problem: Services don't know each other's addresses
Solution: Service registry (Consul, Eureka, Kubernetes DNS)
         All services register with registry
         Query registry to find service address

CHALLENGE 2: Load Balancing
Problem: Single service instance might be overloaded
Solution: Multiple instances + load balancer
         Kubernetes handles automatically
         Or use external LB (AWS ELB, Nginx)

CHALLENGE 3: Circuit Breaker
Problem: If downstream service slow, upstream gets stuck
Solution: Circuit breaker pattern
         ✅ If healthy: Forward request
         ⚠️ If degrading: Return cached response
         ❌ If failing: Fast-fail (don't wait)

Example:
@GetMapping("/user/{id}")
@CircuitBreaker(name = "userService", fallbackMethod = "getDefaultUser")
public User getUser(@PathVariable String id) {
    return userService.getUser(id);
}

public User getDefaultUser(String id, Exception e) {
    return new User(id, "Unknown", "unknown@example.com");
}

CHALLENGE 4: Distributed Tracing
Problem: Request spans 5 services, where's the bottleneck?
Solution: Distributed tracing (Jaeger, Zipkin, Datadog)
         Trace ID follows request across services
         See latency breakdown per service

CHALLENGE 5: Logging
Problem: Logs spread across 10 services
Solution: Centralized logging (ELK, Splunk, CloudWatch)
         All services send logs to central location
         Searchable, traceable

CHALLENGE 6: Testing
Problem: Can't test service in isolation (depends on others)
Solution: 
   - Unit tests (mock dependencies)
   - Contract tests (test API contract)
   - Integration tests (real services in Docker)
   - End-to-end tests (full system)

CHALLENGE 7: Operational Complexity
Problem: 10 services to monitor and maintain
Solution: Good observability + automation
         Monitoring (metrics, logs, traces)
         Alerting (auto-page on issues)
         Automation (auto-scaling, auto-healing)
         Dashboards (visualize health)
```

---

# PART 6: INTERVIEW QUESTIONS

## Question 1: When should you use microservices?

**Answer:**
```
USE MICROSERVICES WHEN:

1. Scale requirements vary
   - Some services need high scale, others don't
   - Example: Payment service scales differently than user service

2. Different technology stacks
   - Want to use Go for high-performance service
   - Use Python for ML service
   - Use Java for main app

3. Independent deployment needed
   - Update one service without affecting others
   - Different deployment schedules

4. Multiple teams
   - Each team owns a service
   - Reduces conflicts
   - Clear ownership boundaries

5. Different data models
   - One service uses relational DB
   - Another needs document DB
   - Another needs key-value store

DON'T use if:
❌ Team < 10 people (overhead > benefit)
❌ No scaling needs (monolith simpler)
❌ Very coupled system (defeats purpose)
❌ Data needs many transactions (hard with microservices)

RULE: Start monolith, split to microservices when needed
```

---

## Question 2: Design e-commerce microservices

**Answer:**
```
SERVICES:

1. User Service
   - User registration, authentication
   - Profile management
   - Owns user DB

2. Product Service
   - Product catalog, inventory
   - Search, filter
   - Owns product DB

3. Order Service
   - Create order, track order
   - Owns order DB

4. Payment Service
   - Process payment
   - Manage billing
   - Owns payment DB

5. Notification Service
   - Send emails, SMS
   - Order confirmation, shipment notification

6. Cart Service
   - Shopping cart
   - Can use Redis for performance

COMMUNICATION:
- REST for real-time needs (get product details)
- Kafka for async (order created → send email)
- Service-to-service auth (JWT, mTLS)

DATA CONSISTENCY:
- Order creation uses Saga pattern
- Eventual consistency accepted

DEPLOYMENT:
- Docker containers
- Kubernetes orchestration
- Each service deployed independently

SCALING:
- Product Service: 10 replicas (high reads)
- Payment Service: 5 replicas (CPU-bound)
- Notification: 2 replicas (can queue)

MONITORING:
- Distributed tracing (Jaeger)
- Centralized logging (ELK)
- Metrics (Prometheus, Grafana)
- Alerts on errors
```

---

## Question 3: How to handle database consistency in microservices?

**Answer:**
```
SAGA PATTERN (recommended):

Order Creation Saga:
1. Order Service: Create order (PENDING)
   - Publish: OrderCreatedEvent
   
2. Payment Service: (listens to OrderCreatedEvent)
   - Process payment
   - If success: Publish PaymentSucceededEvent
   - If fail: Publish PaymentFailedEvent
   
3. Order Service: (listens to PaymentSucceededEvent)
   - Update order status (PAID)
   - Publish: OrderPaidEvent
   
4. Notification Service: (listens to OrderPaidEvent)
   - Send confirmation email

IDEMPOTENCY:
- Each step must be idempotent (safe to retry)
- Payment Service checks if already charged
- Order Service checks if already updated
- Prevents double-charging, duplicate emails

FAILURE HANDLING:
If Payment Service fails:
- Order remains PENDING
- Retry payment (idempotent)
- If persistent failure: Notify customer
- Customer can retry or cancel

EVENTUAL CONSISTENCY:
- Order might be PENDING for few seconds
- Eventually becomes PAID or CANCELLED
- Acceptable for most use cases
```

---

## Question 4: What is an API Gateway, and why does a microservices system need one?

**Answer:**
```
An API Gateway is the single entry point clients (a React app, a mobile app)
actually talk to — it sits in front of all the microservices and:
- Routes each request to the right backend service (e.g., /users/* -> User
  Service, /orders/* -> Order Service)
- Handles cross-cutting concerns ONCE instead of in every service: auth
  token validation, rate limiting, request logging, CORS

WITHOUT one: the frontend would need to know every service's individual
address, and every service would have to reimplement auth/rate-limiting itself.
```

---

## Question 5: What is service discovery, explained simply?

**Answer:**
```
In a system with many service instances that scale up/down and get new IP
addresses constantly, "service discovery" is just: how does Service A find
the current address of Service B right now?

Simple version: a registry (Eureka, Consul, or Kubernetes' built-in DNS)
where every service instance registers itself on startup, and other services
look it up by NAME instead of hardcoding an IP address that will change.
```

---

## Question 6: Why can't microservices just share one database?

**Answer:**
```
Sharing a database recreates the tight coupling microservices are meant to
remove: a schema change in one team's table can silently break another
team's service, you can't scale or choose a different database technology
per service, and a single shared database becomes one giant bottleneck and
single point of failure for everything.

Instead: each service owns its own database, and if Order Service needs user
data, it calls User Service's API rather than querying the users table directly.
```

---

## Question 7: REST vs a message queue for calling another service — how do you choose?

**Answer:**
```
REST (synchronous, request/response):
- Use when you need the answer RIGHT NOW to continue (checking if a user exists
  before creating an order)
- Trade-off: if the other service is down or slow, your request is stuck too

Message Queue (asynchronous, e.g. Kafka/RabbitMQ/SQS):
- Use when the caller doesn't need to wait for the result (sending an order
  confirmation email, updating analytics)
- Trade-off: the result isn't immediate — the two services become "eventually
  consistent" instead of instantly in sync

RULE OF THUMB: if the user is waiting for that specific data to render the
next screen, use REST. If it's a side effect nobody's staring at a spinner
for, use a queue.
```

---

# SUMMARY: Microservices Mastery

✅ **Fundamentals:**
- [ ] Know monolith vs microservices
- [ ] Know when to use each
- [ ] Know service boundaries
- [ ] Know DDD concepts

✅ **Communication:**
- [ ] Know sync (REST) vs async (events)
- [ ] Know choreography vs orchestration
- [ ] Know service discovery
- [ ] Know load balancing

✅ **Data:**
- [ ] Know "one DB per service"
- [ ] Know Saga pattern
- [ ] Know eventual consistency
- [ ] Know event sourcing basics

✅ **Operations:**
- [ ] Know Kubernetes
- [ ] Know containers
- [ ] Know distributed tracing
- [ ] Know monitoring

---

**Master microservices—they're the future of large systems! 🚀**
