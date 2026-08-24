# Docker Fundamentals (Beginner-Friendly)

This file follows the same approach as [Spring Boot Fundamentals](../Backend/Springboot/01-Spring-Boot-Fundamentals.md): every term is introduced by first showing the concrete problem it solves, then given a name. Read it top to bottom — later sections build on earlier ones.

The running example throughout is a Twitter-clone project: a Spring Boot backend, a React frontend, and a Postgres database — three real services that need to run together.

---

## 1. The Problem: "It Works on My Machine"

You build the Twitter-clone backend on your laptop — Java 21, a local Postgres, database credentials hardcoded in `application.properties`. It runs fine. Your teammate pulls the repo: different Java version, no local Postgres, wrong credentials. It breaks for them. You fix that, then deploy to a server with yet another Java version and different OS libraries — it breaks again, for a third set of reasons.

**This is exactly what Docker answers.** Docker packages an app together with everything it needs to run — code, runtime, libraries, OS-level tools — into one unit called a **container**. A container behaves the same way on every machine, because it carries its own environment instead of depending on whatever happens to already be installed.

Why this matters beyond just "it runs the same everywhere":

- **Lightweight vs. a Virtual Machine (VM):** a VM boots its own full guest OS, so it's slow to start and heavy on RAM/disk. Containers share the host machine's OS kernel and only package what actually differs, so they start in about a second and use far less RAM/disk.
- **Isolation:** each service (database, backend, frontend) runs in its own container, so one service's dependency version can never clash with another's.
- **Portability:** build the image once, run it on any machine with Docker — Linux, Mac, Windows, or a cloud server.
- **Microservices-friendly:** one service = one container, so any single service can be scaled, replaced, or redeployed on its own.
- **CI/CD-friendly:** the exact image tested in the pipeline is the same image deployed to production — nothing gets rebuilt slightly differently in between.

## 2. Image, Container, and Dockerfile

To turn "the backend plus everything it needs" into something runnable, you write a **Dockerfile** — a plain text file listing the steps to assemble the environment:

```dockerfile
FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests
ENTRYPOINT ["java", "-jar", "target/twitter-backend.jar"]
```

Running `docker build -t twitter-backend:1.0 .` follows those steps and produces an **image** — a read-only, packaged blueprint. Nothing is running yet. Running `docker run twitter-backend:1.0` actually starts a live process from that image — a **container**. The same image can be started as many independent containers as you like, the way a class can be used to create many objects — this is the difference to reach for when asked "what's the difference between an image and a container."

This particular Dockerfile works, but it has a real problem covered in section 4: the resulting image is much bigger than it needs to be.

One more small but important file: `docker build` sends your *entire* project folder to the build process, in case a `COPY` needs any of it. A `.dockerignore` file (same idea as `.gitignore`) excludes what shouldn't be sent — build output, `.git/`, IDE folders, and especially anything like a `.env` file with real secrets, which would otherwise get baked straight into the image:

```
target/
.git/
.idea/
*.log
```

## 3. Basic Docker Commands

```bash
# Images
docker build -t myapp:1.0 .          # build image from Dockerfile in current dir
docker images                        # list local images
docker rmi myapp:1.0                 # remove image

# Containers
docker run -d -p 8080:8080 --name myapp myapp:1.0   # run detached, map host port -> container port
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

## 4. The Twitter Clone: Backend and Frontend Dockerfiles

The backend and frontend live in **separate repos** — normal on a real team:

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

**Backend.** The naive Dockerfile from section 2 ships the *entire* JDK, Maven, and the source tree inside the final image — none of which the app needs to actually run, just to build. That means a heavier image, slower pushes/pulls, and more installed software than necessary. The fix is a **multi-stage build**: compile in one stage, then copy only the finished jar into a lean final stage.

```dockerfile
# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B        # cache deps as their own layer
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---- Stage 2: Run ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`pom.xml` is copied and dependencies downloaded *before* `src/` is copied in, on purpose: Docker caches each step as a layer, and reuses the cache if nothing that step depends on has changed. Since code changes far more often than the dependency list, this ordering avoids re-downloading every dependency on every single code change.

Run it with configuration passed in, not hardcoded:

```bash
docker run -d -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/twitterdb \
  -e SPRING_DATASOURCE_USERNAME=twitter \
  -e SPRING_DATASOURCE_PASSWORD=secret \
  --name backend twitter-backend:1.0
```

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
```

**Frontend.** Same "don't ship the build tools" problem: once `npm run build` produces static files, the browser doesn't need Node.js at all. So stage 1 builds with Node, stage 2 serves with Nginx (a lightweight production web server):

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

Two things still break without `nginx.conf`: refreshing the browser on a client-side route like `/profile` hits Nginx looking for a real file called `profile` (404), and calling the backend directly from the browser at a different origin runs into CORS (Cross-Origin Resource Sharing) restrictions. This config fixes both:

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

`try_files` falls back to `index.html` so `react-router` can take over and render the right route. Routing `/api/` through Nginx means the browser only ever talks to one origin; Nginx forwards to the backend server-to-server, where CORS doesn't apply.

## 5. Networks, Volumes, and Docker Compose

Run the backend and frontend as separate containers and the `/api/` proxy fails, because `http://backend:8080` doesn't resolve to anything by default — and it's *not* `localhost` either. **Each container has its own isolated network namespace**, so `localhost` inside a container means that container itself, not the host or any other container.

A **Docker network** fixes this: a virtual network Docker creates, where containers can reach each other by name through Docker's own internal DNS. This is also why the backend connects to the database at `jdbc:postgresql://db:5432/...` — `db` is just the database container's name on the same network, not a real internet hostname.

Wiring a network, plus the database, backend, and frontend containers, by hand every time is tedious. **Docker Compose** describes all of it once in one YAML file, and brings the whole stack up or down with a single command:

```yaml
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

Compose puts every service on one shared network automatically and names each container after its service key — that's why `backend` and `db` just work as hostnames.

The `db-data` volume solves a separate problem: a container's writable filesystem is deleted the moment the container is removed, so without a **volume** — storage Docker keeps outside any one container's lifecycle — every user in the database would vanish on `docker compose down`.

If repos are truly independent, each with its own CI/CD pipeline, Compose can skip building from source entirely and just pull already-built images from a **registry** (Docker Hub, AWS ECR, GitHub Container Registry, or a private one):

```yaml
services:
  backend:
    image: myregistry.io/twitter-backend:1.0
    ...
  frontend:
    image: myregistry.io/twitter-frontend:1.0
    ...
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose down          # stop everything (add -v to also wipe the db volume)
```

One more gotcha: `depends_on: [db]` only waits for the `db` *container* to start, not for Postgres inside it to actually be ready to accept connections — so the backend can still fail on a fresh `up`. A healthcheck closes that gap:

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

## 6. Key Things to Remember When Repos Are Separate

- Each repo owns its **own Dockerfile and `.dockerignore`** — build context should never leak into the other app.
- The **compose/orchestration file is the only place** that needs to know about both repos — keep it in whichever repo makes sense for the team (often a 3rd infra repo, or a `deploy/` folder in one repo).
- Containers talk to each other using **service names as hostnames** (`backend`, `db`) — never `localhost` between containers.
- In CI/CD, each repo typically builds and pushes its **own image** to a registry on merge; the compose/K8s manifest just references image tags — keeping the repos decoupled.

**Summary:** Docker packages each service (Postgres, the Spring Boot backend, the React+Nginx frontend) into isolated, reproducible containers; multi-stage Dockerfiles keep images small; Docker Compose ties the independently-built repos together over a shared network for local dev; volumes keep the database's data alive across restarts; and CI/CD in each repo pushes standalone images for production.

## Interview Questions and Answers

### 1. What's the actual difference between an image and a container?

**Answer:** An image is the read-only blueprint, built once from a Dockerfile. A container is a running instance of that image. The same image can be started as many separate, independent containers at once — it's the difference between a class and an object.

### 2. Why use a multi-stage Dockerfile instead of one stage?

**Answer:** Build tools (Maven, npm) and source code are only needed to *produce* the final artifact (a jar, a bundled JS app) — they don't need to ship in the image that runs in production. A multi-stage build compiles in one stage and copies only the finished output into a lean final stage, which is why the Twitter-clone backend image ends up as just a JRE + a jar, not a full Maven+JDK toolchain.

### 3. What does Docker Compose actually solve that plain `docker run` doesn't?

**Answer:** A real app is usually several containers (a database, a backend, a frontend) that need to start together, share a network, and know about each other by name. Compose defines all of that once in a YAML file instead of a long sequence of manually-run `docker run` commands with matching network/port flags typed out by hand every time.

### 4. Why can't two containers reach each other using `localhost`?

**Answer:** Each container has its own isolated network namespace, so `localhost` inside a container refers only to that container itself, not the host machine or any other container. Containers on the same Docker network reach each other by service/container **name** instead (e.g., a backend connecting to `jdbc:postgresql://db:5432/...`, where `db` is the database service's name in `docker-compose.yml`).

### 5. What's a Docker volume for, and why does removing a container lose data without one?

**Answer:** A container's own writable layer is deleted the moment the container is removed, so anything written there (like a database's data files) vanishes with it. A volume is storage that lives outside that writable layer, so the data survives even after the container that used it is stopped or removed — exactly why the Postgres service mounts `db-data:/var/lib/postgresql/data`.

### 6. Why isn't `depends_on` alone enough to guarantee the database is ready?

**Answer:** It only waits for the dependency's container to start, not for the software inside it to finish its own startup and become ready to accept connections. A healthcheck (like `pg_isready`) combined with `condition: service_healthy` makes a dependent service wait for genuine readiness instead.

### 7. Why does the frontend proxy `/api/` through Nginx instead of the browser calling the backend directly?

**Answer:** Calling a different origin directly from the browser hits CORS restrictions. Routing `/api/` through Nginx means the browser only talks to one origin; Nginx forwards the request to the backend server-to-server, where CORS doesn't apply.

## Revision Checklist

- [ ] Explain, using the three-Java-versions scenario, why "it works on my machine" is really several environment assumptions, not one problem.
- [ ] Explain image vs. container using the class/object analogy, and where a Dockerfile fits.
- [ ] Explain what `.dockerignore` protects against.
- [ ] Explain why the naive single-stage backend Dockerfile is wasteful, and how multi-stage fixes it.
- [ ] Explain why `pom.xml` is copied before `src/` (layer caching).
- [ ] Explain what the frontend's `nginx.conf` fixes (SPA refresh 404s, and CORS via the `/api/` proxy).
- [ ] Explain why two containers can't reach each other over `localhost`, and what a Docker network / Compose service name does instead.
- [ ] Write a `docker-compose.yml` for a database, backend, and frontend, including a volume.
- [ ] Explain why `depends_on` alone doesn't guarantee readiness, and what a healthcheck adds.
- [ ] State the four rules for working across separate repos (own Dockerfile/.dockerignore, shared orchestration file, service names not `localhost`, per-repo image push in CI/CD).
