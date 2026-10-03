# Antigravity Project Rules

# PRODUCTION STACK

Laravel
+
Inertia.js
+
React
+
TypeScript
+
Vite
+
Tailwind CSS

Do not replace this stack unless explicitly requested.

---

# RESPONSIBILITIES

Laravel:

- routes
- controllers
- requests
- validation
- authorization
- authentication
- business logic
- Eloquent
- database

Inertia:

- Laravel/React bridge
- page props
- navigation
- forms
- partial reloads

React:

- pages
- components
- UI
- interaction
- client-side state

Tailwind:

- styling
- responsive layout
- design tokens
- states

---

# DESIGN STACK

Use available skills:

1. UI/UX Pro Max
2. Frontend Design
3. Impeccable
4. Framer
5. Web Design Guidelines
6. Theme Factory
7. Tailwind Patterns
8. Mobile Design
9. Accessibility
10. SEO
11. React Best Practices
12. React Patterns
13. Web Artifacts Builder
14. Canvas Design
15. Premium React + Inertia

---

# FRAMER

Framer is OPTIONAL.

Use it for:

- new page concepts
- major redesign
- visual exploration
- responsive exploration
- interaction exploration
- component exploration

Do not use it for:

- small CSS fixes
- N+1
- database optimization
- controller refactoring
- migrations
- authorization
- authentication
- business logic

Production remains:

Laravel + Inertia + React + Tailwind.

---

# REQUEST ROUTING

## MAJOR DESIGN

DISCOVER
→ UX
→ OPTIONAL FRAMER
→ DESIGN SYSTEM
→ IMPLEMENT
→ RESPONSIVE
→ ACCESSIBILITY
→ PERFORMANCE
→ POLISH

## SMALL UI

INSPECT
→ FIX
→ RESPONSIVE
→ ACCESSIBILITY
→ DONE

## NEW FEATURE

DISCOVER
→ LARAVEL
→ INERTIA
→ REACT
→ TYPESCRIPT
→ TAILWIND
→ RESPONSIVE
→ ACCESSIBILITY
→ PERFORMANCE
→ N+1
→ QA

## PERFORMANCE

INSPECT
→ REACT
→ INERTIA
→ LARAVEL
→ N+1
→ OPTIMIZE

---

# REACT RULES

Prefer:

- TypeScript
- reusable components
- typed props
- small components
- predictable state

Avoid:

- unnecessary any
- unnecessary useEffect
- unnecessary context
- giant components
- premature memoization

---

# INERTIA RULES

Prefer:

Controller
→ Inertia
→ React Page

Avoid unnecessary API layers.

Check:

- page props
- shared props
- payload size
- partial reloads
- lazy/deferred data

---

# TAILWIND RULES

Prefer:

- existing design tokens
- consistent spacing
- responsive utilities
- semantic component structure
- reusable class patterns

Avoid:

- arbitrary values without reason
- duplicated styles
- inconsistent spacing
- random colors
- excessive utility duplication

---

# N+1

When relational/database data is relevant:

Check:

- N+1
- lazy loading
- duplicate queries
- relationship loading
- pagination

Prefer:

- eager loading
- constrained eager loading
- selective columns
- pagination

Do not refactor unrelated backend code.

---

# BACKEND PROTECTION

Backend changes are allowed when the requested feature requires them.

Before changing backend:

- inspect first
- preserve authorization
- preserve validation
- preserve business rules
- preserve contracts
- make minimal changes

Do not rewrite backend architecture unnecessarily.

---

# RESPONSIVE

Every meaningful UI must consider:

- mobile
- tablet
- desktop

Do not treat mobile as an afterthought.

---

# ACCESSIBILITY

Check:

- semantic HTML
- keyboard
- focus
- contrast
- labels
- ARIA
- forms
- dialogs

---

# FINAL QA

Before finishing:

[ ] Laravel integration works
[ ] Inertia props correct
[ ] React typed
[ ] Tailwind consistent
[ ] Responsive checked
[ ] Accessibility checked
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Success state
[ ] React performance checked
[ ] Inertia payload checked
[ ] N+1 checked when relevant
[ ] Backend changes minimal
[ ] Visual polish completed
