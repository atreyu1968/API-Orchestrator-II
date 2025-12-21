# Design Guidelines: Autonomous Literary Agent Orchestration System

## Design Approach

**Selected Approach:** Design System - Fluent Design (Microsoft)
**Justification:** This is a productivity/development tool focused on monitoring complex agent workflows and displaying structured information (logs, manuscripts, world bible data). Fluent's emphasis on information hierarchy and data visualization aligns with the dashboard nature of this application.

**Key References:** VS Code, Linear (for status indicators), Notion (for document viewing)

---

## Core Design Elements

### A. Typography

**Font Families:**
- Primary: Inter (via Google Fonts) - UI elements, navigation, labels
- Code/Logs: JetBrains Mono - thought signatures, JSON displays, status outputs
- Manuscript: Merriweather - rendered chapter text for readability

**Hierarchy:**
- Page Titles: text-3xl font-bold
- Section Headers: text-xl font-semibold  
- Agent Names: text-lg font-medium
- Body Text: text-base
- Status Labels: text-sm font-medium uppercase tracking-wide
- Timestamps/Metadata: text-xs

---

### B. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section spacing: mb-8, mb-12
- Card gaps: gap-4, gap-6
- Container margins: mx-4, mx-8

**Grid System:**
- Main dashboard: 2-column layout (sidebar + main content)
- Agent status cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Chapter list: single column with max-w-4xl
- Log viewer: full-width with max-w-6xl

---

### C. Component Library

**Dashboard Layout:**
- Fixed sidebar (w-64) with navigation: Agents, Manuscripts, Logs, Config
- Main content area with breadcrumb navigation
- Real-time status bar showing current pipeline stage

**Agent Status Cards:**
- Card per agent showing current state (Idle/Thinking/Writing/Editing)
- Progress indicator for current task
- Last activity timestamp
- Thinking depth meter (visual representation of reasoning intensity)

**Process Flow Visualization:**
- Horizontal stepper showing: Architect → Ghostwriter → Editor → Copy Editor
- Active stage highlighted with pulsing indicator
- Completed stages with checkmark
- Pipeline stage details on hover

**Chapter Viewer:**
- List view: Chapter number, title, word count, status badge
- Detail view: Rendered Markdown with typography optimized for reading
- Side panel: Chapter metadata, related world bible entries

**Thought Signature Viewer:**
- Expandable accordion for each reasoning session
- JSON syntax highlighting for structured data
- Timeline view showing reasoning progression
- Filterable by agent type

**World Bible Display:**
- Tabbed interface: Timeline, Characters, World Rules
- Character cards with psychological profiles
- Interactive timeline with event markers
- Search and filter functionality

**Configuration Panel:**
- Form layout with clear sections: Story Settings, Agent Parameters
- Dropdowns for genre/tone with preview descriptions
- Number input with + - controls for chapter count
- Save/Reset buttons with confirmation

**Console Output Component (Web Replica):**
- Terminal-style interface with monospace font
- Status prefixes: [PENSANDO], [ESCRIBIENDO], [EDITANDO], [ERROR]
- Auto-scroll to latest output
- Color-coded by message type
- Timestamp for each entry

**Navigation:**
- Sidebar navigation with icons (Heroicons)
- Active state indicated with accent treatment
- Collapsible on mobile

---

### D. Animations

**Minimal, Purposeful Motion:**
- Thinking indicator: Subtle pulsing glow (animate-pulse with reduced opacity)
- Status transitions: Smooth fade (transition-opacity duration-300)
- Accordion expand: height transition (transition-all duration-200)
- NO scroll animations, parallax, or decorative motion

---

## Application-Specific Guidelines

**CLI Console Styling (if web-replicated):**
- Monospace font for authenticity
- Line height: leading-relaxed
- Padding: p-4
- Maximum height with scroll: max-h-96 overflow-y-auto

**Manuscript Rendering:**
- Typography optimized for reading: prose lg:prose-xl
- Line height: leading-7
- Maximum width: max-w-prose mx-auto
- Chapter titles: centered, text-2xl mb-8

**Status Indicators:**
- Idle: Subtle neutral treatment
- Active/Thinking: Emphasized with visual indicator
- Error: Clear error state without alarm colors
- Success: Confirmation state

**Data Density:**
- Logs: Compact view with expand for details
- Agent cards: Key metrics visible at glance
- Chapter list: Table format with sortable columns

---

## Images

**No hero images required** - This is a productivity tool, not a marketing site.

**Optional Icon Usage:**
- Agent avatars: Simple geometric shapes or abstract icons representing each agent's role
- Status icons: Minimal Heroicons for states (CheckCircle, Clock, Pencil, etc.)
- Empty states: Simple illustrations for "No manuscripts yet" messages

---

## Responsive Strategy

**Desktop-first approach:**
- Primary use case is development/writing workstation
- Sidebar visible on lg+ screens
- Mobile: Hamburger menu, stacked layout, simplified views