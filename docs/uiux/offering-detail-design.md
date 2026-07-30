# Offering Detail / Prospectus Page - Design System Documentation

## Overview
The **Offering Detail** (Prospectus) page is the primary interface for investors to review comprehensive information about a specific revenue-share offering before making an investment decision. The page presents offering overview, key financial metrics, funding progress, and investment actions in a clear, accessible layout.

**Entry Point:** "View Prospectus" button on Investor Discovery cards  
**Route:** `/offering/:id`  
**Component:** `src/components/OfferingDetail.tsx`

---

## Design Principles

### 1. **Information Architecture (IA)**
The layout follows a **progressive disclosure** pattern:
- **Header:** Quick context (back button, offering name, prospectus label)
- **Main Content (2/3):** Detailed information organized vertically
- **Sidebar (1/3 on desktop, below on mobile):** Investment action and summary

This structure allows users to:
- Quickly understand what they're viewing
- Review detailed terms at their own pace
- Find the investment action without scrolling on desktop

### 2. **Visual Language**
All UI elements reuse the established Revora design tokens:
- **Glass cards** (`glass-card`): Primary container for grouped information
- **Button styles** (`btn-primary`, `btn-secondary`): Consistent interactive elements
- **Color palette:** Primary blue, accent cyan, error red, success green
- **Typography:** Inter font family, established heading/body sizes
- **Spacing:** Tailwind grid and spacing scale (gap-6, p-6, etc.)

### 3. **Accessibility (WCAG 2.1 AA)**

#### Keyboard Navigation
- ✅ All buttons and links are keyboard accessible
- ✅ Back button with `aria-label` for context
- ✅ Tab order follows logical content flow
- ✅ Focus states visible with 2px solid outline (handled by global CSS)

#### Screen Reader Support
- ✅ Semantic HTML (`<button>`, `<h1>`, `<h2>`, `<h3>`)
- ✅ `aria-label` on interactive elements for clarity
- ✅ Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- ✅ Risk level badge includes `aria-label`
- ✅ Investment summary section has descriptive text

#### Color & Contrast
- ✅ All text meets WCAG AA contrast ratios (70+ on dark backgrounds)
- ✅ Risk badges use color + text labels (not color-only)
- ✅ Information is never conveyed by color alone

#### Responsive Design
- ✅ Sidebar moves below content on mobile (`lg:col-span-1`)
- ✅ Grid layouts adapt: 2 cols → 1 col on small screens
- ✅ Touch-friendly button sizes (48px minimum height recommended)
- ✅ Text scales appropriately with viewport

---

## Layout Structure

### **Desktop (1024px+)**
```
┌─────────────────────────────┬──────────────────┐
│  Back | Title               │                  │
├─────────────────────────────┤  Investment      │
│  Offering Overview Card     │  Action Card     │
├─────────────────────────────┤  (sticky)        │
│  Metrics Grid (3 cols)      │                  │
├─────────────────────────────┤                  │
│  Funding Progress           │                  │
├─────────────────────────────┤                  │
│  Why Invest (Highlights)    │                  │
├─────────────────────────────┤                  │
│  Risk Disclosure            │                  │
└─────────────────────────────┴──────────────────┘
```

### **Mobile (<1024px)**
```
┌────────────────────────┐
│  Back | Title          │
├────────────────────────┤
│ Offering Overview Card │
├────────────────────────┤
│ Metrics Grid (2 cols)  │
├────────────────────────┤
│ Funding Progress       │
├────────────────────────┤
│ Why Invest             │
├────────────────────────┤
│ Risk Disclosure        │
├────────────────────────┤
│ Investment Action Card │
└────────────────────────┘
```

---

## Component Sections

### **1. Header Navigation**
**Purpose:** Context and navigation  
**Elements:**
- Back button (ArrowLeft icon, clickable, with `aria-label`)
- "Prospectus" label (small caps, muted text)
- Offering name (h1)

**Accessibility:**
- Button is keyboard accessible and has clear intent label
- Heading hierarchy is correct (h1 for page title)

---

### **2. Offering Header Card**
**Purpose:** Establish offering identity and context  
**Elements:**
- Offering icon (Rocket) in colored badge
- Company name (h2)
- Category
- Risk level badge (color + text, e.g., "Low Risk")
- Description paragraph

**Design Tokens:**
- Glass card with full padding and shadow
- Primary color for icon background (`bg-primary/10`)
- Risk badge colors: green (low), yellow (medium), red (high)

**Accessibility:**
- Risk badge includes `aria-label` describing risk level
- Icon is decorative (not essential to understanding)

---

### **3. Key Metrics Grid**
**Purpose:** Highlight critical investment information at a glance  
**Metrics Displayed:**
1. **Revenue Share %** - Annual return percentage
2. **Term Length (months)** - Investment period
3. **Minimum Investment** - Entry amount

**Design:**
- 3-column grid on desktop, 2 columns on tablet, 1 column on mobile
- Each metric is a glass card with icon + label + value
- Icons use accent color for visual hierarchy

**Accessibility:**
- Labels are in small caps, uppercase for distinction
- Icon + text redundancy (not icon-only)
- Large, readable font for values

---

### **4. Funding Progress Section**
**Purpose:** Show investor appetite and urgency  
**Elements:**
- Progress bar (visual + semantic)
- Percentage text
- Amount raised vs. remaining (breakdown)
- Target currency and amount

**Design:**
- Background bar: `bg-slate-800`
- Progress fill: gradient from primary to accent
- Smooth transition animation (500ms)

**Accessibility:**
- Progress bar uses HTML5 `role="progressbar"`
- Includes `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-label` provides full context to screen readers
- Numeric text in addition to visual bar

---

### **5. Why Invest Section**
**Purpose:** Build confidence with key highlights  
**Elements:**
- Section heading with CheckCircle icon
- Bulleted list of highlights
- Bullets use accent color dots

**Accessibility:**
- Semantic `<ul>` and `<li>` elements
- Heading (h3) clearly introduces section
- Text is left-aligned for readability

---

### **6. Risk Disclosure**
**Purpose:** Transparency and legal compliance  
**Elements:**
- Bold disclaimer header
- Risk acknowledgment text (smaller card styling)
- Border distinguishes from main content

**Design:**
- Glass card with darker background (`bg-slate-900/50`)
- Border color: slate-700
- Smaller padding for secondary information

---

### **7. Investment Action Card (Sticky Sidebar)**
**Purpose:** Central call-to-action, always accessible  
**Elements:**
- Heading ("Ready to Invest?")
- Subheading describing the opportunity
- Investment summary box (amount, return, lock-up)
- Primary "Invest Now" button
- Secondary "Back to Discovery" button
- Footnote about distribution

**Design:**
- Glass card, positioned sticky on desktop
- Summary box: darker background (`bg-slate-900/50`)
- Flex layout for button stacking
- Buttons are full-width for mobile, maintain spacing

**Accessibility:**
- `aria-label` on invest button provides full context
- Clear button hierarchy (primary vs. secondary)
- Descriptive footnote about automatic distributions

---

## Data Model

The component accepts offering data via URL parameter (`:id`) and can fetch from an API or use mock data:

```typescript
interface OfferingData {
  id: string;                           // Unique identifier
  name: string;                         // Company/offering name
  category: string;                     // Industry/type
  revenueShare: number;                 // Percentage (e.g., 15)
  targetAmount: number;                 // Funding target in USDC
  fundedAmount: number;                 // Amount already raised
  termLength: number;                   // Months
  description: string;                  // Full offering description
  highlights: string[];                 // 3-4 key selling points
  riskLevel: "low" | "medium" | "high"; // Risk classification
  minInvestment: number;                // Minimum investment amount
}
```

---

## Responsive Behavior

| Breakpoint | Grid | Sidebar | Font |
|-----------|------|---------|------|
| < 640px   | Stack (1 col) | Below | sm |
| 640–1023px | 2 cols metrics | Below | base |
| ≥ 1024px | 3 cols metrics | Sticky right | base |

### Key Changes:
- **sm → md:** Metrics become 2-column
- **md → lg:** Metrics become 3-column, sidebar moves to sticky right
- **Mobile:** Full-width buttons, simplified spacing

---

## State Management & Interactions

### **Navigation**
- **Back button:** Routes to `/investor/portal` via `useNavigate()`
- **View button:** Routes to `/offering/:id`

### **Investment Flow**
- **"Invest Now" button:** Currently sets `isInvesting` state (loading state)
- **TODO:** Route to investment confirmation modal or payment screen
- **TODO:** Connect to blockchain/wallet integration for USDC transaction

### **Animations**
- Page entrance: `animate-fade-in` (400ms ease-out)
- Progress bar fill: 500ms smooth transition
- Button states: Hover (`transform: translateY(-1px)`), disabled state

---

## Accessibility Compliance Checklist

- ✅ WCAG 2.1 Level AA compliant
- ✅ Semantic HTML structure (h1-h3, button, ul/li)
- ✅ Color not sole method of conveying information
- ✅ Keyboard navigation fully supported
- ✅ Focus states visible (2px outline)
- ✅ Screen reader support (aria-labels, roles, landmarks)
- ✅ Touch-friendly interactive targets (≥44px minimum)
- ✅ Responsive and mobile-friendly
- ✅ Sufficient color contrast (70+ on dark bg)
- ✅ Clear button labels and form intent

---

## Future Enhancements

1. **Investment Modal:** Implement full investment flow with amount input, wallet connection, transaction confirmation
2. **API Integration:** Replace mock data with real API calls (loading states, error handling)
3. **Notifications:** Toast or banner confirming successful investment
4. **Analytics:** Track which offerings are viewed most, investment funnels
5. **Comparisons:** Side-by-side comparison of multiple offerings
6. **Document Download:** PDF prospectus or detailed terms
7. **Comments/Q&A:** Investor discussion or FAQ section

---

## Component Usage

```typescript
import { OfferingDetail } from "./components/OfferingDetail";

// In App.tsx routes:
<Route path="/offering/:id" element={<OfferingDetail />} />
```

The component is **fully self-contained** and handles:
- URL parameter extraction
- Mock data fallback
- Navigation (back button)
- Responsive layout
- Accessibility features

---

## Design Tokens Used

| Token | Usage |
|-------|-------|
| `glass-card` | All container cards |
| `glass-card-interactive` | N/A (not used here) |
| `btn-primary` | "Invest Now" button |
| `btn-secondary` | "Back to Discovery" button |
| `text-accent` | Icon colors, highlight text |
| `text-muted` | Secondary labels, descriptions |
| `animate-fade-in` | Page entrance animation |

---

## Testing Recommendations

### Unit Tests
- Rendering with valid offering ID
- Rendering fallback data
- Navigation handlers (back, invest)

### Integration Tests
- Route parameter extraction
- Navigation between discovery and detail pages
- Button click handlers

### Accessibility Tests
- Keyboard navigation (Tab, Shift+Tab, Enter)
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Color contrast validation (axe DevTools)
- Focus management on page load

### Responsive Tests
- Mobile (375px), Tablet (768px), Desktop (1024px)
- Touch interactions on mobile
- Sticky sidebar behavior on desktop

---

## References

- **Revora Design System:** `src/index.css`
- **Similar Components:** `src/components/ConfirmationNextSteps.tsx` (documented pattern)
- **Routing:** `src/App.tsx`
- **Entry Point:** `src/components/InvestorDiscovery.tsx` ("View Prospectus" button)
