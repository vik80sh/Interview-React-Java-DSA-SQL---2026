# CI/CD Fundamentals (Beginner-Friendly)

This file follows the same approach as [Spring Boot Fundamentals](../Backend/Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom.

The running example is `interview-api`, a Spring Boot service a small team ships to AWS (Amazon Web Services).

---

## 1. The Problem: Shipping Code By Hand

No pipeline yet. A teammate finishes a feature on `interview-api` and ships it by hand: build the JAR on their laptop, FTP (File Transfer Protocol) it to the server, SSH in, restart the app, hope nothing broke.

Here's exactly how that goes wrong: their laptop has a different Java version than production, so it crashes on restart. They forgot to run the tests first — nothing forced them to. Nobody else knows a deploy even happened, so when it breaks, whoever's on call has no idea what changed. And there's no old build kept anywhere to go back to.

**This is exactly what CI/CD (Continuous Integration / Continuous Deployment) answers: replace manual, memory-dependent steps with an automated pipeline that runs the same way, every time, for every change.**

## 2. CI: Catching Problems Before They Pile Up

**Scenario:** two developers branch off `main` and don't merge back for a week. By the time they try, both branches have drifted from `main` and from each other, and the merge is a tangle of conflicts nobody can untangle cleanly.

**Continuous Integration (CI)** fixes this by merging early and often: every push to the shared repository automatically triggers a build and a test run (via a webhook — an automatic notification the Git host sends the moment code is pushed). Branch protection blocks merging into `main` until those checks pass. A problem surfaces within minutes of being introduced, while it's still small, instead of surfacing as an unexplainable mess days later.

## 3. CD: What Happens After CI Passes

Once a change passes CI, two different things can happen next, and this pair is commonly confused:

- **Continuous Delivery** — every change that passes the pipeline is packaged and ready to release, but a human still clicks "deploy."
- **Continuous Deployment** — every change that passes the pipeline is released automatically, no manual click at all.

One line to keep them apart: **Delivery = ready to ship with one click. Deployment = ships itself.** Deployment needs much stronger automated tests and safety nets (section 6's deployment strategies, monitoring-driven rollback) since there's no human left to catch what the pipeline missed.

## 4. Pipeline Stages

Turning the manual steps from section 1 into automated stages gives the actual **CI/CD pipeline**:

```text
Push to Git → Build → Unit Tests → Integration Tests
  → Code Quality & Security Scans → Deploy to Staging
  → Smoke Tests → Deploy to Production → Monitor
```

- **Build** — compile the code and produce one **artifact** (a JAR, a Docker image) — the actual thing that gets deployed. Build it once, tag it (e.g. with the Git commit hash), and reuse that same artifact for every later stage instead of rebuilding — this is what "build once, deploy everywhere" means, and it guarantees you deploy exactly what you tested, not a fresh build that might differ.
- **Test** — unit tests first (fast, no dependencies), then integration tests (against a real test database), then end-to-end tests (slowest, closest to real usage).
- **Quality & security scans** — static analysis (e.g. SonarQube) and dependency/vulnerability checks fail the pipeline automatically instead of relying on a human to notice.
- **Deploy to staging** — a copy of production, with test data, followed by smoke tests (a small, fast check that the basics work, like `/health` returning 200).
- **Deploy to production** — gated by an automatic pipeline (Continuous Deployment) or a manual approval (Continuous Delivery), and rolled out using one of the strategies in section 6.
- **Monitor** — watches whether the new version is actually healthy once it's live (section 7).

A trimmed real example, deploying `interview-api` through GitHub Actions to AWS ECS (Elastic Container Service):

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with: { java-version: '17', distribution: 'temurin' }

      - run: mvn clean package -DskipTests   # build
      - run: mvn test                         # unit tests
      - run: mvn verify                       # integration tests
      - run: mvn sonar:sonar -Dsonar.projectKey=interview-api

      - name: Build & push image (tagged by commit SHA — the artifact, built once)
        run: |
          docker build -t interview-api:${{ github.sha }} .
          docker push $ECR_REGISTRY/interview-api:${{ github.sha }}

      - run: aws ecs update-service --cluster staging --service interview-api --force-new-deployment
      - run: npm run smoke-test

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: aws ecs update-service --cluster prod --service interview-api --force-new-deployment
```

## 5. CI/CD Tools

The pipeline idea above isn't tied to one vendor:

- **GitHub Actions** — built into GitHub, so pushes and webhooks work with no separate server. Runs on GitHub-hosted runners (`ubuntu-latest`, etc.) or your own self-hosted runner. Free tier of 2,000 minutes/month, billed per minute beyond that. Less configurable than Jenkins.
- **Jenkins** — self-hosted, full control, 2,000+ plugins. A **master** node orchestrates jobs and hands them to **agent** machines. Declarative pipeline syntax:

```groovy
pipeline {
    agent any
    stages {
        stage('Build') { steps { sh 'mvn clean package -DskipTests' } }
        stage('Test')  { steps { sh 'mvn test' } }
        stage('Deploy') {
            when { branch 'main' }
            steps { sh 'docker push registry.example.com/interview-api:latest' }
        }
    }
    post {
        failure { emailext(subject: "Build failed", to: "team@example.com", body: "${env.BUILD_URL}") }
    }
}
```

  The cost of that control: you install, patch, and scale the Jenkins server yourself.

- **GitLab CI/CD** — plays the same role as GitHub Actions when the code lives on GitLab; `.gitlab-ci.yml` defines `stages: [build, test, deploy]` the same way, container-native by default.

There's no universally "right" one — it mostly follows where the code already lives, unless you specifically need Jenkins's on-premise control.

## 6. What Happens When a Bad Deploy Has No Rollback Plan

**Scenario:** `interview-api` v2 gets pushed to 100% of production in one shot. Fifteen minutes later error rates spike — a bug that only shows up under real load. Every user is now hitting the broken version, and there's no old version still running to fall back to.

**Deployment strategies** control how much traffic sees a new version, and how fast, so a bad build hurts a small slice instead of everyone:

- **Blue-green** — the old version (Blue) keeps serving all traffic while the new version (Green) is deployed fully alongside it and health-checked. The load balancer then switches all traffic to Green at once. Rollback is just switching back to Blue — instant, since Blue never stopped running. Zero downtime, but you run two full environments briefly.
- **Canary** — the new version gets a small slice of real traffic first (say 5%); if error rate and latency stay healthy, the slice grows (5% → 25% → 100%). If not, only that small slice was ever affected. Slower than blue-green, but limits how many real users a bad build can hurt.
- **Rolling** — instances are updated one (or a few) at a time: take one out of rotation, deploy the new version, health-check it, bring it back, move to the next. No second environment needed, but slowest, and both versions briefly serve traffic side by side.

None of these matter without something watching the result: **automated rollback** means the pipeline watches production error rate and latency right after a deploy and rolls back automatically if a threshold is crossed, rather than waiting for a human to notice a dashboard.

## 7. Pipeline Best Practices and Security

**Fail fast, run things in parallel.** Order stages fastest-and-most-likely-to-fail first (unit tests before slow end-to-end tests), and stop the whole pipeline on the first failure instead of running everything to completion regardless. Stages that don't depend on each other — a quality scan and a security scan, say — can run side by side instead of back-to-back, shrinking total pipeline time without skipping anything.

**Secrets management.** A developer hardcodes a database password into a config file so a local test works, and commits it. That password is now in Git history forever, readable by anyone with repo access, even after a later commit deletes the line. The fix: never put a real secret in source code — store it in a secrets manager (GitHub Secrets, AWS Secrets Manager, HashiCorp Vault) and reference it by name (`${DB_PASSWORD}`), grant each pipeline only the credentials it actually needs, and rotate secrets regularly.

A few more practices aimed at the same goal — nobody unauthorized changes or impersonates what reaches production: **branch protection** (require review + passing CI before merging to `main`, no direct pushes); **code signing** (verify a commit genuinely came from who it claims to); **artifact scanning** (check the built Docker image and its dependencies for known vulnerabilities before it ships).

## 8. Monitoring

Section 6 leaned on production metrics to decide when to roll back — this is what produces them. **Application metrics** (error rate, response latency, throughput) say whether the app itself is healthy. **Infrastructure metrics** (CPU, memory, disk) say whether the machine underneath is healthy. **Business metrics** (signups, conversion, revenue) say whether the thing that's technically "up" is actually working for the business. **Alerting** turns a crossed threshold (error rate, latency, CPU) into a page to a human or an automated rollback, instead of sitting quietly in a dashboard nobody's watching.

## Interview Questions and Answers

### 1. What's the difference between CI, Continuous Delivery, and Continuous Deployment?

**Answer:** CI automatically builds and tests every change as soon as it's merged, so problems surface within minutes. Continuous Delivery means a change that passes CI is packaged and ready to release, but a human still approves the release. Continuous Deployment removes that approval — a passing change goes live automatically. Each builds on the one before it.

### 2. Describe a CI/CD pipeline for a Spring Boot service.

**Answer:** Push to Git triggers a webhook. The pipeline builds the JAR, runs unit then integration tests, runs a quality/security scan, builds and tags a Docker image once, pushes it to a registry, deploys that same image to staging, smoke-tests it, then deploys it to production (auto or manually approved) using a gradual rollout, with monitoring watching error rate and latency throughout.

### 3. How do you handle secrets in CI/CD?

**Answer:** Never commit a real secret to source control. Store it in an encrypted secrets manager (GitHub Secrets, AWS Secrets Manager, Vault), reference it by name, give each pipeline only the access it needs, and rotate secrets periodically.

### 4. How would you deploy with zero downtime?

**Answer:** Blue-green deployment — the new version comes up fully alongside the old one, gets health-checked, then the load balancer switches all traffic over at once. The old version keeps running for a while, so rollback is just switching traffic back.

### 5. Blue-green vs. canary vs. rolling — when would you use each?

**Answer:** Blue-green gives instant switch-over and instant rollback but needs a second full environment. Canary sends a small percentage of traffic to the new version first and grows it only if metrics stay healthy — best when you want to limit how many users a bad build can affect. Rolling replaces instances gradually with no second environment, cheaper but slower, and only safe if old and new versions can run side by side without conflicting.

### 6. What is a build artifact, and why not just rebuild it at every stage?

**Answer:** The artifact is the actual deployable output (a JAR, a Docker image). Rebuilding it fresh at every stage risks deploying something subtly different from what was tested. Building it once, tagging it, and reusing that exact artifact through every later stage is "build once, deploy everywhere" — it guarantees you ship what you tested.

### 7. What do you monitor after a deployment, and what triggers a rollback?

**Answer:** Application metrics (error rate, latency), infrastructure metrics (CPU, memory), and business metrics where relevant. An automated rollback should fire when error rate or latency crosses a set threshold shortly after deploy, rather than waiting for someone to notice.

### 8. Why run automated tests in the pipeline instead of relying on manual testing?

**Answer:** A pipeline runs the same checks the same way on every commit; a human can forget a step. Automated tests finish in minutes and give every developer the same fast feedback loop. Manual testing still matters for exploratory and UX checks — it's just not a substitute for catching repeatable regressions automatically.

## Revision Checklist

- [ ] Explain, using the manual-deploy scenario, what problem CI/CD actually solves.
- [ ] Explain CI using the "week-long drift before merging" scenario.
- [ ] State the one-line difference between Continuous Delivery and Continuous Deployment.
- [ ] Walk through the pipeline stages in order and say what each one checks for.
- [ ] Explain "build once, deploy everywhere" and why rebuilding per stage is risky.
- [ ] Compare GitHub Actions, Jenkins, and GitLab CI, and when you'd pick each.
- [ ] Explain, using the "100% traffic, no rollback" scenario, why deployment strategies exist.
- [ ] Compare blue-green, canary, and rolling deployments.
- [ ] Explain secrets management using the hardcoded-password-in-Git scenario.
- [ ] Name the application/infrastructure/business metric categories and how alerting connects to rollback.
