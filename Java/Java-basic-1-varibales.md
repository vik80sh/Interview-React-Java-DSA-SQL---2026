
### 📝 JAVA BASICS – SHORT NOTES

---

#### 🔹 1. Java Program Structure

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

### Key Points

* Execution starts from `main()`
* Class name = file name
* JVM calls `main()` → must be `static`

---

### 🔹 2. Variables (with example)

```java
class Student {

    int age = 20;                // Instance variable
    static String college = "ABC"; // Static variable

    void show() {
        int marks = 90;          // Local variable
        System.out.println(age + " " + marks + " " + college);
    }

    public static void main(String[] args) {
        Student s1 = new Student();
        s1.show();
    }
}
```
**static (Java):** Belongs to the class, not to objects — shared by all instances and can be accessed using the class name.
Used with variables, methods, blocks, and inner classes; cannot be used with local variables inside methods.

### Types

| Type     | Where         | Memory |
| -------- | ------------- | ------ |
| Local    | Inside method | Stack  |
| Instance | Inside class  | Heap   |
| Static   | Class level   | Heap   |

---

### Key Points

* Local → no default value
* Instance/Static → have default values
* Static → shared across all objects

---

# 🔹 3. Data Types

### Primitive

`int, double, char, boolean`

```java
int a = 10;
double b = 10.5;
```

---

### Non-Primitive

`String, Array, Object`

```java
String name = "Vikash";
```

---

### Difference

| Primitive  | Non-Primitive |
| ---------- | ------------- |
| Value      | Reference     |
| Fast       | Slower        |
| No methods | Has methods   |

---


#### 📝 Java Data Types – Default Value + Range

| Data Type | Default Value | Range                           |
| --------- | ------------- | ------------------------------- |
| byte      | 0             | -128 to 127                     |
| short     | 0             | -32,768 to 32,767               |
| int       | 0             | -2³¹ to (2³¹ - 1)               |
| long      | 0L            | -2⁶³ to (2⁶³ - 1)               |
| float     | 0.0f          | ~±3.4E38 (6-7 digits precision) |
| double    | 0.0d          | ~±1.7E308 (15 digits precision) |
| char      | '\u0000'      | 0 to 65,535 (unsigned)          |
| boolean   | false         | true / false only               |
| String    | null          | No fixed range (object)         |
| Object    | null          | No fixed range (reference)      |

---

#### ⚡ Important Points

* ****byte, short, int, long → integer types****
* ****float, double → decimal types****
* ****char → 2 byte, stores Unicode (no negative values)****
* ****boolean → not numeric (no range like others)****

---

# 🔥 Shortcut (INTERVIEW TRICK)

| Type  | Size   | Range Formula |
| ----- | ------ | ------------- |
| byte  | 1 byte | -2⁷ to 2⁷-1   |
| short | 2 byte | -2¹⁵ to 2¹⁵-1 |
| int   | 4 byte | -2³¹ to 2³¹-1 |
| long  | 8 byte | -2⁶³ to 2⁶³-1 |

---

---

#### 🧠 Quick Revision

* Smaller range → byte < short < int < long
* float < double (precision)
* char → 0 to 65535
* boolean → true/false


---

### ⚡ Important Points

* Default values apply only to **instance & static variables**
* ****Local variables have NO default value**** (must initialize manually)

---

### 🔹 Example

```java
class Test {
    int a;        // 0
    boolean b;    // false
    String s;     // null

    public static void main(String[] args) {
        Test t = new Test();
        System.out.println(t.a + " " + t.b + " " + t.s);
    }
}
```
---

# 🔹 4. Memory (Important)

```java
Student s = new Student();
```

```
Stack → s (reference)
Heap  → object
```

---

### Key Points

* Stack → method, local variables
* Heap → objects
* Reference → stored in stack

---

# 🔹 5. Type Casting

### Implicit (Small → Big)

```java
int a = 10;
double b = a;
```

---

### Explicit (Big → Small)

```java
double a = 10.5;
int b = (int) a; // 10
```

---

### Data Loss

```java
int x = 130;
byte b = (byte) x; // -126
```
* When you convert a larger data type into a smaller data type (narrowing conversion) byte range -128 to 127
---
* Data loss happens when:
* double → int → decimal lost
* double → float → precision lost
* float → int → decimal lost

* Safe conversions:
* int → double
* float → double

* float has only 6–7 digit precision->  int to float
* So value changes → data loss

# 🔥 QUICK INTERVIEW POINTS

* `main()` is static → JVM calls without object
* String is **class**, not primitive
* Objects → Heap, variables → Stack
* Static variable → shared
* Explicit casting → data loss possible

---



### 🔹 1. Condition must be boolean

```java
int x = 10;

if (x > 0) { }   // ✔
if (x) { }       // ❌ ERROR
```

👉 No truthy/falsy like JS
👉 Only `true` or `false`

---

### 🔹 2. `==` vs `.equals()`

```java
String a = "hello";
String b = new String("hello");

System.out.println(a == b);      // false (reference)
System.out.println(a.equals(b)); // true (value)
```

 `==` → compares reference
 `.equals()` → compares value

- Primitive → == compares value
- Object → == compares reference

✔ Always use `.equals()` for objects

---

### 🔹 3. No Type Coercion

```java
int x = 5 + "5"; // ❌ ERROR
```

👉 Java does NOT auto convert types (unlike JS)

---

### 🔹 4. switch needs break

```java
switch(x) {
    case 1:
        System.out.println("One");
        break;
}
```

👉 Without `break` → fall-through

---

# ⚡ Quick Revision

* if → boolean only
* `==` → reference
* `.equals()` → value
* No type coercion
* switch → use break

---

