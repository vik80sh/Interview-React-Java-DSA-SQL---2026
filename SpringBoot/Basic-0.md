


* **`<dependency>`**: **YES.** This tag tells Maven: *"Hey, go download this specific external library/package and include it in my project."*
* **`<groupId>`**: **YES, basically.** Think of it as the **Organization or Company Domain Name** written in reverse. It groups related projects together.
* *Example:* `io.jsonwebtoken` belongs to the JJWT project group, while `org.springframework.boot` belongs to Spring Boot.


* **`<artifactId>`**: **YES.** This is the **exact name of the specific JAR file / library** you are importing within that group.
* *Example:* Inside `io.jsonwebtoken`, the artifact `jjwt-api` is the specific API library.


* **`<version>`**: **YES.** The release version of that specific artifact (e.g., `0.12.5`).
* **`<scope>`**: **YES.** This tells Maven **WHEN** the code is actually needed by Java:
* **Compile time (Default if omitted):** Needed when writing code (`.java` $\rightarrow$ `.class`) AND when running the app.
* **`runtime`:** NOT needed while writing Java code (prevents you from importing internal classes directly), but required when the application is actually running (`java -jar`).



---

### **Quick Example Breakdown**

```xml
<dependency>
    <!-- 1. The Group / Company -->
    <groupId>io.jsonwebtoken</groupId>
    
    <!-- 2. The Specific Library Name -->
    <artifactId>jjwt-api</artifactId>
    
    <!-- 3. The Release Version -->
    <version>0.12.5</version>

    <scope>runtime</scope>
</dependency>

```

---

