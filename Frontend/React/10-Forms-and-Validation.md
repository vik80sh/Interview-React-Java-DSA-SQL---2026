# Forms and Validation

Forms are where interviewers probe whether you actually understand controlled state, re-render cost, and validation trade-offs — not just whether you can wire up an `onChange`. A good answer connects the input's data flow, when validation runs, and which library (if any) you'd reach for and why.

## 1. Controlled vs Uncontrolled Components

A controlled input has its value held in React state; every keystroke flows through `onChange` and back down through `value`. An uncontrolled input lets the DOM hold the value, and React only reads it on demand via a `ref`.

```typescript
// Uncontrolled: the DOM owns the value, React reads it when needed
function UncontrolledForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Value:', inputRef.current?.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="initial" />
      <button type="submit">Submit</button>
    </form>
  );
}

// Controlled: React owns the value, the DOM just reflects it
function ControlledForm() {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Value:', value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Controlled inputs are the default choice whenever the form needs validation, conditional rendering, cross-field logic, or dynamic fields — which is most real forms. Uncontrolled inputs are the right call for file inputs (a file input's value can't be set programmatically), for integrating with non-React widgets, and for very simple forms where React re-rendering on every keystroke is pure overhead. React Hook Form leans on this second insight: it uses refs under the hood so most fields behave like uncontrolled inputs, while still exposing a controlled-feeling API.

## 2. Manual Form State Management

Before reaching for a library, it's worth being able to build form state by hand — this is exactly what interviewers test to see if you understand what the library is doing for you underneath.

```typescript
interface FormData {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', password: '', terms: false
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Name required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email';
    if (formData.password.length < 8) newErrors.password = 'Password too short';
    if (!formData.terms) newErrors.terms = 'Must accept terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // submit formData to the server
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      {errors.name && <span>{errors.name}</span>}
      <input name="email" value={formData.email} onChange={handleChange} />
      {errors.email && <span>{errors.email}</span>}
      <button type="submit">Register</button>
    </form>
  );
}
```

The pattern is always the same three pieces of state: the values themselves, an error map keyed by field name, and (for anything beyond a toy form) a `touched` map so errors don't show before the user has interacted with a field. A single object keyed by field name — updated with `[name]: value` via the input's `name` attribute — scales much better than one `useState` per field.

## 3. Validation Timing: onChange vs onBlur vs onSubmit

When validation runs is as important as what it checks, and interviewers often ask you to justify the choice directly.

- **onSubmit only** — cheapest to implement, but the user gets no feedback until they've filled out the whole form and hit submit. Fine for very short forms (a single search box, a newsletter signup).
- **onChange (every keystroke)** — most responsive, but naive implementations re-run validation on every character, which is wasteful and can flash an error mid-word (e.g. marking an email invalid before the user has typed the `@`). Usually paired with debouncing for anything expensive.
- **onBlur** — validates when the field loses focus, which is the best default for most forms: the user gets feedback as soon as they move on from a field, without being told a half-typed value is wrong.

The pattern that ties these together is to combine `touched` with `onBlur`: mark a field touched on blur, run validation on blur, and then continue validating on every `onChange` only for fields that are already touched. That way the first error appears on blur, and subsequent corrections get instant feedback.

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  if (touched[name as keyof FormData]) {
    validateField(name as keyof FormData, value);
  }
};

const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setTouched(prev => ({ ...prev, [name]: true }));
  validateField(name as keyof FormData, value);
};
```

Regardless of the per-field timing, always re-validate every field on submit — a user can submit via the Enter key without ever blurring a field, so submit-time validation is the only guaranteed backstop.

## 4. React Hook Form as the Modern Default

React Hook Form (RHF) is the default recommendation for new forms today because it keeps inputs uncontrolled by default (via `register`, which wires up a ref and native event listeners) and only triggers a re-render for the fields that actually have errors or are being watched. That's a meaningfully different performance profile from a `useState`-per-keystroke approach on a large form.

```typescript
import { useForm } from 'react-hook-form';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    mode: 'onBlur'
  });

  const onSubmit = (data: LoginFormData) => {
    // data is already typed and validated
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email', {
          required: 'Email required',
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
        })}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        {...register('password', { required: 'Password required', minLength: 8 })}
        type="password"
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

`register` returns the `name`, `ref`, `onChange`, and `onBlur` an input needs, spread directly onto it. `handleSubmit(onSubmit)` runs validation first and only calls `onSubmit` with typed, valid data. The `mode` option (`onBlur`, `onChange`, `onSubmit`, `onTouched`, `all`) controls validation timing exactly as described above, without hand-rolling a `touched` map.

For cross-field logic, `watch` (or the more targeted `useWatch`, which avoids re-rendering the whole form) exposes another field's live value inside a `validate` function — e.g. confirming a password matches. `setError` lets you attach a server-side error (such as a failed availability check) to a specific field after `handleSubmit`'s async submit handler runs.

## 5. Formik as the Alternative

Formik predates React Hook Form and is still common in older codebases. It's controlled by default and pairs naturally with the Yup schema-validation library, which trades RHF's inline validation rules for a single declarative schema.

```typescript
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email required'),
  password: Yup.string().min(8, 'Password too short').required('Password required')
});

function LoginForm() {
  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={validationSchema}
      onSubmit={(values) => { /* submit to server */ }}
    >
      {({ isSubmitting, isValid, dirty }) => (
        <Form>
          <Field name="email" type="email" />
          <ErrorMessage name="email" component="span" />

          <Field name="password" type="password" />
          <ErrorMessage name="password" component="span" />

          <button type="submit" disabled={isSubmitting || !isValid || !dirty}>
            Login
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

The practical trade-off: Formik is controlled, so every keystroke re-renders through its render-prop/children function, and its bundle is larger than RHF's. It earns its keep on forms that are already deeply invested in the Yup schema ecosystem, or on legacy code where migrating away isn't worth the churn. For new work, React Hook Form is the answer to give first, with Formik mentioned as "the older alternative that's still fine if a codebase already standardized on it."

## 6. Dynamic Field Arrays

Forms with a variable number of repeated fields — multiple addresses, a list of interests, line items on an invoice — need a way to add and remove entries while keeping each entry's own inputs registered correctly. React Hook Form's `useFieldArray` handles this without you managing the array in raw `useState`:

```typescript
import { useFieldArray, useForm } from 'react-hook-form';

function DynamicForm() {
  const { register, control, handleSubmit } = useForm({
    defaultValues: { addresses: [{ street: '', city: '' }] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'addresses' });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`addresses.${index}.street`)} />
          <input {...register(`addresses.${index}.city`)} />
          <button type="button" onClick={() => remove(index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ street: '', city: '' })}>
        Add Address
      </button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

The key detail is `field.id`: `useFieldArray` generates a stable id per row independent of array index, so React's reconciliation doesn't mix up input state when a row in the middle is removed. Rolling this by hand with `useState<Address[]>` and array index as the React `key` is the common mistake — removing a middle item shifts every subsequent index, and inputs can retain stale values because React matches them by key, not by identity. Formik's equivalent is the `FieldArray` component, or a manually managed array of values with `map`.

## 7. Async Validation

Some validation can't be done client-side alone — checking whether a username or email is already taken requires a round trip to the server. This introduces two concerns beyond synchronous validation: not firing a request on every keystroke, and surfacing the result as a normal field error once it resolves.

```typescript
// React Hook Form: an async validate function, run on blur
const { register, formState: { errors } } = useForm({ mode: 'onBlur' });

register('email', {
  required: 'Email required',
  validate: async (email) => {
    const exists = await checkEmailExists(email);
    return !exists || 'Email already registered';
  }
});
```

```typescript
// Formik + Yup: an async .test() on the schema
const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email()
    .required()
    .test('email-exists', 'Email already registered', async (value) => {
      const exists = await checkEmailExists(value);
      return !exists;
    })
});
```

For a field checked on every keystroke rather than on blur (a "username availability" indicator that updates live), debounce the API call so a fast typist doesn't fire a request per character:

```typescript
const checkUsername = debounce(async (username: string) => {
  const exists = await checkUsernameAvailability(username);
  if (exists) setError('username', { message: 'Username already taken' });
}, 500);
```

Async checks that only matter at submit time (rather than live, per keystroke) are better placed inside the submit handler itself — `handleSubmit(onSubmit)`'s `onSubmit` can `await` the check and call `setError` before deciding whether to proceed, which avoids running the network call at all until the user has actually tried to submit.

## Interview Questions and Answers

### 1. Controlled or uncontrolled — which do you default to?

**Answer:** Controlled, for the majority of real forms, because it enables validation, conditional rendering, and cross-field logic. Uncontrolled is the right call for file inputs, integration with non-React widgets, and trivial forms where per-keystroke re-renders are pure overhead. React Hook Form blurs this by using refs internally while still presenting a controlled-feeling API.

### 2. Why does React Hook Form re-render less than a `useState`-based form?

**Answer:** `register` wires a ref and native DOM event listeners directly to the input rather than routing every keystroke through React state, so typing doesn't trigger a re-render of the form component. Re-renders happen only for fields whose validation state changed, or fields explicitly subscribed to via `watch`/`useWatch`. This matters most on large forms where a `useState`-per-field approach re-renders the whole tree on every keystroke.

### 3. What's the difference between validating on change versus on blur?

**Answer:** On-change validation gives the fastest feedback but can flag an error mid-input, such as marking an email invalid before the user finishes typing it. On-blur validation waits until the user leaves the field, which avoids premature errors while still giving feedback before submit. The common pattern is to validate on blur first, then keep validating on change only for fields already touched.

### 4. Why track a `touched` state separately from the values and errors?

**Answer:** Without it, errors would either show for every field before the user has interacted with any of them, or validation would have to be suppressed until submit, which defeats real-time feedback. `touched` lets you compute an error but only render it once the relevant field has been visited, giving accurate real-time validation without a wall of errors on page load.

### 5. When would you choose Formik over React Hook Form today?

**Answer:** Mainly when a codebase already has Formik and Yup deeply embedded, since Formik is controlled and carries a larger bundle with more re-renders per keystroke. For new forms, React Hook Form is the default answer because of its uncontrolled-by-default performance model and smaller footprint; Formik is worth mentioning as the established alternative, not as the first recommendation.

### 6. How do you implement async validation, such as checking username availability?

**Answer:** Attach an async `validate` function (React Hook Form) or an async `.test()` on a Yup schema (Formik) that awaits an API call and returns true or an error message. For validation on every keystroke, debounce the API call so it fires only after the user pauses typing. For a check that only matters at submit, run it inside the submit handler and call `setError` on failure instead of validating live.

### 7. How do you handle a dynamically growing list of fields, like multiple addresses?

**Answer:** Use `useFieldArray` in React Hook Form (or Formik's `FieldArray`), which manages an array of registered fields and exposes `append`/`remove`/`fields`. The critical detail is using the library-generated stable `field.id` as the React key rather than the array index, since removing a middle row shifts every later index and can cause React to misattribute input state to the wrong row.

### 8. How do you validate that two fields agree, such as password and confirm-password?

**Answer:** Read the first field's live value with `watch` (or `useWatch` for a narrower re-render) and reference it inside the second field's `validate` function, returning true or an error message when they don't match. In Formik/Yup, the equivalent is a schema-level `.test()` that has access to sibling fields via the validation context.

### 9. What's the tradeoff of validating everything on submit only?

**Answer:** It's the cheapest to build and avoids any premature error flashing, but the user gets zero feedback until they've filled the entire form and pressed submit, which is a poor experience on longer forms. It's an acceptable choice only for very short forms, such as a single search or subscribe field.

### 10. Why is `PATCH`-style partial state update (`{ ...prev, [name]: value }`) the standard shape for manual form state?

**Answer:** Keeping all field values in a single object keyed by the input's `name` attribute lets one `handleChange` function serve every field, rather than one `useState` and one handler per field. It also mirrors how validation and error objects are naturally shaped — `Partial<Record<keyof FormData, string>>` — so values, errors, and touched state can all be looked up by the same key.

## Revision Checklist

- [ ] Explain controlled vs uncontrolled and justify the default of controlled.
- [ ] Build manual form state: single values object, error map, touched map, keyed by field name.
- [ ] Justify onChange vs onBlur vs onSubmit validation timing and their trade-offs.
- [ ] Set up React Hook Form with `register`, `handleSubmit`, and `formState.errors`.
- [ ] Explain why React Hook Form re-renders less than a controlled approach.
- [ ] Use `useFieldArray` for dynamic fields and explain why `field.id` matters over index.
- [ ] Implement async validation (availability checks) with debouncing.
- [ ] Compare React Hook Form and Formik and state when each is the right call.
