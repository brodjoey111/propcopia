# Design Guidelines: Futures Trade Copier Dashboard

## Design Approach

**Selected Framework:** Design System Approach inspired by Linear and modern fintech dashboards (Stripe, Robinhood)

**Core Principles:**
- Information density with breathing room
- Instant clarity of account status and trade activity
- Confidence-inspiring precision and reliability
- Scannable data hierarchies for quick decision-making

---

## Typography System

**Font Family:** Inter (via Google Fonts CDN)
- Primary: Inter (400, 500, 600, 700 weights)

**Type Scale:**
- Page Headers: text-3xl font-semibold (36px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-base font-medium (16px)
- Body Text: text-sm (14px)
- Data Labels: text-xs font-medium uppercase tracking-wide (12px)
- Numerical Data: text-base font-semibold tabular-nums (16px, monospaced numerals)
- Trade Log Entries: text-sm font-mono (14px monospace)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4 to gap-6
- Tight groupings: space-y-2 to space-y-3

**Page Structure:**
```
- Fixed sidebar navigation (w-64, left-aligned)
- Main content area (flex-1 with max-w-7xl container)
- Top navigation bar (h-16, sticky)
- Content padding: p-6 to p-8
```

**Grid Systems:**
- Dashboard Stats: 3-4 column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Account Cards: 2-3 column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column with max-w-2xl

---

## Component Library

### Navigation Components

**Sidebar Navigation:**
- Fixed left sidebar with application logo at top
- Navigation items: p-3, rounded-lg, flex items with icons (Heroicons)
- Icon size: h-5 w-5
- Section dividers with labels (text-xs uppercase tracking-wide)
- Account switcher dropdown at bottom

**Top Navigation Bar:**
- Account balance summary (right-aligned)
- Real-time connection status indicators
- User profile dropdown (far right)
- Quick action buttons (+ Add Account)

### Dashboard Components

**Stats Cards (KPI Display):**
- Border with subtle shadow
- Padding: p-6
- Label: text-xs uppercase tracking-wide
- Value: text-2xl font-bold tabular-nums
- Change indicator: text-sm with up/down icon
- Layout: Vertical stack with space-y-1

**Account Status Cards:**
- Card layout: p-4, rounded-lg, border
- Header: Account name + connection badge
- Body: Grid layout showing balance, open positions, P&L
- Footer: Action buttons (Configure, Disconnect)
- Connection badge: Inline pill with dot indicator

**Trade Log Table:**
- Full-width table with sticky header
- Columns: Timestamp | Master Account | Symbol | Action | Quantity | Price | Followers Executed | Status
- Row height: h-12
- Alternating row treatment for scannability
- Status badges: Inline pills (Success, Failed, Pending)
- Monospace font for numerical data
- Compact row spacing (py-2)

### Forms & Inputs

**Account Configuration Form:**
- Section grouping with clear visual breaks (space-y-8)
- Form fields: Full width labels above inputs
- Input height: h-10
- Label style: text-sm font-medium mb-2
- Helper text: text-xs below inputs
- Toggle switches for enable/disable features
- Number inputs with +/- steppers for position scaling

**Position Scaling Controls:**
- Slider with value display (0-200%)
- Preset buttons (25%, 50%, 100%, 200%)
- Live preview calculation showing actual position size
- Layout: Vertical stack within card (p-6)

### Data Display Components

**Real-Time Trade Feed:**
- Scrollable container (max-h-96 overflow-y-auto)
- Trade entries: p-3, border-b
- Timestamp: text-xs on left
- Trade details: Flex row with symbol, action, quantity
- Follower execution status: Grid of small badges
- Auto-scroll to newest entries

**Account Summary Panel:**
- Split layout: Account details (left) | Quick Stats (right)
- Master/Follower designation badge
- Connection status with last sync timestamp
- Quick metrics: 2-column grid within panel

**Status Indicators:**
- Connection: Dot (h-2 w-2 rounded-full) + text label
- Trade execution: Badge pills with icon + text
- Account health: Large circular progress indicator

### Modal & Overlays

**Add Account Modal:**
- Centered overlay (max-w-lg)
- Padding: p-6
- Tabbed interface (NinjaTrader | Tradovate)
- API credential inputs with show/hide toggles
- Test connection button before save
- Footer: Cancel + Save buttons (right-aligned)

**Configuration Drawer:**
- Slide-in from right (w-96)
- Full-height with scrollable content
- Close button (top-right)
- Content padding: p-6
- Sections separated with space-y-6

---

## Interaction Patterns

**Loading States:**
- Skeleton screens for tables and cards
- Inline spinners for button actions
- Subtle pulse animation on pending trades

**Empty States:**
- Centered content (max-w-md mx-auto)
- Icon illustration (h-16 w-16)
- Heading + descriptive text + CTA button
- Vertical stack with space-y-4

**Error States:**
- Inline alert banners (p-4 rounded-lg)
- Icon + message + optional retry action
- Dismissible close button

---

## Icon System

**Library:** Heroicons (via CDN)

**Icon Usage:**
- Navigation: outline style, h-5 w-5
- Buttons: outline/solid style, h-4 w-4
- Status indicators: solid style, h-3 w-3
- Large illustrations: outline style, h-16 w-16

---

## Responsive Behavior

**Breakpoints:**
- Mobile (< 768px): Stack all grids to single column, collapsible sidebar
- Tablet (768px - 1024px): 2-column layouts, permanent condensed sidebar
- Desktop (> 1024px): Full 3-4 column layouts, expanded sidebar

**Mobile Adaptations:**
- Bottom navigation bar replaces sidebar
- Cards stack vertically with full width
- Tables scroll horizontally in container
- Modals become full-screen overlays

---

## Special Considerations

**Real-Time Updates:**
- Subtle highlight flash on new trade entries (brief pulse)
- Live updating numerical values with smooth transitions
- WebSocket connection status always visible

**Data Precision:**
- Always use tabular-nums for financial data
- Consistent decimal places (2 for currency, 4 for prices)
- Clear thousand separators in large numbers

**Critical Actions:**
- Disconnect/Delete actions require confirmation modal
- Position scaling changes show preview before applying
- Emergency stop-all button (prominent, separate from other controls)