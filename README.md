# Full Stack Interview Preparation - Complete Guide
## For Big Tech Companies (Microsoft, Google, Amazon, etc.)
### Timeline: 1-2 Months | Focus: Heavy Frontend + Solid Backend

---

## 📚 GUIDE OVERVIEW

This comprehensive interview preparation kit covers everything you need to succeed in full-stack interviews at big tech companies.

### What's Included:

```
Interview/
├── fullstack-interview-roadmap.md          ← START HERE (6-week plan)
├── Frontend/
│   ├── 01-React-Advanced-Patterns.md       ← Hooks, Context, Performance (49KB)
│   ├── 02-TypeScript-Advanced.md           ← Types, Generics, React patterns (23KB)
│   └── 03-Testing-Best-Practices.md        ← Jest, RTL, Real examples (22KB)
└── README.md                               ← This file
```

---

## 🚀 HOW TO USE THIS GUIDE

### Week 1-2: Deep Dive on Hooks & Advanced Patterns
**File:** `Frontend/01-React-Advanced-Patterns.md`

Learn:
- useState, useEffect, useCallback, useMemo deep dives
- useContext patterns and optimization
- useReducer for complex state
- Custom hooks (useFetch, useDebounce, useAsync, useToggle)
- React fiber architecture
- Performance optimization techniques

Time: 20-25 hours

---

### Week 2-3: Master TypeScript for React
**File:** `Frontend/02-TypeScript-Advanced.md`

Learn:
- Advanced types (generics, unions, intersections, conditional types)
- Utility types (Pick, Omit, Partial, Required, etc.)
- Type guards and narrowing
- React component typing (props, hooks, forwardRef, memo)
- Real-world patterns with TypeScript

Time: 15-20 hours

---

### Week 3-4: Testing Mastery
**File:** `Frontend/03-Testing-Best-Practices.md`

Learn:
- Jest fundamentals and matchers
- React Testing Library best practices
- Testing forms, custom hooks, context, API calls
- Test patterns and coverage
- Common interview questions

Time: 15-20 hours

---

### Week 4-6: Backend, System Design, DSA

For Backend guides (Java Spring Boot), System Design, and DSA preparation, refer to:
- `fullstack-interview-roadmap.md` (in the Interview/ folder)

---

## 📋 QUICK REFERENCE: React Interview Topics

### Hooks (Most Asked)

| Hook | Use Case | Interview Weight |
|------|----------|-----------------|
| useState | Simple state | ⭐⭐⭐⭐⭐ |
| useEffect | Side effects, lifecycle | ⭐⭐⭐⭐⭐ |
| useCallback | Prevent re-renders | ⭐⭐⭐⭐ |
| useMemo | Expensive calculations | ⭐⭐⭐⭐ |
| useContext | Global state | ⭐⭐⭐⭐ |
| useReducer | Complex state logic | ⭐⭐⭐ |
| Custom Hooks | Code reuse | ⭐⭐⭐⭐ |

---

### Performance Optimization

| Topic | Interview Weight |
|-------|-----------------|
| React.memo | ⭐⭐⭐⭐⭐ |
| useMemo & useCallback tradeoffs | ⭐⭐⭐⭐ |
| Code splitting & lazy loading | ⭐⭐⭐ |
| Virtual scrolling | ⭐⭐⭐ |
| Image optimization | ⭐⭐⭐ |

---

### TypeScript

| Topic | Interview Weight |
|-------|-----------------|
| Basic types & interfaces | ⭐⭐⭐⭐⭐ |
| Generics | ⭐⭐⭐⭐⭐ |
| Union & Intersection types | ⭐⭐⭐⭐ |
| Type guards | ⭐⭐⭐⭐ |
| Utility types | ⭐⭐⭐⭐ |
| React component typing | ⭐⭐⭐⭐⭐ |

---

### Testing

| Topic | Interview Weight |
|-------|-----------------|
| Jest basics | ⭐⭐⭐⭐ |
| React Testing Library | ⭐⭐⭐⭐⭐ |
| Testing forms | ⭐⭐⭐⭐ |
| Mocking APIs | ⭐⭐⭐⭐ |
| Testing custom hooks | ⭐⭐⭐ |

---

## 🎯 COMMON INTERVIEW QUESTIONS (By File)

### From 01-React-Advanced-Patterns.md

1. **What happens when setState is called?**
   - Batching, reconciliation, re-rendering

2. **What's the virtual DOM and how does reconciliation work?**
   - Fiber architecture, diff algorithm

3. **When does React NOT batch state updates?**
   - setTimeout, Promises, async operations

4. **How do you prevent unnecessary re-renders?**
   - React.memo, useMemo, useCallback

5. **What are the rules of hooks?**
   - Only at top level, only in React functions

6. **How to prevent memory leaks in effects?**
   - Cleanup functions, useEffect dependencies

7. **When should you use useCallback vs useMemo?**
   - useCallback for functions, useMemo for values

---

### From 02-TypeScript-Advanced.md

1. **What's the difference between interface and type?**
   - Declaration merging, extends, unions, mapped types

2. **How do you use generics in React components?**
   - Generic function components, custom hooks

3. **What are conditional types used for?**
   - Determine return type based on input type

4. **How do you safely use useContext?**
   - Custom hook with error handling

5. **What utility types do you use most?**
   - Pick, Omit, Partial, Required

---

### From 03-Testing-Best-Practices.md

1. **What's the difference between getByRole and getByTestId?**
   - Accessibility first, user-centric queries

2. **When should you use findBy vs getBy?**
   - findBy for async, getBy for synchronous

3. **How do you mock API calls in tests?**
   - jest.mock, MSW (Mock Service Worker)

4. **How do you test a custom hook?**
   - renderHook from @testing-library/react

5. **What's good test coverage?**
   - 80-90%, focus on critical paths

---

## 💡 STUDY TIPS

### 1. **Read Active, Not Passive**
- For each section, code along
- Don't just read examples
- Implement every pattern yourself

### 2. **Create Flashcards**
- Interview questions and answers
- Create Anki/Quizlet decks
- Review daily

### 3. **Build a Project**
- Apply every concept from these guides
- Create task manager + real-time features
- Deploy it (Vercel, Netlify)

### 4. **Mock Interviews**
- Pramp.com (free mock interviews)
- LeetCode Premium (timed mocks)
- Interview with friends

### 5. **Practice Interview Questions**
- Speak answers out loud
- Explain "thinking process"
- Discuss tradeoffs, not just solutions

---

## 🔥 ADVANCED TOPICS TO MASTER

### React Patterns You Should Know

```
1. Controlled vs Uncontrolled Components
2. Compound Components
3. Render Props vs HOC vs Hooks
4. State Machine Pattern
5. Dependency Injection with Context
```

### Real-World Scenarios You Should Handle

```
1. Infinite scroll list (virtual scrolling)
2. Autocomplete search (debounce, memoization)
3. Form validation (state management)
4. Real-time notifications (WebSocket)
5. Modal/Dialog management (portal, context)
```

---

## 📊 PROGRESS TRACKING

Use this checklist to track your progress:

### React Advanced Patterns (Week 1-2)
- [ ] Understand useState closure behavior
- [ ] Know useEffect cleanup and dependencies
- [ ] Understand useCallback vs useMemo
- [ ] Know when useContext causes re-renders
- [ ] Can implement 3+ custom hooks
- [ ] Understand React fiber architecture
- [ ] Know performance optimization techniques

### TypeScript (Week 2-3)
- [ ] Know basic types and interfaces
- [ ] Understand generics
- [ ] Know utility types (Pick, Omit, Partial, etc.)
- [ ] Know type guards and narrowing
- [ ] Can type React components properly
- [ ] Understand conditional types

### Testing (Week 3-4)
- [ ] Know Jest matchers
- [ ] Understand RTL query priorities
- [ ] Can test forms and async operations
- [ ] Know how to mock APIs
- [ ] Can test custom hooks
- [ ] Know coverage goals (80-90%)

### Applied Skills (Week 4-6)
- [ ] Built complete React + Spring Boot app
- [ ] 70%+ code coverage
- [ ] Pass 3+ mock interviews
- [ ] Can design a full-stack system

---

## 🎬 NEXT STEPS

1. **Today:** Read the 6-week roadmap
2. **Tomorrow:** Start with 01-React-Advanced-Patterns (Hooks section)
3. **Week 1:** Finish React advanced patterns guide
4. **Week 2:** Learn TypeScript deeply
5. **Week 3:** Master testing
6. **Week 4-6:** Backend, System Design, DSA, Projects, Mock interviews

---

## 📞 INTERVIEW DAY TIPS

### Before Interview
- [ ] Review your project code
- [ ] Practice 5-7 STAR method stories
- [ ] Do 1-2 mock interviews
- [ ] Get good sleep night before
- [ ] Have water nearby

### During Interview
- [ ] Ask clarifying questions
- [ ] Think out loud
- [ ] Discuss tradeoffs (no single right answer)
- [ ] Show your full-stack thinking
- [ ] Be humble about what you're learning

### What They're Evaluating
- **Technical skills** (60%) - DSA, system design, React
- **Communication** (20%) - Can you explain clearly?
- **Problem-solving** (15%) - Do you ask right questions?
- **Culture fit** (5%) - Are you collaborative?

---

## 🏆 SUCCESS METRICS

After completing this guide, you should be able to:

✅ **Explain any React hook** - Not just what it does, but WHY and HOW
✅ **Design performance-optimized components** - Know when to use memo, useMemo, useCallback
✅ **Type-safe React code** - React + TypeScript without any `any` types
✅ **Test like a pro** - Know what to test and how to test it
✅ **Solve DSA problems** - 60+ LeetCode medium problems
✅ **Design systems** - Frontend + Backend + Database considerations
✅ **Build a real project** - Full-stack app deployed and working

---

## 📖 FILE SIZES & READING TIME

| File | Size | Reading Time | Best For |
|------|------|-------------|----------|
| fullstack-interview-roadmap.md | 28KB | 45-60 min | Overview & planning |
| 01-React-Advanced-Patterns.md | 49KB | 3-4 hours | Hooks & performance |
| 02-TypeScript-Advanced.md | 23KB | 2-3 hours | Type safety |
| 03-Testing-Best-Practices.md | 22KB | 2-3 hours | Testing mastery |

**Total reading time:** ~10-12 hours
**Total study time with practice:** ~50-60 hours over 6 weeks

---

## 🎯 FINAL CHECKLIST BEFORE INTERVIEW

- [ ] Can explain useState closure behavior
- [ ] Know difference between useCallback and useMemo
- [ ] Understand React fiber reconciliation
- [ ] Can type React components in TypeScript
- [ ] Know how to test with React Testing Library
- [ ] Have 5-7 STAR method stories prepared
- [ ] Built and deployed a full-stack project
- [ ] Pass 3+ mock interviews with 70%+ score
- [ ] Can discuss system design tradeoffs
- [ ] Know 60+ LeetCode medium problems

---

**Good luck with your interviews! You've got this! 🚀**

---

## 📧 LAST MINUTE QUESTIONS?

If you're stuck on any concept:
1. Re-read the relevant section
2. Code the example yourself
3. Modify the example
4. Teach it to someone else
5. Search for related GitHub repos

Remember: **Understanding > Memorization**

The best interview is when you can explain WHY a solution works, not just WHAT the code does.

---

**Happy coding! 💻**
