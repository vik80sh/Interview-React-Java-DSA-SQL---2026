
# Example of how we'll study

Instead of this:

> JwtAuthenticationFilter validates JWT.

We'll learn like this.

---

# What is Spring Security?

Imagine your backend is a company building.

```
                Company Building
        -------------------------------
        Reception
        Security Guard
        Lift
        Employee Cabin
```

Suppose someone enters.

Question:

> How does the company know whether to allow him inside?

Someone checks him first.

Exactly the same happens in Spring.

Every HTTP request first goes through many security checks before reaching your controller.

```
Browser
   |
   |
POST /tweets
   |
   V

+--------------------------+
| Spring Security Filters  |
+--------------------------+
          |
          |
          V

Controller

@PostMapping("/tweets")
```

The controller is **NOT** the first thing that receives the request.

This is one of the biggest misconceptions beginners have.

The actual flow is

```
Client

↓

Tomcat

↓

Spring Security Filter Chain

↓

DispatcherServlet

↓

Controller

↓

Service

↓

Repository
```

Notice

```
Controller is almost at the end.
```

---

# Why do we even need Spring Security?

Imagine there is no security.

```
@PostMapping("/delete-user")
public void deleteUser() {
    ...
}
```

Anyone can call

```
POST /delete-user
```

No username.

No password.

Nothing.

Game over.

So before every request,

Spring asks

```
Is this user authenticated?

YES → Continue

NO → Stop request
```

---

# What is Filter?

This is one of the most important concepts.

Imagine airport security.

```
Passenger

↓

Security Check

↓

Passport Check

↓

Boarding

↓

Plane
```

You cannot directly board.

Exactly same.

```
HTTP Request

↓

Filter 1

↓

Filter 2

↓

Filter 3

↓

Controller
```

A filter is simply

> "Some code that executes before the controller."

---

# Real Spring Filter Chain

Spring already has many filters.

```
Incoming Request

↓

CorsFilter

↓

CsrfFilter

↓

LogoutFilter

↓

UsernamePasswordAuthenticationFilter

↓

ExceptionTranslationFilter

↓

AuthorizationFilter

↓

Controller
```

When we use JWT,

we insert our own filter.

```
Incoming Request

↓

CorsFilter

↓

JwtAuthenticationFilter   ← OUR FILTER

↓

AuthorizationFilter

↓

Controller
```

---

# Why create JwtAuthenticationFilter?

Suppose frontend sends

```
GET /tweets

Cookie

jwt=eyJhbGciOiJIUzI1Ni...
```

Question:

Who reads this JWT?

Controller?

No.

Service?

No.

Repository?

No.

Our filter.

```
Request

↓

JwtAuthenticationFilter

↓

Read Cookie

↓

Validate JWT

↓

Put User into SecurityContext

↓

Continue Request
```

Without this filter,

Spring has no idea who the user is.

---

# Super Easy Analogy

Imagine school.

Teacher asks

```
Who are you?
```

Student shows ID card.

Teacher checks.

If correct

```
Okay

Go inside.
```

JWT is simply the ID card.

The filter is the teacher checking it.

---

# What is OncePerRequestFilter?

Normal filters can execute multiple times.

Spring provides

```java
public class JwtAuthenticationFilter
        extends OncePerRequestFilter
```

Meaning

```
For one HTTP request

↓

Run only once.
```

That's exactly what we want.

---

# What happens inside this filter?

Very simplified version

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) {

        // Read JWT

        // Validate JWT

        // Save user in SecurityContext

        // Continue request

        filterChain.doFilter(request, response);
    }
}
```

Notice the last line.

```java
filterChain.doFilter(request, response);
```

Think of it as

```
Next please.
```

If you forget this line...

```
Request

↓

Filter

↓

Stops forever
```

Controller never executes.

Very common beginner mistake.

---

# Request Flow

```
Client

↓

Jwt Filter

↓

SecurityContext

↓

Controller

↓

Service

↓

Repository
```

---

# What is SecurityContextHolder?

This is another huge concept.

Imagine after checking ID,

the company stores your information.

```
Current User

Name : Vikash

Role : USER
```

Where?

Inside Spring's `SecurityContextHolder`.

```java
SecurityContextHolder
        .getContext()
        .setAuthentication(authentication);
```

Now every controller can ask

```
Who is the current user?
```

without reading JWT again.

Example

```java
Authentication auth =
    SecurityContextHolder.getContext().getAuthentication();

System.out.println(auth.getName());
```

Output

```
vikash@gmail.com
```

---

# Why not decode JWT in every controller?

Bad approach

```java
@PostMapping("/tweet")
public void createTweet(HttpServletRequest request) {

    // Read JWT

    // Validate JWT

    // Decode JWT

    // Find User

}
```

Imagine doing this in

* TweetController
* UserController
* LikeController
* CommentController
* FollowController

Same code everywhere.

Instead,

do it once.

```
Filter

↓

Store User

↓

Everyone uses it.
```

This is cleaner and follows the **Single Responsibility Principle (SRP)**.

---

# Interview Question

**Q:** Why use `OncePerRequestFilter`?

**Answer:**

* Executes exactly once for every request.
* Prevents duplicate JWT validation.
* Best place to authenticate incoming requests.
* Allows us to populate the `SecurityContextHolder` before the request reaches controllers.

---

# Behind the Scenes

Suppose frontend calls

```
GET /tweets
```

Internally

```
Tomcat receives request

↓

Spring Security starts Filter Chain

↓

JwtAuthenticationFilter executes

↓

JWT verified

↓

Authentication object created

↓

Stored in SecurityContextHolder

↓

AuthorizationFilter checks access

↓

DispatcherServlet

↓

TweetController

↓

TweetService

↓

Database

↓

Response
```

---

# Easy Notes (Remember Forever)

| Concept                  | Remember Like This                                           |
| ------------------------ | ------------------------------------------------------------ |
| Spring Security          | Security guard of your application                           |
| Filter                   | Executes before the controller                               |
| Filter Chain             | Queue of security checks                                     |
| JWT                      | Digital ID card                                              |
| JwtAuthenticationFilter  | Checks the ID card                                           |
| OncePerRequestFilter     | Runs only once per request                                   |
| SecurityContextHolder    | Stores the logged-in user's identity for the current request |
| `filterChain.doFilter()` | Pass the request to the next filter/controller               |
| Controller               | Executes only after security checks pass                     |

---

I recommend we continue in this style for the entire Spring Security module. By the end, you'll understand not just *what* to write, but *why* Spring Security works the way it does, which is exactly what interviewers look for.

**Next topic (recommended):** **`SecurityContextHolder` and `Authentication`**. This is the heart of Spring Security, and once you understand it, `SecurityConfig`, JWT filters, and `UserDetailsService` become much easier to grasp.
