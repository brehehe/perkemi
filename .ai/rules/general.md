---
paths:
  - '**'
---

# General

## Concurrent event context
Events may be active concurrently, including overlapping dates. Activating one event must not deactivate another. Registration and tournament menus must preserve an explicit event_id and scope records by the event UUID; tenantEvent remains authoritative in tenant mode.
