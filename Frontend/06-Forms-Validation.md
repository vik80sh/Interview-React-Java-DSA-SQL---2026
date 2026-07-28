# React Forms & Validation - Complete Interview Guide
## Form Handling, Validation, React Hook Form, Formik

---

## TABLE OF CONTENTS
1. Form Basics & Controlled Components
2. Form Validation Patterns
3. React Hook Form Mastery
4. Formik Patterns
5. Common Interview Questions

---

# PART 1: FORM BASICS

## Controlled vs Uncontrolled Components (Review)

```typescript
// ❌ UNCONTROLLED: Component stores input value
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

// ✅ CONTROLLED: React manages input value
function ControlledForm() {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Value:', value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

// WHEN TO USE:
// Controlled: 90% of cases (validation, conditional rendering)
// Uncontrolled: File inputs, integration with non-React code
```

---

## Basic Form State Management

```typescript
interface FormData {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    terms: false
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

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
      console.log('Form valid:', formData);
      // Submit to server
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Name"
        />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </div>

      <div>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>

      <div>
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>

      <div>
        <input
          name="terms"
          type="checkbox"
          checked={formData.terms}
          onChange={handleChange}
        />
        <label>I accept terms</label>
        {errors.terms && <span style={{ color: 'red' }}>{errors.terms}</span>}
      </div>

      <button type="submit">Register</button>
    </form>
  );
}
```

---

# PART 2: FORM VALIDATION PATTERNS

## Real-time Validation

```typescript
interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

function ValidationRules {
  email: (value: string) => {
    if (!value) return 'Email required';
    if (!value.includes('@')) return 'Invalid email format';
    if (value.length > 100) return 'Email too long';
    return '';
  },
  password: (value: string) => {
    if (!value) return 'Password required';
    if (value.length < 8) return 'Password must be 8+ characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain uppercase';
    if (!/[0-9]/.test(value)) return 'Password must contain number';
    return '';
  },
  confirmPassword: (value: string, password: string) => {
    if (!value) return 'Confirm password required';
    if (value !== password) return 'Passwords do not match';
    return '';
  }
}

function SignUpForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time validation only if field was touched
    if (touched[name as keyof FormData]) {
      validateField(name as keyof FormData, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name as keyof FormData, value);
  };

  const validateField = (fieldName: keyof FormData, value: string) => {
    let error = '';

    if (fieldName === 'email') {
      error = ValidationRules.email(value);
    } else if (fieldName === 'password') {
      error = ValidationRules.password(value);
    } else if (fieldName === 'confirmPassword') {
      error = ValidationRules.confirmPassword(value, formData.password);
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    Object.keys(formData).forEach(fieldName => {
      const key = fieldName as keyof FormData;
      const value = formData[key];
      validateField(key, typeof value === 'string' ? value : '');
    });

    if (Object.values(errors).every(err => !err)) {
      console.log('Form valid, submitting...', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Email"
        />
        {touched.email && errors.email && (
          <span style={{ color: 'red' }}>{errors.email}</span>
        )}
      </div>

      <div>
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Password"
        />
        {touched.password && errors.password && (
          <span style={{ color: 'red' }}>{errors.password}</span>
        )}
      </div>

      <div>
        <input
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Confirm password"
        />
        {touched.confirmPassword && errors.confirmPassword && (
          <span style={{ color: 'red' }}>{errors.confirmPassword}</span>
        )}
      </div>

      <button type="submit">Sign Up</button>
    </form>
  );
}

// STEP-BY-STEP:
// 1. Track which fields have been touched
// 2. Validate only touched fields in real-time
// 3. Show errors only for touched fields (better UX)
// 4. Validate all fields on submit
```

---

# PART 3: REACT HOOK FORM MASTERY

## React Hook Form Basics

```typescript
// REACT HOOK FORM = Minimal re-renders, simpler API

import { useForm } from 'react-hook-form';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    mode: 'onBlur' // Validate on blur
  });

  const onSubmit = (data: LoginFormData) => {
    console.log('Form data:', data);
    // Submit to server
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email', {
            required: 'Email required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          placeholder="Email"
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}
      </div>

      <div>
        <input
          {...register('password', {
            required: 'Password required',
            minLength: {
              value: 8,
              message: 'Password must be 8+ characters'
            }
          })}
          type="password"
          placeholder="Password"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}
      </div>

      <div>
        <input
          {...register('rememberMe')}
          type="checkbox"
        />
        <label>Remember me</label>
      </div>

      <button type="submit">Login</button>
    </form>
  );
}

// BENEFITS OF REACT HOOK FORM:
// - Minimal re-renders (only affected fields)
// - Smaller bundle size (~8KB)
// - Built-in validation rules
// - Great TypeScript support
// - Less boilerplate than custom form handling
```

---

## React Hook Form with Custom Validation

```typescript
import { useForm, useWatch, useFieldArray } from 'react-hook-form';

interface SignUpData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  interests: { name: string }[];
}

function AdvancedForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    control,
    setError
  } = useForm<SignUpData>({
    mode: 'onChange'
  });

  const password = watch('password');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'interests'
  });

  const onSubmit = async (data: SignUpData) => {
    // Check if username exists (server-side validation)
    const usernameExists = await checkUsernameAvailability(data.username);
    if (usernameExists) {
      setError('username', {
        message: 'Username already taken'
      });
      return;
    }

    // Submit form
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('username', {
            required: 'Username required',
            minLength: 3,
            validate: {
              // Custom validation
              noSpaces: (value) => !/\s/.test(value) || 'No spaces allowed',
              noSpecialChars: (value) => /^[a-zA-Z0-9_]+$/.test(value) || 'Only letters, numbers, underscore'
            }
          })}
          placeholder="Username"
        />
        {errors.username && <span style={{ color: 'red' }}>{errors.username.message}</span>}
      </div>

      <div>
        <input
          {...register('email', {
            required: 'Email required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email'
            }
          })}
          placeholder="Email"
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}
      </div>

      <div>
        <input
          {...register('password', {
            required: 'Password required',
            minLength: 8
          })}
          type="password"
          placeholder="Password"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}
      </div>

      <div>
        <input
          {...register('confirmPassword', {
            validate: (value) => value === password || 'Passwords do not match'
          })}
          type="password"
          placeholder="Confirm password"
        />
        {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword.message}</span>}
      </div>

      <div>
        <h3>Interests</h3>
        {fields.map((field, index) => (
          <div key={field.id}>
            <input
              {...register(`interests.${index}.name`)}
              placeholder="Interest"
            />
            <button type="button" onClick={() => remove(index)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => append({ name: '' })}>
          Add Interest
        </button>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}

// ADVANCED FEATURES:
// - useWatch: Watch specific field values
// - useFieldArray: Handle dynamic fields
// - setError: Set errors programmatically
// - Custom validation functions
```

---

# PART 4: FORMIK PATTERNS

## Formik Basics

```typescript
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

interface LoginFormData {
  email: string;
  password: string;
}

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email required'),
  password: Yup.string()
    .min(8, 'Password too short')
    .required('Password required')
});

function LoginForm() {
  const initialValues: LoginFormData = {
    email: '',
    password: ''
  };

  const handleSubmit = async (values: LoginFormData) => {
    console.log('Form values:', values);
    // Submit to server
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, isValid, dirty }) => (
        <Form>
          <div>
            <Field
              name="email"
              type="email"
              placeholder="Email"
            />
            <ErrorMessage name="email" component="span" />
          </div>

          <div>
            <Field
              name="password"
              type="password"
              placeholder="Password"
            />
            <ErrorMessage name="password" component="span" />
          </div>

          <button type="submit" disabled={isSubmitting || (!isValid || !dirty)}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

---

# PART 5: COMMON INTERVIEW QUESTIONS

## Question 1: Controlled vs Uncontrolled - Which to use?

```typescript
// ANSWER:
// Use CONTROLLED in 90% of cases because you need:
// - Validation
// - Conditional rendering
// - Cross-field validation
// - Dynamic form fields
// - Complex logic

// Use UNCONTROLLED when:
// - File input (can't control programmatically)
// - Integrating with non-React code
// - Simple forms with no validation

// INTERVIEW TIP: Default answer is "controlled" unless specified
```

---

## Question 2: Form validation - Best practice?

```typescript
// ANSWER: Use a form library (React Hook Form or Formik)

// REACT HOOK FORM (RECOMMENDED - lighter):
// - Minimal re-renders
// - Smaller bundle
// - Great TypeScript support
// - Perfect for simple to complex forms

// FORMIK (ALTERNATIVE):
// - More batteries-included
// - Better for very complex forms
// - Larger bundle

// WHEN TO USE WHICH:
// - Simple form → React Hook Form
// - Complex form with many features → Formik
// - Custom needs → Write custom hook

// EXAMPLE CUSTOM HOOK:
function useFormValidation<T>(initialValues: T, validate: (values: T) => Partial<T>) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof T]) {
      const newErrors = validate({ ...values, [name]: value });
      setErrors(newErrors);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate(values);
    setErrors(newErrors);
  };

  const handleSubmit = (onSubmit: (values: T) => void) => (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate(values);
    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    } else {
      setErrors(newErrors);
    }
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit
  };
}
```

---

## Question 3: How to handle async validation?

```typescript
// SCENARIO: Check if email is already registered

// WITH REACT HOOK FORM:
import { useForm } from 'react-hook-form';

function SignUpForm() {
  const { register, formState: { errors } } = useForm({
    mode: 'onBlur'
  });

  return (
    <form>
      <input
        {...register('email', {
          required: 'Email required',
          validate: async (email) => {
            const exists = await checkEmailExists(email);
            return !exists || 'Email already registered';
          }
        })}
        placeholder="Email"
      />
      {errors.email && <span>{errors.email.message}</span>}
    </form>
  );
}

// WITH FORMIK:
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email()
    .required()
    .test('email-exists', 'Email already registered', async (value) => {
      const exists = await checkEmailExists(value);
      return !exists;
    })
});

// BEST PRACTICE: Debounce async validation
const validateEmailAsync = debounce(async (email: string) => {
  if (!email.includes('@')) return;
  const exists = await checkEmailExists(email);
  if (exists) {
    setError('Email already registered');
  }
}, 500);
```

---

## Question 4: Dynamic form fields - How to handle?

```typescript
// SCENARIO: Add/remove fields dynamically (like multiple addresses)

// WITH REACT HOOK FORM:
import { useFieldArray, useForm } from 'react-hook-form';

function DynamicForm() {
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      addresses: [{ street: '', city: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses'
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      {fields.map((field, index) => (
        <div key={field.id}>
          <input {...register(`addresses.${index}.street`)} placeholder="Street" />
          <input {...register(`addresses.${index}.city`)} placeholder="City" />
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

// WITH FORMIK:
function DynamicForm() {
  const [addresses, setAddresses] = useState([{ street: '', city: '' }]);

  const handleAddAddress = () => {
    setAddresses([...addresses, { street: '', city: '' }]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  return (
    <Formik
      initialValues={{ addresses }}
      onSubmit={(values) => console.log(values)}
    >
      {({ values, handleChange }) => (
        <Form>
          {values.addresses.map((_, index) => (
            <div key={index}>
              <Field
                name={`addresses.${index}.street`}
                placeholder="Street"
              />
              <Field
                name={`addresses.${index}.city`}
                placeholder="City"
              />
              <button type="button" onClick={() => handleRemoveAddress(index)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={handleAddAddress}>
            Add Address
          </button>
          <button type="submit">Submit</button>
        </Form>
      )}
    </Formik>
  );
}
```

---

# SUMMARY: Forms & Validation Mastery

✅ **Form Basics:**
- [ ] Understand controlled vs uncontrolled
- [ ] Know when to use each
- [ ] Can implement basic form handling

✅ **Validation:**
- [ ] Can validate on change, blur, submit
- [ ] Know real-time vs submit validation
- [ ] Understand touched field optimization
- [ ] Can validate dependent fields

✅ **React Hook Form:**
- [ ] Know basic setup with register
- [ ] Can use useFieldArray for dynamic fields
- [ ] Understand useWatch for cross-field logic
- [ ] Know performance benefits

✅ **Formik:**
- [ ] Know Formik patterns
- [ ] Can use Yup schema validation
- [ ] Understand FieldArray component

✅ **Interview:**
- [ ] Know which library to recommend
- [ ] Can handle async validation
- [ ] Know dynamic form patterns
- [ ] Can optimize form performance

---

**Master forms and you're 15% closer to nailing interviews!**
