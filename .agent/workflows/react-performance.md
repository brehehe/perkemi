# React + Inertia Performance Workflow

Inspect only when performance is relevant.

## React

Check:

- unnecessary re-renders
- expensive calculations
- unnecessary effects
- context
- large lists
- client state

## Inertia

Check:

- page payload
- shared props
- lazy/deferred data
- partial reloads
- pagination

## Laravel

Check:

- duplicate queries
- eager loading
- N+1
- pagination
- selected columns

Do not refactor unrelated code.
