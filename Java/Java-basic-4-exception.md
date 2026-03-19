

#### 🔹 Exception Handling (Java)

👉 **Exception = runtime error that disrupts normal flow**



#### 🔹 Types of Exception



### 📌 Checked Exception

👉 Checked at **compile time**

* Must handle using `try-catch` or `throws`

👉 Example:

* IOException
* SQLException

---

### 📌 Unchecked Exception

👉 Occurs at **runtime**

* Not compulsory to handle

👉 Example:

* NullPointerException
* ArithmeticException

---

### 🔹 try-catch

👉 Used to **handle exception**



### 📌 Example

```java
try {
    int a = 10 / 0;
} catch (Exception e) {
    System.out.println("Error occurred");
}
```

👉 Output:

```
Error occurred
```



##### 🔹 finally

👉 Always executes (whether exception occurs or not)


### 📌 Example

```java
try {
    int a = 10 / 0;
} catch (Exception e) {
    System.out.println("Error");
} finally {
    System.out.println("Always runs");
}
```

---

# #### 🔹 throw

👉 Used to **manually throw exception**



### 📌 Example

```java
if(age < 18) {
    throw new RuntimeException("Not allowed");
}
```


#### 🔹 throws

👉 Declares exception in method signature

#### What is the purpose of the throw and throws keywords?
*throw*: Used to explicitly throw an exception from a method or block of code.

*throw*s: Used in a method signature to declare that a method might throw one or more specified types of checked exceptions. It informs the caller that they need to handle or declare these exceptions.


### 📌 Example

```java
void readFile() throws IOException {
}
```

#### 🔹 Multiple Catch

👉 Handle different exceptions

```java
try {
} catch (ArithmeticException e) {
} catch (Exception e) {
}
```

#### 🔹 Custom Exception

👉 Create your own exception



### 📌 Example idea

```java
class MyException extends Exception {
}
```



# #### 🔥 Execution Flow (Important)

1. try runs
2. exception occurs
3. catch runs
4. finally runs



# #### ⚠️ Important Points

* `try` must have **catch or finally**
* `finally` always runs (except JVM crash)
* Only one catch executes
* Order → specific to general



# #### 🔥 Checked vs Unchecked

| Feature    | Checked     | Unchecked            |
| ---------- | ----------- | -------------------- |
| Check time | Compile     | Runtime              |
| Mandatory  | Yes         | No                   |
| Example    | IOException | NullPointerException |

---

# #### ⚡ Quick Revision

* try → risky code
* catch → handle error
* finally → always runs
* throw → manually throw
* throws → declare

---

👉 Next we can do **Tricky Questions (VERY IMPORTANT 🔥)** or move to **Multithreading / Stream API / Spring Boot** 👍
