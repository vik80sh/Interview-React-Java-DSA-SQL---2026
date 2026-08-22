# Docker — Full Notes (with Spring Boot + React Twitter Clone example)

## 1. What is Docker & why we need it

**Definition:** Docker is a platform to build, ship, and run applications inside **containers** — lightweight, isolated units that bundle an app with everything it needs (code, runtime, libraries, system tools, config).

**Why we need it:**
- **"Works on my machine" problem** — container has the exact same environment everywhere (dev, QA, prod).
- **Lightweight vs VMs** — containers share the host OS kernel, so they start in seconds and use far less RAM/disk than a VM.
- **Isolation** — each service (DB, backend, frontend) runs independently; no dependency conflicts.
- **Portability** — build once, run on any machine with Docker installed (Linux, Mac, Windows, cloud).
- **Microservices-friendly** — each service = one container, easy to scale/replace individually.
- **CI/CD friendly** — same image tested in pipeline is the image deployed to prod.

---

## 2. Core Concepts

| Term | Definition | Why it matters |
|---|---|---|
| **Image** | Read-only template/blueprint (app + dependencies + OS libs), built from a `Dockerfile`. | You *ship* images, not containers. |
| **Container** | A running instance of an image. | This is what actually executes your app. |
| **Dockerfile** | Text file with instructions to build an image. | Defines how the image is built, layer by layer. |
| **Registry** | Storage for images (Docker Hub, AWS ECR, GitHub Container Registry, private registry). | Lets teams share/pull built images instead of rebuilding. |
| **Volume** | Persistent storage outside the container's writable layer. | Container data is deleted when container is removed — volumes survive that. |
| **Network** | Virtual network Docker creates so containers can talk to each other by name. | Backend can reach DB via hostname like `db` instead of IP. |
| **Docker Compose** | Tool + YAML file to define & run multi-container apps (`docker-compose.yml`). | Instead of running 5 `docker run` commands, one `docker compose up` starts everything. |
| **.dockerignore** | List of files/folders excluded from build context. | Keeps images small, avoids leaking `.env`/`node_modules`/`.git`. |
| **Multi-stage build** | Dockerfile with multiple `FROM` stages — build in one stage, copy only the output to a lean final stage. | Drastically reduces final image size (esp. important for Java/React). |

---

## 3. Basic Docker Commands (cheat sheet)

```bash
# Images
docker build -t myapp:1.0 .          # build image from Dockerfile in current dir
docker images                        # list local images
docker rmi myapp:1.0                 # remove image

# Containers
docker run -d -p 8080:8080 --name myapp myapp:1.0   # run detached, map port
docker ps                            # list running containers
docker ps -a                         # list all (incl. stopped)
docker logs -f myapp                 # follow logs
docker exec -it myapp sh             # shell into a running container
docker stop myapp && docker rm myapp # stop & remove

# Cleanup
docker system prune -a               # remove unused images/containers/networks

# Compose
docker compose up -d                 # build+start all services in background
docker compose down                  # stop and remove containers/networks
docker compose logs -f backend       # logs for one service
docker compose build --no-cache      # force rebuild
```

---

## 4. Example Project: Twitter Clone (2 separate repos)

Structure:
```
twitter-clone-backend/     (Spring Boot, Java)
  ├── src/...
  ├── pom.xml
  ├── Dockerfile
  └── .dockerignore

twitter-clone-frontend/    (React)
  ├── src/...
  ├── package.json
  ├── Dockerfile
  ├── nginx.conf
  └── .dockerignore

twitter-clone-infra/       (optional 3rd repo, just orchestration)
  └── docker-compose.yml
```
Since the two apps live in **separate repos**, `docker-compose.yml` will reference them either by **pre-built image names** (pulled from a registry) or by **relative build context path** if repos are checked out side-by-side. Both patterns shown below.

---

### 4.1 Backend — Spring Boot (`twitter-clone-backend/Dockerfile`)

Multi-stage build: Stage 1 compiles with Maven, Stage 2 runs on a slim JRE — final image doesn't contain Maven or source code.

```dockerfile
# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B        # cache deps as separate layer
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`.dockerignore` (backend):
```
target/
.git/
.idea/
*.log
```

Build & run standalone:
```bash
cd twitter-clone-backend
docker build -t twitter-backend:1.0 .
docker run -d -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/twitterdb \
  -e SPRING_DATASOURCE_USERNAME=twitter \
  -e SPRING_DATASOURCE_PASSWORD=secret \
  --name backend twitter-backend:1.0
```
In `application.properties`, read env vars so config isn't hardcoded:
```properties
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
```

---

### 4.2 Frontend — React (`twitter-clone-frontend/Dockerfile`)

Multi-stage: Stage 1 builds static assets with Node, Stage 2 serves them with Nginx (production-grade, no Node runtime shipped).

```dockerfile
# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build           # outputs to /app/build (CRA) or /app/dist (Vite)

# ---- Stage 2: Serve ----
FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf` — needed so React Router refreshes don't 404, and to proxy `/api` to backend without CORS headaches:
```nginx
server {
    listen 80;

    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri /index.html;    # SPA fallback for react-router
    }

    location /api/ {
        proxy_pass http://backend:8080/;   # "backend" = service name from docker network
    }
}
```

`.dockerignore` (frontend):
```
node_modules/
build/
.git/
.env
```

Build & run standalone:
```bash
cd twitter-clone-frontend
docker build -t twitter-frontend:1.0 .
docker run -d -p 3000:80 --name frontend twitter-frontend:1.0
```

---

### 4.3 Wiring both repos + DB with Docker Compose

**Option A — repos checked out as siblings**, compose file lives in a 3rd orchestration repo or one of the two, referencing relative paths:

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: twitterdb
      POSTGRES_USER: twitter
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data   # persists data across container restarts
    ports:
      - "5432:5432"

  backend:
    build:
      context: ../twitter-clone-backend    # separate repo, sibling folder
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/twitterdb
      SPRING_DATASOURCE_USERNAME: twitter
      SPRING_DATASOURCE_PASSWORD: secret
    depends_on:
      - db
    ports:
      - "8080:8080"

  frontend:
    build:
      context: ../twitter-clone-frontend   # separate repo, sibling folder
    depends_on:
      - backend
    ports:
      - "3000:80"

volumes:
  db-data:
```

**Option B — CI already pushed images to a registry**, compose just pulls them (typical when repos truly stay independent and each has its own pipeline):
```yaml
services:
  backend:
    image: myregistry.io/twitter-backend:1.0
    ...
  frontend:
    image: myregistry.io/twitter-frontend:1.0
    ...
```

Run everything:
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose down          # stop everything (add -v to also wipe db volume)
```

Why `depends_on` isn't enough for DB readiness: Postgres container is "running" before it's actually accepting connections. For real projects add a healthcheck:
```yaml
  db:
    ...
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U twitter"]
      interval: 5s
      retries: 5
  backend:
    depends_on:
      db:
        condition: service_healthy
```

---

## 5. Key things to remember when repos are separate

- Each repo owns its **own Dockerfile and `.dockerignore`** — build context should never leak into the other app.
- The **compose/orchestration file is the only place** that needs to know about both repos — keep it in whichever repo makes sense for your team (often a 3rd infra repo, or a `deploy/` folder in one repo).
- Containers talk to each other using **service names as hostnames** (`backend`, `db`) — never `localhost` between containers, since each container has its own network namespace.
- In CI/CD, each repo typically builds + pushes its **own image** to a registry on merge; the compose/K8s manifest just references image tags — this keeps the repos truly decoupled.

---

**Summary:** Docker packages each service (Postgres, Spring Boot backend, React+Nginx frontend) into isolated, reproducible containers; multi-stage Dockerfiles keep images small; Docker Compose ties the independently-built repos together via a shared network for local dev, while CI/CD in each repo pushes standalone images for production.

---

## 6. Basic Interview Questions (what a full-stack dev should be able to answer)

### Q1: What's the actual difference between an image and a container?

**Answer:** An image is the read-only blueprint (built once from a Dockerfile); a container is a running instance of that image. The same image can be started as many separate, independent containers at once — it's the difference between a class and an object.

### Q2: Why use a multi-stage Dockerfile instead of one stage?

**Answer:** The build tools (Maven, npm) and source code are only needed to *produce* the final artifact (a JAR, a bundled JS app) — they don't need to ship in the image that actually runs in production. A multi-stage build compiles in one stage and copies only the finished output into a lean final stage, which is why the Twitter-clone backend image above ends up as just a JRE + a JAR, not a full Maven+JDK toolchain.

### Q3: What does Docker Compose actually solve that plain `docker run` doesn't?

**Answer:** A real app is usually several containers (a database, a backend, a frontend) that need to start together, share a network, and know about each other by name. Compose defines all of that once in a YAML file instead of a long sequence of manually-run `docker run` commands with matching network/port flags typed out by hand every time.

### Q4: Why can't two containers reach each other using `localhost`?

**Answer:** Each container has its own isolated network namespace, so `localhost` inside a container refers only to that container itself, not the host machine or any other container. Containers on the same Docker network reach each other by service/container **name** instead (e.g., a backend connecting to `jdbc:postgresql://db:5432/...`, where `db` is the database service's name in `docker-compose.yml`).

### Q5: What's a Docker volume for, and why does removing a container lose data without one?

**Answer:** A container's own writable layer is deleted the moment the container is removed, so anything written there (like a database's data files) vanishes with it. A volume is storage that lives outside that writable layer, on the host, so the data survives even after the container that used it is stopped or removed — exactly why the Postgres service above mounts `db-data:/var/lib/postgresql/data`.
