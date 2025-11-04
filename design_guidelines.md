# Design Guidelines: Futures Trade Copier Dashboard
## Robinhood-Inspired Design System

## Design Approach

**Visual Framework:** Robinhood 2024 Design System
- Minimalist "less is more" philosophy with sophisticated restraint
- High information density without visual clutter
- Precision-focused financial interface with bold accent usage
- Clean, modern aesthetic prioritizing readability and instant clarity

**Core Principles:**
- Extreme simplicity with purposeful hierarchy
- Confident use of whitespace for breathing room
- Strategic accent deployment for critical information
- Scannable data displays with excellent contrast

---

## Color Strategy

**Foundation:**
- Pure black (#000000) and pure white (#FFFFFF) base
- Robin Neon (#d5fd51) for primary accents, CTAs, and active states
- Mature neutral grays for hierarchy (8 shades from #171717 to #f5f5f5)

**Semantic Colors:**
- Positive/Gains: Vibrant green (#00c805)
- Negative/Losses: Orange-tinted red (#ff5000)
- Warning: Amber tones
- Connection/Status: Robin Neon for active, gray for inactive

**Application:**
- Backgrounds: Pure white primary, black for sidebar/nav
- Text: Black on white, white on black
- Data emphasis: Robin Neon sparingly for important metrics
- Cards: White with subtle gray borders (1px)

---

## Typography System

**Font Family:** Inter (Google Fonts CDN - 400, 500, 600, 700)

**Hierarchy:**
- Dashboard Title: text-2xl font-bold (24px)
- Section Headers: text-lg font-semibold (18px)
- Card Titles: text-sm font-semibold uppercase tracking-wider (14px)
- Body Text: text-base (16px)
- Data Labels: text-xs font-medium uppercase tracking-wide (12px)
- Large Metrics: text-4xl font-bold tabular-nums (36px)
- Numerical Data: text-lg font-semibold tabular-nums (18px)
- Trade Details: text-sm font-mono (14px monospace)

**Treatment:**
- High contrast text (black on white, white on black)
- Tabular numerals for all financial data
- Uppercase labels for hierarchy
- Letter-spacing on labels for sophistication

---

## Layout System

**Spacing Units:** Tailwind 2, 3, 4, 6, 8, 12, 16, 24
- Micro spacing: 2-3 (tight groupings)
- Standard padding: 4-6 (cards, components)
- Section gaps: 8-12 (vertical rhythm)
- Major breaks: 16-24 (page sections)

**Structure:**
```
- Black sidebar: w-64, fixed left, minimal icons + text
- White main content: flex-1, max-w-7xl centered
- Top bar: h-14, sticky, ultra-minimal
- Content padding: px-8 py-6
- Card spacing: gap-6 grid layouts
```

**Grid Philosophy:**
- Dashboard: 4-column stat grid (grid-cols-1 md:grid-cols-2 xl:grid-cols-4)
- Accounts: 3-column (grid-cols-1 md:grid-cols-2 xl:grid-cols-3)
- Forms: Single column, max-w-xl
- Tables: Full-width with responsive scroll

---

## Component Library

### Navigation

**Sidebar (Robinhood-Style):**
- Black background, full height, w-64
- Logo at top (p-6)
- Nav items: Minimal text + Heroicon (h-5 w-5), py-3 px-4
- Active state: Robin Neon accent bar (4px left border) + text treatment
- Account switcher: Bottom position, clean dropdown
- Zero decorative elements, pure function

**Top Bar:**
- Minimal height (h-14), white background
- Right-aligned: Real-time balance + connection dot + profile
- No search, no clutter - pure information
- Sticky positioning

### Dashboard Components

**Metric Cards (Robinhood Minimalism):**
- Pure white cards, 1px gray border, minimal shadow
- Padding: p-6
- Layout: Label (top) → Large value (center) → Change indicator (bottom)
- Label: text-xs uppercase tracking-wide
- Value: text-4xl font-bold tabular-nums
- Change: text-sm with arrow icon, semantic color
- Card height: Uniform across grid

**Account Status Cards:**
- White card, rounded-lg, border-1
- Header: Account name (font-semibold) + connection badge (inline)
- Body: 2-column grid for balance/positions/P&L
- Numerical emphasis: Larger font, tabular-nums
- Footer: Minimal button group (text-sm, Robin Neon accent)
- Padding: p-5

**Trade Activity Feed:**
- Borderless table with header row
- Columns: Time | Account | Symbol | Action | Size | Price | Status
- Header: text-xs uppercase, border-b-2 black
- Rows: py-3, border-b-1 gray, hover state
- Status badges: Minimal pills (small, rounded-full)
- Symbol: font-semibold for emphasis
- Monospace for prices/quantities
- Max height: max-h-[600px] with smooth scroll

### Forms & Controls

**Add Account / Configuration:**
- Clean single-column form, max-w-xl
- Labels above inputs: text-sm font-medium mb-1.5
- Input height: h-11, rounded-lg, border-1
- Focus states: Robin Neon border accent
- Helper text: text-xs below, gray
- Buttons: Full-width primary (Robin Neon bg) + ghost secondary
- Section spacing: space-y-6
- API credential inputs with minimal show/hide icon

**Position Scaling:**
- Horizontal slider with live value display
- Preset buttons: Pill-shaped, inline row, gap-2
- Live calculation preview: Card below with before/after comparison
- Slider thumb: Robin Neon accent
- Layout: Vertical stack, p-6 card

### Data Displays

**Real-Time Trade Stream:**
- Reverse chronological list, newest top
- Entry height: Variable based on content, py-3
- Timestamp: text-xs gray, monospace
- Trade details: Flex row, symbol bold, action/size normal
- Follower status: Inline badge row, gap-1
- Subtle dividers (border-b)
- Container: max-h-96, smooth scroll behavior

**Account Summary Panel:**
- Two-section layout: Details | Quick Stats
- Master/Follower: Small uppercase badge
- Connection: Dot indicator + "Last synced" timestamp
- Stats: 2-column grid, compact spacing
- Minimal borders, maximum clarity

**Status Indicators:**
- Connection: Small dot (h-2.5 w-2.5) + label, Robin Neon for active
- Trade status: Tiny badges, uppercase, tracking-wide
- Progress: Minimal circular or linear bars

### Modals & Overlays

**Add Account Modal:**
- Centered, max-w-md, white card with shadow
- Padding: p-6
- Header: text-lg font-semibold mb-6
- Form fields: Standard input treatment
- Tab switching (NinjaTrader/Tradovate): Minimal underline style
- Footer buttons: Right-aligned, gap-3
- Close: Top-right X icon (h-5 w-5)

**Settings Drawer:**
- Slide from right, w-80
- Full-height, white background
- Padding: p-6
- Scrollable content
- Close button prominent
- Section dividers: Minimal, space-y-8

---

## Icon System

**Library:** Heroicons outline (CDN)
**Sizes:**
- Navigation: h-5 w-5
- Buttons/inline: h-4 w-4
- Status dots: h-2.5 w-2.5
- Empty states: h-12 w-12

**Usage:**
- Minimal decoration, maximum function
- Consistent stroke width
- Strategic placement only
- No ornamental icons

---

## Interaction Patterns

**Loading States:**
- Skeleton screens: Pulsing gray rectangles matching content shape
- Button loaders: Minimal spinner, Robin Neon
- Inline status: Small animated dot

**Empty States:**
- Centered, max-w-sm
- Icon (h-12 w-12, gray)
- Heading: text-lg font-semibold
- Description: text-sm
- CTA button: Robin Neon accent
- Vertical stack, space-y-4

**Alerts/Errors:**
- Minimal banner, rounded-lg, p-4
- Icon + message + action (inline flex)
- Semantic colors for type
- Dismissible X button

---

## Responsive Design

**Mobile (< 768px):**
- Collapsible sidebar to bottom nav bar (5 icons)
- Single-column cards, full-width
- Tables: Horizontal scroll in container
- Reduced padding (px-4 py-4)
- Modals: Full-screen takeover

**Tablet (768px - 1024px):**
- Condensed sidebar (w-20, icon-only)
- 2-column grids
- Maintained spacing units

**Desktop (> 1024px):**
- Full sidebar (w-64)
- 3-4 column grids
- Maximum information density
- Optimal padding (px-8)

---

## Special Considerations

**Financial Data Precision:**
- Tabular-nums on ALL numerical displays
- Consistent decimals: 2 for USD, 4 for prices
- Thousand separators (commas)
- Negative values: Parentheses + semantic color

**Real-Time Features:**
- Subtle pulse on new trade entries (brief)
- Live value updates: Smooth number transitions
- Connection status: Always visible in top bar
- WebSocket indicator: Minimal dot animation

**Critical Actions:**
- Disconnect/Delete: Confirmation modal required
- Position changes: Live preview calculation
- Emergency controls: Distinct visual treatment, isolated placement

---

## Images

**No hero images** - This is a dashboard application focused on data and functionality. All visual interest comes from clean layout, strategic accent usage, and information hierarchy.

**Icons only:** Heroicons for navigation, status, and functional elements. No decorative photography or illustrations.