# TypeScript Language Fundamentals

TypeScript questions in interviews are rarely about React at all — they're about whether you can model data correctly: generics, unions, and utility types show up in API clients, form validators, and backend services just as often as in components, so this is the part of TypeScript worth being fluent in regardless of what framework sits on top of it.

## 1. Basic Types and Type Inference

TypeScript adds a static type layer on top of JavaScript's existing types — primitives, arrays, objects — plus a few constructs JavaScript doesn't have at all, like `interface`, literal types, and generics.

```typescript
let id: number = 1;
let name: string = 'Vikash';
let isActive: boolean = true;
let tags: string[] = ['ts', 'interview'];
let coordinates: [number, number] = [12.9, 77.6]; // tuple — fixed length, fixed types per slot

// Literal types: not just "a string", but one specific string
type Environment = 'development' | 'staging' | 'production';
let env: Environment = 'production';
// env = 'prod'; // compile error — not one of the allowed literals

// Object shape — interface is the idiomatic choice for this
interface User {
  readonly id: number;   // can be read but never reassigned after creation
  name: string;
  email: string;
  nickname?: string;     // optional — may be undefined
}

const user: User = { id: 1, name: 'Vikash', email: 'v@example.com' };
// user.id = 2; // compile error — readonly
```

Most of the time you don't need to annotate a variable at all — TypeScript infers the type from the initializer (`const total = 42` is inferred as `number`, not typed manually). Explicit annotations earn their place on function parameters, function return types for public APIs, and anywhere the initializer alone wouldn't make the type obvious.

## 2. Generics — Reusable, Type-Safe Code

A function or type written without generics either has to duplicate itself per type, or fall back to `any` and lose type safety entirely. Generics let you write the logic once and have the compiler fill in and check the concrete type at every call site.

```typescript
// A generic function: T is discovered from the argument, not written by the caller
function firstOf<T>(items: T[]): T | undefined {
  return items[0];
}

const firstName = firstOf(['Vikash', 'Anita']); // T inferred as string
const firstId = firstOf([1, 2, 3]);             // T inferred as number
```

The most useful shape in real code is a generic wrapper type — the exact pattern behind almost every API client:

```typescript
// A generic response envelope, reused for every endpoint's payload
interface ApiResponse<T> {
  data: T;
  status: number;
  error: string | null;
}

async function fetchJson<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);
  if (!res.ok) {
    return { data: null as unknown as T, status: res.status, error: res.statusText };
  }
  const payload = (await res.json()) as T;
  return { data: payload, status: res.status, error: null };
}

interface User {
  id: number;
  name: string;
  email: string;
}

const response = await fetchJson<User>('/api/users/1');
response.data.name; // typed as string — no cast needed, no "any" leaking through
```

`ApiResponse<User>` and `ApiResponse<Invoice[]>` share the exact same interface with zero duplicated code. A bounded generic goes further — constraining `T` so the compiler can check property access against it:

```typescript
// K extends keyof T: key must actually be a property of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user2 = { name: 'Vikash', age: 33 };
const name = getProperty(user2, 'name'); // inferred as string
const age = getProperty(user2, 'age');   // inferred as number
// getProperty(user2, 'email');          // compile error — 'email' isn't a key of user2
```

## 3. Union and Intersection Types

A union (`A | B`) says "one of these"; an intersection (`A & B`) says "all of these, combined." Both come up constantly when modeling real data — a value that can be one of a few shapes, or a type built by merging two smaller ones.

```typescript
// Union: an ID might be assigned as a number or a UUID string
type ID = string | number;

function formatId(id: ID): string {
  return typeof id === 'number' ? `#${id}` : id.toUpperCase();
}

// Intersection: combine a base config with environment-specific overrides
interface BaseConfig {
  timeoutMs: number;
  retries: number;
}

interface ProductionOverrides {
  apiKey: string;
  baseUrl: string;
}

type ResolvedConfig = BaseConfig & ProductionOverrides;

const config: ResolvedConfig = {
  timeoutMs: 5000,
  retries: 3,
  apiKey: 'secret',
  baseUrl: 'https://api.example.com',
};
```

`ResolvedConfig` requires every property from both `BaseConfig` and `ProductionOverrides` — it's the type-level equivalent of object spread (`{ ...base, ...overrides }`), checked at compile time instead of discovered at runtime.

## 4. Discriminated Unions and Type Narrowing

A discriminated union is a union of object types that all share one literal-typed field (the "discriminant"). Checking that field narrows the whole object's type, which is exactly how you model an operation that can succeed or fail without throwing exceptions for expected failure cases.

```typescript
// Result<T, E>: the success/failure shape used instead of throwing for expected errors
type Result<T, E = string> =
  | { success: true; value: T }
  | { success: false; error: E };

function parseJson<T>(input: string): Result<T, string> {
  try {
    return { success: true, value: JSON.parse(input) as T };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

const result = parseJson<{ id: number }>('{"id": 1}');

if (result.success) {
  console.log(result.value.id); // narrowed to { value: { id: number } } — no cast needed
} else {
  console.error(result.error);  // narrowed to { error: string }
}
```

The same narrowing works with `typeof`, `instanceof`, and a custom type guard function when the discriminant isn't a simple literal check:

```typescript
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function logFailure(value: unknown) {
  if (isError(value)) {
    console.error(value.message); // narrowed to Error
  } else {
    console.error('Unknown failure', value); // still unknown here
  }
}
```

`value is Error` is a type predicate — it tells the compiler "if this function returns `true`, treat `value` as `Error` from this point on," which is the general mechanism behind every `if (account.type === 'admin')` style narrowing check.

## 5. Exhaustiveness Checking with `never`

Once you have a discriminated union, a `switch` over its discriminant can be checked by the compiler for completeness — if a new variant is ever added and a `switch` doesn't handle it, that becomes a compile error instead of a silently wrong result in production.

```typescript
type PaymentMethod =
  | { kind: 'card'; last4: string }
  | { kind: 'paypal'; email: string }
  | { kind: 'bank_transfer'; iban: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled payment method: ${JSON.stringify(value)}`);
}

function describePaymentMethod(method: PaymentMethod): string {
  switch (method.kind) {
    case 'card':
      return `Card ending in ${method.last4}`;
    case 'paypal':
      return `PayPal (${method.email})`;
    case 'bank_transfer':
      return `Bank transfer (${method.iban})`;
    default:
      return assertNever(method); // if a case is missing above, `method` isn't `never` here — compile error
  }
}
```

If `PaymentMethod` later grows a fourth variant (say, `{ kind: 'crypto'; wallet: string }`), every `switch` built this way stops compiling until the new case is added — the type system converts "someone forgot to handle the new case" from a runtime bug report into a build failure the author of the change can't ignore.

## 6. Conditional Types

A conditional type picks between two types based on a type-level check — `T extends U ? X : Y` — and combined with `infer`, it can pull a type out of a larger structure instead of just testing it.

```typescript
// Extract what a function returns, purely at the type level
type FnReturn<T> = T extends (...args: any[]) => infer R ? R : never;

function calculateTotal(a: number, b: number): number {
  return a + b;
}

type TotalType = FnReturn<typeof calculateTotal>; // number

// Extract the T out of an ApiResponse<T> without re-declaring it
type UnwrapApiResponse<T> = T extends ApiResponse<infer U> ? U : never;

type UserPayload = UnwrapApiResponse<ApiResponse<User>>; // User
```

This is exactly the mechanism behind built-in utilities like `ReturnType<T>` and `Awaited<T>` — both are conditional types with `infer` under the hood, not special compiler magic.

## 7. Utility Types — Partial, Pick, Omit, Record

TypeScript ships a set of built-in generic types for deriving one type from another, so a related shape (an update payload, a preview object, a lookup table) doesn't have to be hand-written and kept in sync separately.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

// Partial<T>: every property optional — the shape of a PATCH request body
type UpdateUserRequest = Partial<Omit<User, 'id' | 'passwordHash'>>;

function updateUser(id: number, changes: UpdateUserRequest): void {
  // changes might contain just { name: 'New Name' }, or any subset of name/email
}

// Pick<T, K>: only the fields safe to expose publicly
type PublicUser = Pick<User, 'id' | 'name'>;

// Omit<T, K>: everything except the sensitive field
type SafeUser = Omit<User, 'passwordHash'>;

// Record<K, T>: a lookup table with a fixed, known set of keys
type UserRole = 'admin' | 'editor' | 'viewer';
type RolePermissions = Record<UserRole, string[]>;

const permissions: RolePermissions = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

// Combining them: a form validator's error bag mirrors the form's own keys
interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof SignupForm, string>>;

function validate(form: SignupForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.email.includes('@')) errors.email = 'Invalid email';
  if (form.password.length < 8) errors.password = 'Too short';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Does not match';
  return errors;
}
```

`FormErrors` automatically tracks `SignupForm`'s fields via `keyof` — add a field to the form and the error bag's allowed keys update with it, with no separate type to remember to edit.

## Interview Questions and Answers

### 1. What is the actual difference between `interface` and `type`, and which should you default to?

**Answer:** `interface` supports declaration merging (two `interface User {}` declarations with the same name combine into one) and is extended with `extends`; `type` cannot be re-opened but can alias unions, primitives, tuples, and mapped types, which `interface` cannot express (`interface Status = 'a' | 'b'` is a compile error). The common rule of thumb is `interface` for object shapes you expect might be extended, `type` for everything else — unions, intersections, and derived/mapped types.

### 2. Why use a generic type like `ApiResponse<T>` instead of just typing every response as `any` or duplicating the envelope per endpoint?

**Answer:** `any` compiles but throws away all checking — a typo like `response.dta` would only fail at runtime — while duplicating `UserApiResponse`, `InvoiceApiResponse`, etc. means five near-identical interfaces to maintain. `ApiResponse<T>` is written once and reused for every payload shape, and `fetchJson<User>(...)` gives you `.data.name` fully typed and checked at compile time.

### 3. What does a discriminated union buy you over a single object with a bunch of optional fields?

**Answer:** With optional fields, nothing stops you from constructing an invalid combination (a "success" object that also has an `error` populated), and every access needs a manual `if (value !== undefined)` check. A discriminated union like `Result<T, E>` makes invalid states unrepresentable — `success: true` variant simply has no `error` field to accidentally read — and checking the discriminant narrows the whole object's type for you.

### 4. How does exhaustiveness checking with `never` actually catch a missed case at compile time?

**Answer:** In the `default` branch of a `switch` over every known variant of a union, TypeScript narrows the value's type down to `never` because, logically, nothing should reach that branch. Passing that value into a function typed to accept only `never` (`assertNever`) means that if a new union variant is added later and a case for it is missing, the value in `default` is no longer `never`, and the call becomes a compile error instead of running to production with the new variant silently unhandled.

### 5. What's the difference between a type guard like `typeof x === 'string'` and a custom type predicate function (`x is Foo`)?

**Answer:** `typeof`/`instanceof`/discriminant checks are narrowing TypeScript understands natively inline. A custom type predicate (`function isUser(x: Account): x is User`) is needed when the check is more complex than a single built-in operator — for example, checking multiple properties at once — and it tells the compiler "if this returns `true`, narrow the argument to `User`" from that call site onward, exactly as if the check had been written inline.

### 6. What does `Omit<User, 'passwordHash'>` actually generate, and why is it better than writing a second interface by hand?

**Answer:** It's a mapped type that takes every key of `User` except `passwordHash` and builds a new object type from them, computed automatically from `User`'s current shape. Writing `SafeUser` by hand as a second interface means it silently drifts out of sync if a field is later added to `User`; `Omit` (and `Pick`) stay correct automatically because they're derived, not duplicated.

### 7. What is a conditional type, and where does `infer` fit in?

**Answer:** A conditional type (`T extends U ? X : Y`) is an if/else evaluated on types instead of values. `infer` lets you capture part of the type being checked and name it for reuse in the true branch — `T extends (...args: any[]) => infer R ? R : never` checks "is T a function?" and, if so, captures its return type as `R`. It's exactly how built-ins like `ReturnType<T>` and `Awaited<T>` are implemented, not a separate compiler feature.

### 8. Why is `unknown` generally preferred over `any` for something like a caught error or an untyped API response?

**Answer:** `any` disables type checking entirely — you can call any method on it and the compiler stays silent even if that method doesn't exist. `unknown` still requires narrowing (`typeof`, `instanceof`, or a type guard) before you can use the value in any specific way, so mistakes like calling `.message` on a caught value that isn't actually an `Error` get caught at compile time instead of at runtime.

## Revision Checklist

- [ ] Write a generic wrapper type (`ApiResponse<T>`) and a generic function bounded with `keyof`.
- [ ] Explain union vs intersection types with a real example of each (an `ID` union, a merged config intersection).
- [ ] Model a success/failure operation as a discriminated union (`Result<T, E>`) instead of optional fields.
- [ ] Narrow a union with `typeof`, a discriminant check, and a custom `x is Foo` type predicate.
- [ ] Write an exhaustive `switch` over a discriminated union using the `assertNever(value: never)` pattern.
- [ ] Use `infer` inside a conditional type to extract a type from a larger structure.
- [ ] Derive a request/response/lookup type with `Partial`, `Pick`, `Omit`, and `Record` instead of hand-writing a second interface.
- [ ] State the concrete difference between `interface` and `type`, including declaration merging.
