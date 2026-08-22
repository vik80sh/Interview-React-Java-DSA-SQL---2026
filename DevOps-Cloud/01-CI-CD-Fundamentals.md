# CI/CD Fundamentals
## Continuous Integration, Continuous Deployment, Pipelines & Best Practices

---

## TABLE OF CONTENTS
1. CI/CD Concepts
2. CI/CD Pipeline Architecture
3. CI/CD Tools (Jenkins, GitHub Actions)
4. Best Practices & Patterns
5. Common Interview Questions

---

# PART 1: CI/CD CONCEPTS

## What is CI/CD?

```
CI/CD = Continuous Integration / Continuous Deployment

Continuous Integration (CI):
├─ Developers commit code to shared repository
├─ Automated tests run immediately
├─ Code quality checked automatically
├─ Merge conflicts detected early
└─ Feedback in minutes (not days)

Continuous Deployment (CD):
├─ Code automatically deployed to production
├─ No manual deployment steps
├─ Automated rollback on failure
├─ Multiple deployments per day possible
└─ Fast feedback on production issues

Benefits:
✅ Faster time to market
✅ Catch bugs early
✅ Reduce manual errors
✅ Deploy with confidence
✅ Quick rollback capability
✅ Better team communication
```

---

## Why CI/CD?

```
WITHOUT CI/CD (Traditional):
Day 1: Dev writes code
Day 2: Code review
Day 3: Merge conflicts! Fix...
Day 4: Testing begins
Day 5: Bugs found! Fix...
Day 6: QA testing
Day 7: Finally ready to deploy
Issue: Week-long cycle, high-risk deployment

WITH CI/CD:
Hour 1: Dev commits code
Hour 1.5: Automated tests pass
Hour 1.7: Code review
Hour 2: Merged and deployed
Hour 2.5: In production, monitoring
Benefit: Same-day deployment, low-risk

FASTER FEEDBACK = FASTER LEARNING = BETTER PRODUCT
```

---

# PART 2: CI/CD PIPELINE ARCHITECTURE

## Typical Pipeline Stages

```
Developer Push → Build → Unit Tests → Integration Tests 
  → Code Quality → Security Scan → Deploy Staging 
  → Smoke Tests → Deploy Production → Monitor

STAGE 1: VERSION CONTROL
├─ Git repository (GitHub, GitLab, Bitbucket)
├─ Webhooks trigger pipeline on push
└─ Branch protection (require tests pass)

STAGE 2: BUILD
├─ Compile code (Maven, Gradle, npm build)
├─ Create artifact (JAR, Docker image)
├─ Store in artifact repository
└─ Fast (< 5 minutes ideal)

STAGE 3: TEST
├─ Unit tests (should be fast)
├─ Integration tests (connect to DB)
├─ End-to-end tests (real browser)
└─ Coverage threshold (e.g., 80%+)

STAGE 4: QUALITY GATES
├─ Code quality (SonarQube)
├─ Security scanning (SAST)
├─ Dependency check
└─ Fail pipeline if thresholds not met

STAGE 5: DEPLOY STAGING
├─ Deploy to staging environment
├─ Run smoke tests
├─ Manual testing (optional)
└─ Like production, but test data

STAGE 6: DEPLOY PRODUCTION
├─ Option 1: Auto-deploy
├─ Option 2: Manual approval
├─ Blue-green deployment (zero downtime)
├─ Canary deployment (slow rollout)
└─ Automated rollback on failure

STAGE 7: MONITORING
├─ Application metrics
├─ Error tracking
├─ User monitoring
└─ Alert on issues
```

---

## Pipeline Example (Spring Boot + AWS)

```yaml
# GitHub Actions example
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    # Step 1: Checkout code
    - uses: actions/checkout@v3
    
    # Step 2: Setup Java
    - name: Set up JDK 11
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'adopt'
    
    # Step 3: Build
    - name: Build with Maven
      run: mvn clean package -DskipTests
    
    # Step 4: Unit Tests
    - name: Run unit tests
      run: mvn test
    
    # Step 5: Code Quality
    - name: SonarQube scan
      run: mvn sonar:sonar -Dsonar.projectKey=my-app
    
    # Step 6: Integration Tests
    - name: Run integration tests
      run: mvn verify
    
    # Step 7: Build Docker image
    - name: Build Docker image
      run: docker build -t myapp:${{ github.sha }} .
    
    # Step 8: Push to registry
    - name: Push to ECR
      run: aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
           docker tag myapp:${{ github.sha }} $ECR_REGISTRY/myapp:${{ github.sha }}
           docker push $ECR_REGISTRY/myapp:${{ github.sha }}
    
    # Step 9: Deploy to staging
    - name: Deploy to staging
      run: kubectl set image deployment/myapp myapp=$ECR_REGISTRY/myapp:${{ github.sha }} -n staging
    
    # Step 10: Smoke tests
    - name: Run smoke tests
      run: npm run smoke-test
    
    # Step 11: Deploy to production (manual approval)
    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      uses: chrnorm/deployment-action@v2
      with:
        environment: production
    
    # Step 12: Production deployment
    - name: Deploy to production ECS
      if: github.ref == 'refs/heads/main'
      run: aws ecs update-service --cluster prod --service myapp --force-new-deployment
```

---

# PART 3: CI/CD TOOLS

## Jenkins (On-premise)

```
Jenkins = Most popular on-premise CI/CD tool

ARCHITECTURE:
Master (orchestrates jobs)
├─ Agents (run jobs)
├─ Plugin ecosystem (2000+ plugins)
├─ Declarative & scripted pipelines
└─ Self-hosted (full control)

DECLARATIVE PIPELINE:
pipeline {
    agent any
    
    options {
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }
    
    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/myapp.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }
        
        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'docker build -t myapp:latest .'
                sh 'docker push registry.example.com/myapp:latest'
            }
        }
    }
    
    post {
        always {
            junit '**/target/surefire-reports/*.xml'
        }
        failure {
            emailext (
                subject: "Build failed: ${env.JOB_NAME}",
                to: "team@example.com",
                body: "Check console output: ${env.BUILD_URL}"
            )
        }
    }
}

ADVANTAGES:
✅ Full control
✅ On-premise (data privacy)
✅ Extensible via plugins
❌ Setup & maintenance overhead
❌ Need dedicated server
❌ Scaling requires more setup
```

---

## GitHub Actions (Cloud-based)

```
GitHub Actions = Native CI/CD in GitHub

ADVANTAGES:
✅ Built into GitHub
✅ No separate server needed
✅ Free for public repos
✅ Easy to setup
✅ GitHub-integrated (webhooks automatic)
❌ Less control than Jenkins
❌ Limited customization

WORKFLOW EXAMPLE:

name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK
      uses: actions/setup-java@v3
      with:
        java-version: '11'
    
    - name: Build
      run: mvn clean package
      env:
        DB_URL: jdbc:postgresql://postgres:5432/test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

RUNNERS:
- ubuntu-latest (Linux)
- windows-latest (Windows)
- macos-latest (macOS)
- Self-hosted runners (your own machines)

PRICING:
- 2,000 free minutes/month
- $0.008 per minute beyond that
- Unlimited for self-hosted
```

---

## GitLab CI/CD

```
GitLab CI/CD = Similar to GitHub Actions

ADVANTAGES:
✅ Native to GitLab
✅ Powerful (more than GitHub Actions)
✅ Free for self-hosted
✅ Container-native
❌ Less popular than GitHub/Jenkins

EXAMPLE (.gitlab-ci.yml):
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2

build:
  stage: build
  image: maven:3.6-openjdk-11
  script:
    - mvn clean package -DskipTests
  artifacts:
    paths:
      - target/

test:
  stage: test
  image: maven:3.6-openjdk-11
  script:
    - mvn test

deploy_staging:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache aws-cli kubectl
    - aws eks update-kubeconfig --name prod-cluster
    - kubectl set image deployment/app app=myapp:$CI_COMMIT_SHA -n staging
  environment:
    name: staging
    kubernetes:
      namespace: staging
  only:
    - develop
```

---

# PART 4: BEST PRACTICES

## Pipeline Best Practices

```
1. FAIL FAST
├─ Run fast tests first (unit tests)
├─ Run slow tests last (E2E tests)
├─ Fail pipeline immediately on first failure
└─ Goal: Get feedback in < 5 minutes

2. PARALLEL EXECUTION
Instead of:
Build (2 min) → Tests (5 min) → Quality (2 min) = 9 min total

Do:
Build (2 min) → Tests (5 min) ┬ Quality (2 min)
                              └ Security (3 min)
                              = 7 min total (tests dominate)

3. STAGING ENVIRONMENT
├─ Identical to production
├─ Run full smoke tests
├─ Manual testing if needed
├─ Deploy to staging first
└─ Gate production deployment

4. DEPLOYMENT STRATEGIES

Blue-Green Deployment:
├─ Blue (v1) running in production
├─ Green (v2) deployed alongside
├─ Switch traffic instantly
├─ Instant rollback (switch back to Blue)
└─ Zero downtime

Canary Deployment:
├─ Deploy v2 to 5% of servers
├─ Monitor metrics (errors, latency)
├─ If good: 25% → 50% → 100%
├─ If bad: Rollback immediately
└─ Gradual rollout = Lower risk

Rolling Deployment:
├─ Gradually replace old with new
├─ Take 1 server offline
├─ Deploy v2
├─ Bring back online
├─ Repeat for each server
└─ Slowest but standard

5. AUTOMATED ROLLBACK
├─ Monitor production metrics
├─ If error rate spikes: Rollback
├─ If latency increases: Rollback
├─ Automatic based on thresholds
└─ No manual intervention needed

6. MONITORING & ALERTING
├─ Application metrics (errors, latency)
├─ Infrastructure metrics (CPU, memory)
├─ Business metrics (users, revenue)
└─ Alert on anomalies
```

---

## Security Best Practices

```
1. SECRETS MANAGEMENT
❌ Never commit secrets to Git:
   database_password = "password123"
   
✅ Use secrets manager:
   database_password = ${DB_PASSWORD}
   
In CI/CD:
- GitHub Secrets
- Jenkins Credentials
- AWS Secrets Manager
- HashiCorp Vault

2. BRANCH PROTECTION
├─ Require pull request review
├─ Require CI tests to pass
├─ Require code quality gates
├─ Require security scans
└─ No direct commits to main

3. CODE SIGNING
├─ Sign git commits
├─ Verify in pipeline
├─ Ensure code authenticity
└─ Prevent impersonation

4. ARTIFACT SECURITY
├─ Scan Docker images
├─ Check dependencies
├─ Sign artifacts
└─ Store securely
```

---

# PART 5: INTERVIEW QUESTIONS

## Question 1: Describe your CI/CD pipeline

**Answer:**
```
Our pipeline has these stages:

1. SOURCE: GitHub webhook triggers on push
2. BUILD: Maven compiles code, creates JAR (3 min)
3. UNIT TEST: JUnit tests run (2 min)
4. INTEGRATION TEST: Test with database (3 min)
5. CODE QUALITY: SonarQube scans (2 min)
6. SECURITY: OWASP dependency check (1 min)
7. DEPLOY STAGING: Kubernetes deploy (2 min)
8. SMOKE TESTS: Verify staging works (1 min)
9. MANUAL APPROVAL: Developer approves
10. DEPLOY PRODUCTION: Blue-green deployment (5 min)
11. MONITOR: Alert on errors/latency

Total: ~10 minutes end-to-end
Failure: Immediate notification + stop
```

---

## Question 2: How do you handle secrets in CI/CD?

**Answer:**
```
We use GitHub Secrets:

1. Secrets stored in GitHub Secrets (encrypted)
2. Pipeline accesses: ${DB_PASSWORD}
3. Never logged or exposed
4. Rotated regularly (quarterly)
5. Least privilege (only needed services)

For production:
- Use AWS Secrets Manager
- Rotate automatically
- Audit trail of access
```

---

## Question 3: How do you deploy with zero downtime?

**Answer:**
```
We use Blue-Green deployment:

1. Blue (v1) running in production
   - ✅ Serving all traffic
   - ✅ All instances healthy

2. Green (v2) deployed
   - Deploy to new instances
   - Run full tests
   - Wait for health checks

3. Switch traffic
   - Load balancer switches instantly
   - All traffic now to Green
   - Blue stays running (backup)

4. Validation
   - Monitor metrics for 5 minutes
   - If issues: Switch back to Blue (instant)
   - If okay: Decommission Blue after 1 hour

Benefit: Zero downtime, instant rollback
```

---

## Question 4: What do you monitor in production?

**Answer:**
```
Application Metrics:
- Error rate (target < 0.1%)
- Response latency (target < 100ms p95)
- Throughput (QPS)
- Cache hit rate
- Database query time

Infrastructure Metrics:
- CPU usage
- Memory usage
- Disk space
- Network I/O

Business Metrics:
- User signups
- Conversion rate
- Revenue

Alerting:
- Error rate > 0.5% → Alert
- Latency > 500ms p95 → Alert
- CPU > 80% → Alert
- Trigger automatic rollback if needed
```

---

## Question 5: What's the difference between Continuous Delivery and Continuous Deployment?

**Answer:**
```
Both come after Continuous Integration (CI) — code is built and tested automatically.
They differ in what happens next:

CONTINUOUS DELIVERY:
- Every change that passes the pipeline is READY to release
- A human still clicks "deploy" (manual approval gate)
- Common when a business wants a person to sign off before production

CONTINUOUS DEPLOYMENT:
- Every change that passes the pipeline is AUTOMATICALLY released
- No manual approval step at all
- Needs high confidence in automated tests, since nothing stops a bad
  change from reaching production except the pipeline's own checks

ONE LINE: "Delivery" = ready to ship with one click. "Deployment" = ships itself.
```

---

## Question 6: What is a build artifact, and why store it in a registry instead of rebuilding it each time?

**Answer:**
```
A build artifact is the actual output of the build step — a compiled JAR,
a Docker image, a bundled JS app — the thing that actually gets deployed.

Why not rebuild it fresh at each stage (test → staging → production)?
- You want to deploy the EXACT same artifact you tested, not a new build that
  might differ (a different dependency version resolved, a flaky build step)
- Rebuilding is slower and wastes CI time
- Storing it once in a registry (Docker Hub, AWS ECR, Nexus, Artifactory) and
  reusing that same image/JAR through every later stage is what "build once,
  deploy everywhere" actually means.
```

---

## Question 7: Why run automated tests in the pipeline instead of just relying on manual testing before merging?

**Answer:**
```
- Consistency: a human can forget a step; a pipeline runs the same checks every time
- Speed: automated tests finish in minutes; manual QA takes hours to days
- Catches regressions immediately, on every single commit, not just before a release
- Gives every developer the same fast feedback loop, regardless of who reviews the PR

Manual testing still has a place (exploratory testing, UX review) — it's just not
a substitute for the pipeline catching the obvious, repeatable stuff automatically.
```

---

# SUMMARY: CI/CD Mastery

✅ **Core Concepts:**
- [ ] Know CI vs CD
- [ ] Know pipeline stages
- [ ] Know deployment strategies
- [ ] Know benefits & challenges

✅ **Tools:**
- [ ] Know GitHub Actions
- [ ] Know Jenkins basics
- [ ] Know when to use each

✅ **Best Practices:**
- [ ] Fail fast
- [ ] Parallel execution
- [ ] Blue-green deployment
- [ ] Automated testing
- [ ] Secrets management

✅ **Interview Skills:**
- [ ] Can describe full pipeline
- [ ] Can discuss deployment strategy
- [ ] Can handle zero-downtime
- [ ] Can handle failures

---

**Master CI/CD—it's critical for production systems! 🚀**
