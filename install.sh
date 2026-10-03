#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# ANTIGRAVITY PREMIUM FRONTEND STACK
# Laravel + React + Inertia + Tailwind CSS
#
# Purpose:
#   Install and configure design/frontend skills for
#   Google Antigravity.
#
# Production Stack:
#   Laravel
#   Inertia.js
#   React
#   TypeScript
#   Vite
#   Tailwind CSS
#
# Design Stack:
#   UI/UX Pro Max
#   Impeccable
#   Framer Agent (optional)
#   Frontend Design
#   Web Design Guidelines
#   Theme Factory
#   Tailwind Patterns
#   Mobile Design
#   Accessibility
#   SEO
#   React Best Practices
#   React Patterns
#   Canvas Design
#   Web Artifacts Builder
#
# IMPORTANT:
#   This installer configures Antigravity skills, workflows,
#   project rules and frontend orchestration.
#
#   It does NOT automatically rewrite application code.
#
#   Backend changes are allowed only when required by the
#   requested feature or explicitly requested.
# ============================================================


# ------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------

PROJECT_ROOT="$(pwd)"

AGENT_DIR="$PROJECT_ROOT/.agent"
SKILLS_DIR="$AGENT_DIR/skills"
WORKFLOWS_DIR="$AGENT_DIR/workflows"

SHARED_DIR="$PROJECT_ROOT/.shared"

BACKUP_DIR="$PROJECT_ROOT/.antigravity-backup-$(date +%Y%m%d-%H%M%S)"
INSTALL_LOG="$PROJECT_ROOT/.antigravity-install.log"

CACHE_DIR="/tmp/antigravity-skills-cache"


# ------------------------------------------------------------
# OUTPUT HELPERS
# ------------------------------------------------------------

info() {
    echo "[INFO] $1"
}

success() {
    echo "[ OK ] $1"
}

warning() {
    echo "[WARN] $1"
}

error() {
    echo "[ERROR] $1"
}

section() {
    echo ""
    echo "============================================================"
    echo " $1"
    echo "============================================================"
    echo ""
}


# ------------------------------------------------------------
# ERROR HANDLER
# ------------------------------------------------------------

trap 'error "Installation stopped at line $LINENO."' ERR


# ------------------------------------------------------------
# COMMAND CHECK
# ------------------------------------------------------------

command_exists() {
    command -v "$1" >/dev/null 2>&1
}


# ------------------------------------------------------------
# LOG
# ------------------------------------------------------------

touch "$INSTALL_LOG"
exec > >(tee -a "$INSTALL_LOG") 2>&1


# ============================================================
# HEADER
# ============================================================

clear || true

section "ANTIGRAVITY PREMIUM FRONTEND STACK"

echo "Project:"
echo "  $PROJECT_ROOT"
echo ""

echo "Production Stack:"
echo "  Laravel"
echo "  Inertia.js"
echo "  React"
echo "  TypeScript"
echo "  Vite"
echo "  Tailwind CSS"
echo ""

echo "Design / Engineering Skills:"
echo "  UI/UX Pro Max"
echo "  Frontend Design"
echo "  Impeccable"
echo "  Framer Agent (optional)"
echo "  Web Design Guidelines"
echo "  Theme Factory"
echo "  Tailwind Patterns"
echo "  Mobile Design"
echo "  Accessibility"
echo "  SEO"
echo "  React Best Practices"
echo "  React Patterns"
echo "  Web Artifacts Builder"
echo "  Canvas Design"
echo ""


# ============================================================
# PROJECT DETECTION
# ============================================================

section "PROJECT DETECTION"

if [ -f "$PROJECT_ROOT/artisan" ]; then
    success "Laravel project detected"
else
    warning "artisan tidak ditemukan."
    warning "Installer tetap dapat membuat konfigurasi Antigravity."
fi

if [ -f "$PROJECT_ROOT/composer.json" ]; then
    success "composer.json detected"
fi

if [ -f "$PROJECT_ROOT/package.json" ]; then
    success "package.json detected"
else
    warning "package.json tidak ditemukan."
fi

if [ -d "$PROJECT_ROOT/resources/js" ]; then
    success "resources/js detected"
else
    warning "resources/js tidak ditemukan."
fi

if [ -d "$PROJECT_ROOT/resources/js/Pages" ]; then
    success "Inertia-style Pages directory detected"
fi


# ============================================================
# NODE.JS
# ============================================================

section "NODE.JS"

if ! command_exists node; then
    error "Node.js belum terinstall."
    exit 1
fi

success "Node.js $(node -v)"


# ============================================================
# NPM
# ============================================================

if ! command_exists npm; then
    error "npm tidak tersedia."
    exit 1
fi

success "npm $(npm -v)"


# ============================================================
# GIT
# ============================================================

section "GIT"

if ! command_exists git; then
    error "Git belum terinstall."
    exit 1
fi

success "$(git --version)"


# ============================================================
# PYTHON
# ============================================================

section "PYTHON"

if command_exists python3; then
    success "$(python3 --version)"
else
    warning "Python 3 tidak ditemukan."
    warning "Beberapa tooling UI/UX Pro Max mungkin membutuhkan Python."
fi


# ============================================================
# BACKUP EXISTING CONFIGURATION
# ============================================================

section "BACKUP"

BACKUP_NEEDED=false

if [ -d "$AGENT_DIR" ] || [ -d "$SHARED_DIR" ]; then
    BACKUP_NEEDED=true
fi

if [ "$BACKUP_NEEDED" = true ]; then

    mkdir -p "$BACKUP_DIR"

    if [ -d "$AGENT_DIR" ]; then
        cp -R "$AGENT_DIR" "$BACKUP_DIR/"
    fi

    if [ -d "$SHARED_DIR" ]; then
        cp -R "$SHARED_DIR" "$BACKUP_DIR/"
    fi

    success "Backup created:"
    echo "  $BACKUP_DIR"

else
    success "No existing Antigravity configuration found."
fi


# ============================================================
# DIRECTORIES
# ============================================================

section "ANTIGRAVITY DIRECTORIES"

mkdir -p "$AGENT_DIR"
mkdir -p "$SKILLS_DIR"
mkdir -p "$WORKFLOWS_DIR"
mkdir -p "$SHARED_DIR"
mkdir -p "$CACHE_DIR"

success ".agent created"
success ".agent/skills created"
success ".agent/workflows created"
success ".shared created"


# ============================================================
# UI/UX PRO MAX
# ============================================================

section "UI/UX PRO MAX"

info "Installing UI/UX Pro Max CLI..."

if npm install -g ui-ux-pro-max-cli; then
    success "UI/UX Pro Max CLI installed"
else
    warning "UI/UX Pro Max CLI installation failed."
fi

if command_exists uipro; then

    info "Initializing UI/UX Pro Max for Antigravity..."

    if uipro init --ai antigravity; then
        success "UI/UX Pro Max configured for Antigravity"
    else
        warning "UI/UX Pro Max initialization failed."
    fi

else
    warning "uipro command not available."
fi


# ============================================================
# IMPECCABLE
# ============================================================

section "IMPECCABLE"

info "Installing official Impeccable skills..."

if npx -y impeccable install --providers=antigravity; then
    success "Impeccable installed"
else
    warning "Impeccable automatic installation failed."
    warning "Continuing..."
fi


# ============================================================
# FRAMER
# ============================================================

section "FRAMER DESIGN OPTION"

echo "Framer hanya digunakan sebagai OPTIONAL DESIGN EXPLORATION."
echo ""
echo "Gunakan Framer untuk:"
echo "  - visual exploration"
echo "  - new page concepts"
echo "  - major redesign"
echo "  - responsive exploration"
echo "  - component exploration"
echo "  - interaction exploration"
echo ""
echo "JANGAN gunakan Framer sebagai production framework."
echo ""
echo "Production tetap:"
echo "  Laravel + Inertia + React + Tailwind"
echo ""

info "Installing official Framer Agent bridge..."

if npx -y @framer/agent setup; then
    success "Framer Agent configured"
else
    warning "Framer Agent setup failed."
    warning "Retry manually with: npx @framer/agent setup"
fi


# ============================================================
# GENERIC SKILL INSTALLER
# ============================================================

section "ANTIGRAVITY DESIGN SKILLS"

install_skill() {

    local repo="$1"
    local skill="$2"

    echo ""
    info "Installing $skill"
    echo "Repository: $repo"

    if [ -d "$SKILLS_DIR/$skill" ]; then
        success "$skill already installed"
        return 0
    fi

    local repo_name="${repo//\//_}"
    local repo_dir="$CACHE_DIR/$repo_name"

    if [ ! -d "$repo_dir" ]; then

        info "Cloning repository..."

        if ! git clone --depth 1 \
            "https://github.com/$repo.git" \
            "$repo_dir" 2>/dev/null; then

            warning "Could not clone $repo"

        fi
    fi

    local found_dir=""

    if [ -d "$repo_dir/$skill" ]; then
        found_dir="$repo_dir/$skill"

    elif [ -d "$repo_dir/skills/$skill" ]; then
        found_dir="$repo_dir/skills/$skill"

    elif [ -d "$repo_dir/.agents/skills/$skill" ]; then
        found_dir="$repo_dir/.agents/skills/$skill"

    elif [ -d "$repo_dir/.agent/skills/$skill" ]; then
        found_dir="$repo_dir/.agent/skills/$skill"

    else
        found_dir="$(
            find "$repo_dir" \
                -type d \
                -name "$skill" \
                2>/dev/null \
                | head -n 1 || true
        )"
    fi

    if [ -n "$found_dir" ] && [ -d "$found_dir" ]; then

        mkdir -p "$SKILLS_DIR/$skill"

        cp -R \
            "$found_dir/." \
            "$SKILLS_DIR/$skill/"

        success "$skill installed"

        return 0
    fi

    info "Trying skills CLI..."

    if npx -y skills add \
        "$repo" \
        --skill "$skill" \
        --agent antigravity \
        -y 2>/dev/null; then

        success "$skill installed via skills CLI"

    else
        warning "$skill could not be installed automatically."
        warning "Continuing..."
    fi
}


# ============================================================
# DESIGN SKILLS
# ============================================================

install_skill "S3ctr4l/antigravity" "frontend-design"

install_skill "antfu/skills" "web-design-guidelines"

install_skill "alexolivan/antigravity-skills" "theme-factory"

install_skill "guanyang/antigravity-skills" "tailwind-patterns"

install_skill "guanyang/antigravity-skills" "mobile-design"

install_skill \
    "guanyang/antigravity-skills" \
    "accessibility-compliance-accessibility-audit"

install_skill "guanyang/antigravity-skills" "seo-audit"

install_skill "guanyang/antigravity-skills" "web-artifacts-builder"

install_skill "guanyang/antigravity-skills" "canvas-design"


# ============================================================
# REACT SKILLS
# ============================================================

section "REACT ENGINEERING SKILLS"

install_skill \
    "vercel-labs/agent-skills" \
    "react-best-practices"

install_skill \
    "vercel-labs/agent-skills" \
    "react-patterns"


# ============================================================
# PREMIUM REACT + INERTIA SKILL
# ============================================================

section "PREMIUM REACT + INERTIA"

PREMIUM_DIR="$SKILLS_DIR/premium-react-inertia"

mkdir -p "$PREMIUM_DIR"

cat > "$PREMIUM_DIR/SKILL.md" <<'EOF'
---
name: premium-react-inertia
description: >
  Premium frontend orchestration for Laravel + Inertia.js +
  React + TypeScript + Tailwind CSS. Covers UX, design system,
  responsive design, accessibility, React architecture,
  Inertia performance and Laravel query/N+1 awareness.
---

# Premium React + Inertia

You are a senior product designer,
React engineer and Laravel/Inertia engineer.

Create interfaces that are:

- premium
- clean
- modern
- responsive
- accessible
- performant
- maintainable
- production-ready

Avoid generic AI-generated UI.

---

# PRODUCTION STACK

The default production stack is:

- Laravel
- Inertia.js
- React
- TypeScript
- Vite
- Tailwind CSS

Do not replace this stack unless explicitly requested.

---

# RESPONSIBILITIES

## Laravel

Responsible for:

- routes
- controllers
- requests
- validation
- authorization
- authentication
- business logic
- Eloquent
- database
- server-side data

## Inertia

Responsible for:

- Laravel/React bridge
- page props
- navigation
- form submissions
- partial reloads
- lazy/deferred data where appropriate

## React

Responsible for:

- pages
- components
- UI
- interaction
- client-side state where appropriate

## TypeScript

Responsible for:

- typed props
- page data
- forms
- reusable components
- domain types

## Tailwind

Responsible for:

- layout
- responsive design
- spacing
- typography
- colors
- states
- visual system

---

# PROJECT DISCOVERY

Before changing code inspect:

- composer.json
- package.json
- routes
- controllers
- requests
- models
- policies
- resources/js
- Pages
- Components
- Layouts
- Hooks
- Types
- Tailwind configuration
- Vite configuration
- existing design tokens

Do not assume the architecture.

Preserve established conventions.

---

# INERTIA ARCHITECTURE

Prefer:

Laravel Route
↓
Controller
↓
Inertia::render()
↓
React Page
↓
Reusable Components

Avoid introducing unnecessary REST/API layers
when the feature can be handled cleanly through Inertia.

---

# REACT ARCHITECTURE

Prefer:

resources/js/
├── Components/
├── Layouts/
├── Pages/
├── Hooks/
├── Lib/
├── Types/
└── Utils/

Follow the actual project structure when different.

Do not reorganize the entire application unnecessarily.

---

# TYPESCRIPT

Prefer TypeScript everywhere in React code.

Use:

- interfaces
- type aliases
- typed props
- typed page props
- typed forms
- typed callbacks

Avoid unnecessary `any`.

Do not silence TypeScript errors without understanding the cause.

---

# DESIGN SYSTEM

Before meaningful UI implementation define or reuse:

- colors
- typography
- spacing
- radius
- borders
- shadows
- buttons
- inputs
- cards
- tables
- dialogs
- dropdowns
- navigation
- badges
- alerts
- empty states
- loading states
- error states

Reuse existing tokens before introducing new ones.

---

# UI QUALITY

Avoid:

- generic SaaS templates
- excessive gradients
- excessive glassmorphism
- random colors
- excessive cards
- excessive rounded corners
- excessive shadows
- inconsistent spacing
- inconsistent typography
- unnecessary animation

The result must feel intentionally designed.

---

# FRAMER OPTION

Framer is an OPTIONAL design exploration layer.

Use Framer for:

- new page concepts
- major redesign
- landing page exploration
- visual exploration
- responsive exploration
- component exploration
- interaction exploration

Framer is NOT the production framework.

Production implementation remains:

Laravel + Inertia + React + Tailwind.

Do NOT use Framer for:

- small CSS fixes
- database changes
- controller refactoring
- migration changes
- authorization
- authentication
- business logic
- N+1 fixes
- query optimization

---

# REQUEST CLASSIFICATION

## NEW FEATURE

DISCOVER
→ UX
→ DESIGN
→ LARAVEL DATA
→ INERTIA
→ REACT
→ TYPESCRIPT
→ TAILWIND
→ RESPONSIVE
→ ACCESSIBILITY
→ PERFORMANCE
→ N+1
→ POLISH
→ QA

---

## NEW PAGE

UX
→ VISUAL DIRECTION
→ OPTIONAL FRAMER
→ DESIGN SYSTEM
→ INERTIA PAGE
→ REACT
→ TYPESCRIPT
→ TAILWIND
→ RESPONSIVE
→ ACCESSIBILITY
→ POLISH

---

## SMALL UI CHANGE

INSPECT
→ MODIFY
→ RESPONSIVE CHECK
→ ACCESSIBILITY CHECK
→ DONE

Do not run the entire pipeline unnecessarily.

---

## REDESIGN

CURRENT UI AUDIT
→ UX REVIEW
→ DESIGN DIRECTION
→ OPTIONAL FRAMER
→ IMPLEMENT
→ RESPONSIVE
→ ACCESSIBILITY
→ PERFORMANCE
→ POLISH

---

## AUDIT

Audit before modifying.

Check:

1. UX
2. UI
3. Responsive
4. Accessibility
5. SEO
6. React architecture
7. Inertia architecture
8. Performance
9. Laravel queries
10. N+1

Classify findings:

- Critical
- High
- Medium
- Low

---

# REACT PERFORMANCE

Check when relevant:

- unnecessary re-renders
- unstable props
- unnecessary effects
- expensive calculations
- large lists
- unnecessary context
- component complexity
- excessive client-side state
- unnecessary memoization

Do not add `memo`, `useMemo` or `useCallback`
without a reason.

---

# INERTIA PERFORMANCE

Check:

- page prop size
- unnecessary shared props
- repeated data
- lazy/deferred props
- partial reloads
- pagination
- unnecessary server data

Avoid sending unnecessary data to React.

---

# N+1 / DATABASE PERFORMANCE

When a page loads relational data, inspect for:

- N+1 queries
- lazy-loaded relationships
- repeated queries
- unnecessary relationships
- oversized datasets
- missing pagination

Prefer:

- eager loading
- constrained eager loading
- selective columns
- pagination
- appropriate query composition

Only change Laravel query code when relevant.

Do not refactor unrelated backend code.

---

# RESPONSIVE

Every meaningful UI must work across:

- mobile
- tablet
- laptop
- desktop
- large desktop

Do not simply shrink desktop layouts.

For mobile:

- simplify
- prioritize
- collapse secondary information
- maintain touch-friendly controls

---

# ACCESSIBILITY

Check:

- semantic HTML
- keyboard navigation
- focus states
- contrast
- labels
- ARIA
- form errors
- button semantics
- dialog semantics
- reduced motion

---

# SEO

For public-facing pages consider:

- title
- meta description
- canonical
- headings
- semantic HTML
- Open Graph
- structured content

Do not add unnecessary SEO logic to authenticated dashboards.

---

# BACKEND CHANGE POLICY

Frontend work may modify Laravel when the requested
feature actually requires backend behavior.

Before changing backend:

1. Inspect existing implementation.
2. Preserve authorization.
3. Preserve validation.
4. Preserve business rules.
5. Preserve existing contracts.
6. Make the smallest necessary change.

Do not modify backend merely to improve frontend code organization.

---

# FINAL QA

Before finishing:

[ ] Laravel integration works
[ ] Inertia props are correct
[ ] React components are typed
[ ] No unnecessary any
[ ] Tailwind implementation is consistent
[ ] Responsive behavior checked
[ ] Accessibility checked
[ ] Loading state checked
[ ] Empty state checked
[ ] Error state checked
[ ] Success state checked
[ ] React performance reviewed
[ ] Inertia payload reviewed
[ ] N+1 reviewed when relevant
[ ] No unnecessary backend changes
[ ] Visual polish completed
EOF

success "Premium React + Inertia skill created"


# ============================================================
# LARAVEL + INERTIA WORKFLOW
# ============================================================

section "LARAVEL + INERTIA WORKFLOW"

cat > "$WORKFLOWS_DIR/laravel-inertia.md" <<'EOF'
# Laravel + Inertia Workflow

## Architecture

Laravel
↓
Route
↓
Controller
↓
Inertia
↓
React Page
↓
React Components

---

## Discovery

Inspect:

- routes
- controllers
- requests
- policies
- models
- resources/js
- Pages
- Components
- Layouts
- Hooks
- Types
- Tailwind
- Vite

Use existing conventions.

---

## Backend

Change backend only when required.

Preserve:

- validation
- authorization
- authentication
- business logic
- existing contracts

---

## Inertia

Check:

- props
- shared props
- lazy/deferred data
- partial reloads
- pagination
- payload size

Avoid oversized page props.

---

## React

Use:

- TypeScript
- reusable components
- typed props
- clear state management
EOF


# ============================================================
# REACT FEATURE WORKFLOW
# ============================================================

cat > "$WORKFLOWS_DIR/react-feature.md" <<'EOF'
# React Feature Workflow

DISCOVER
↓
CLASSIFY
↓
UX
↓
DESIGN
↓
LARAVEL
↓
INERTIA
↓
REACT
↓
TYPESCRIPT
↓
TAILWIND
↓
RESPONSIVE
↓
ACCESSIBILITY
↓
PERFORMANCE
↓
N+1
↓
POLISH
↓
QA

---

## Laravel

Only change when required.

---

## Inertia

Validate:

- page props
- form behavior
- navigation
- payload
- partial reloads

---

## React

Create:

- reusable components
- typed props
- predictable state

---

## QA

Test:

- loading
- empty
- error
- success
- mobile
- desktop
- keyboard
EOF


# ============================================================
# REACT UI WORKFLOW
# ============================================================

cat > "$WORKFLOWS_DIR/react-ui.md" <<'EOF'
# React UI Workflow

## New UI

Use:

- UI/UX Pro Max
- Frontend Design
- Theme Factory
- Tailwind Patterns

Optional:

- Framer

Then implement with:

- React
- TypeScript
- Tailwind

---

## Existing UI

Inspect before modifying.

Preserve:

- functionality
- state
- accessibility
- existing components
- established design tokens

---

## Final

Check:

- hierarchy
- typography
- spacing
- responsive
- accessibility
- hover
- focus
- loading
- empty
- error
- success
EOF


# ============================================================
# REACT AUDIT WORKFLOW
# ============================================================

cat > "$WORKFLOWS_DIR/react-audit.md" <<'EOF'
# React Audit Workflow

Audit first.

## UI

- hierarchy
- typography
- spacing
- consistency

## UX

- navigation
- actions
- forms
- states

## React

- component architecture
- props
- state
- effects
- re-renders
- unnecessary complexity

## Inertia

- props
- payload
- shared data
- partial reloads
- lazy/deferred data

## Laravel

- queries
- relationships
- N+1
- pagination

## Accessibility

- keyboard
- focus
- contrast
- semantics

Return findings:

Critical
High
Medium
Low
EOF


# ============================================================
# PERFORMANCE WORKFLOW
# ============================================================

cat > "$WORKFLOWS_DIR/react-performance.md" <<'EOF'
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
EOF


# ============================================================
# DESIGN TO CODE WORKFLOW
# ============================================================

cat > "$WORKFLOWS_DIR/design-to-code.md" <<'EOF'
# Design to Code Workflow

## DESIGN

USER REQUEST
↓
UX STRATEGY
↓
VISUAL DIRECTION
↓
OPTIONAL FRAMER
↓
DESIGN SYSTEM

---

## PRODUCTION

DESIGN
↓
LARAVEL DATA
↓
INERTIA
↓
REACT
↓
TYPESCRIPT
↓
TAILWIND
↓
RESPONSIVE
↓
ACCESSIBILITY
↓
PERFORMANCE
↓
POLISH
↓
QA

---

## IMPORTANT

Framer is design exploration.

It is NOT the production framework.

Production remains:

Laravel
+
Inertia
+
React
+
TypeScript
+
Tailwind
EOF


success "Workflows created"


# ============================================================
# AGENTS.MD
# ============================================================

section "AGENTS.MD"

cat > "$AGENT_DIR/AGENTS.md" <<'EOF'
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
EOF

success "AGENTS.md created"


# ============================================================
# DESIGN MANIFEST
# ============================================================

section "DESIGN MANIFEST"

cat > "$AGENT_DIR/DESIGN-STACK.md" <<'EOF'
# Antigravity Premium Frontend Stack

## Production

Laravel
Inertia.js
React
TypeScript
Vite
Tailwind CSS

---

## Design Intelligence

UI/UX Pro Max
Frontend Design
Impeccable

---

## Optional Design Exploration

Framer Agent

---

## Design System

Theme Factory
Tailwind Patterns

---

## Responsive

Mobile Design

---

## Quality

Web Design Guidelines
Accessibility
SEO

---

## React Engineering

React Best Practices
React Patterns

---

## Creative / Prototyping

Web Artifacts Builder
Canvas Design

---

# MASTER PIPELINE

REQUEST
↓
CLASSIFY
↓
PROJECT DISCOVERY
↓
UX STRATEGY
↓
DESIGN DIRECTION
↓
OPTIONAL FRAMER
↓
DESIGN SYSTEM
↓
LARAVEL DATA
↓
INERTIA
↓
REACT
↓
TYPESCRIPT
↓
TAILWIND
↓
RESPONSIVE
↓
ACCESSIBILITY
↓
PERFORMANCE
↓
N+1
↓
IMPECCABLE POLISH
↓
FINAL QA

---

# FRAMER

Optional.

Design exploration only.

Not production.

---

# PRODUCTION

Laravel
+
Inertia
+
React
+
TypeScript
+
Tailwind
EOF


# ============================================================
# SHARED RULES
# ============================================================

section "SHARED RULES"

cat > "$SHARED_DIR/FRONTEND-RULES.md" <<'EOF'
# Shared Frontend Rules

## Production

Laravel + Inertia + React + TypeScript + Tailwind.

## Design

Use design skills according to task complexity.

## Framer

Optional design exploration only.

## React

Use reusable typed components.

## Inertia

Avoid unnecessary API layers.

## Tailwind

Use consistent design tokens and responsive utilities.

## Backend

Make minimal changes only when required.

## Performance

Review React rendering, Inertia payload and Laravel queries when relevant.

## N+1

Check relational data paths when relevant.

## Responsive

Mobile, tablet and desktop.

## Accessibility

Keyboard, focus, contrast and semantics.

## Final

Polish before completion.
EOF

success "Shared frontend rules created"


# ============================================================
# VALIDATION
# ============================================================

section "VALIDATION"

echo ""

if [ -f "$AGENT_DIR/AGENTS.md" ]; then
    success "AGENTS.md"
fi

if [ -f "$AGENT_DIR/DESIGN-STACK.md" ]; then
    success "DESIGN-STACK.md"
fi

if [ -f "$PREMIUM_DIR/SKILL.md" ]; then
    success "premium-react-inertia"
fi

echo ""

if [ -d "$SKILLS_DIR" ]; then
    echo "Installed skill directories:"
    find "$SKILLS_DIR" \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        -print \
        | sort
fi


# ============================================================
# FINAL SUMMARY
# ============================================================

section "INSTALLATION COMPLETE"

echo ""
echo "Production Stack:"
echo ""
echo "  ✓ Laravel"
echo "  ✓ Inertia.js"
echo "  ✓ React"
echo "  ✓ TypeScript"
echo "  ✓ Vite"
echo "  ✓ Tailwind CSS"
echo ""

echo "Design Stack:"
echo ""
echo "  ✓ UI/UX Pro Max"
echo "  ✓ Frontend Design"
echo "  ✓ Impeccable"
echo "  ✓ Framer Agent"
echo "  ✓ Web Design Guidelines"
echo "  ✓ Theme Factory"
echo "  ✓ Tailwind Patterns"
echo "  ✓ Mobile Design"
echo "  ✓ Accessibility"
echo "  ✓ SEO"
echo "  ✓ React Best Practices"
echo "  ✓ React Patterns"
echo "  ✓ Web Artifacts Builder"
echo "  ✓ Canvas Design"
echo ""

echo "Custom Antigravity:"
echo ""
echo "  ✓ premium-react-inertia"
echo "  ✓ Laravel + Inertia workflow"
echo "  ✓ React feature workflow"
echo "  ✓ React UI workflow"
echo "  ✓ React audit workflow"
echo "  ✓ React performance workflow"
echo "  ✓ Design-to-code workflow"
echo "  ✓ Frontend rules"
echo ""

echo "Created:"
echo ""
echo "  .agent/"
echo "  ├── AGENTS.md"
echo "  ├── DESIGN-STACK.md"
echo "  ├── skills/"
echo "  └── workflows/"
echo ""
echo "  .shared/"
echo ""

echo "IMPORTANT:"
echo ""
echo "  Restart Google Antigravity after installation."
echo ""

echo "Log:"
echo ""
echo "  $INSTALL_LOG"
echo ""

if [ "$BACKUP_NEEDED" = true ]; then
    echo "Backup:"
    echo ""
    echo "  $BACKUP_DIR"
    echo ""
fi

echo "============================================================"
echo " LARAVEL + INERTIA + REACT + TAILWIND READY"
echo "============================================================"
echo ""
