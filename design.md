# Shobhadamodar Petroleum - UI/UX Design System Specification

### 1. Core Design Philosophy
*   **Field-Ready Clarity:** High contrast and large typography designed specifically for outdoor, daylight visibility.
*   **Tactile Speed:** Oversized touch targets (minimum 48px height) for critical actions to prevent mis-taps by busy pump attendants.
*   **Bilingual Harmony:** Equal visual weight and perfect rendering for English, Hindi, and Marathi scripts.
*   **Trust & Precision:** A premium, banking-level aesthetic that reassures users of accurate financial calculations.

---

### 2. Typography System
To achieve the clean, modern look while properly supporting Devanagari scripts (Hindi/Marathi), we will use a dual-font strategy.

*   **Primary Font (English & Numerals):** `Inter`
    *   *Why:* Highly legible, geometric, excellent for tabular financial data, and looks premium.
*   **Secondary Font (Hindi/Marathi):** `Mukta` (Google Fonts)
    *   *Why:* Specifically designed for Indian scripts. It lacks the heavy, traditional calligraphic strokes of older fonts and pairs perfectly with the modern look of `Inter`.

**Type Scale (Tailwind / CSS mapping):**
*   **Display / Hero Numerals:** 32px, Bold (e.g., Total Sales `₹1,24,560`)
*   **H1 (Screen Headers):** 24px, Semi-Bold (e.g., "नमस्ते, रमेश")
*   **H2 (Card Titles):** 18px, Semi-Bold (e.g., "आज की बिक्री")
*   **Body 1 (Primary Text):** 16px, Medium (e.g., Standard list items, Input values)
*   **Body 2 (Secondary Text):** 14px, Regular (e.g., Subtitles, labels)
*   **Caption (Microcopy):** 12px, Medium (e.g., "Synced", timestamps)

---

### 3. Color Palette
The palette borrows the trust and heritage of Bharat Petroleum (BPCL) but refines it for a modern software interface.

**Brand Colors:**
*   **BPCL Navy:** `#1E3A8A` (Used for splash screens, primary brand backgrounds)
*   **BPCL Gold:** `#FBBF24` (Used for accents, subtle highlights, stars)

**Application UI Colors:**
*   **Primary Action (Emerald):** `#059669` (Main CTA buttons, active states, checkmarks)
*   **Primary Action Hover/Press:** `#047857`
*   **Background (App-wide):** `#F3F4F6` (Cool, light grey to make white cards pop)
*   **Surface (Cards/Modals):** `#FFFFFF` (Pure white)

**Text Colors:**
*   **Text High Contrast:** `#111827` (Deep charcoal, never pure black for less eye strain)
*   **Text Muted:** `#6B7280` (For secondary labels and disabled states)

**Semantic & Fuel Colors:**
*   **Petrol Marker:** `#16A34A` (Green)
*   **Diesel Marker:** `#2563EB` (Blue)
*   **Error/Shortfall:** `#DC2626` (Red - e.g., "₹1,500 कम")
*   **Warning/Pending:** `#F59E0B` (Amber)
*   **Success (Reconciliation Match):** `#059669` (Green)

---

### 4. Layout & Spacing (Grid System)
Use a strict **8pt grid system** to ensure consistent rhythm across all devices.
*   **App Padding:** 16px or 20px on the left and right margins of the screen.
*   **Component Spacing:** 16px between vertical cards (e.g., `gap-4` in Tailwind).
*   **Internal Card Padding:** 20px (e.g., `p-5`) for comfortable breathing room.

---

### 5. UI Component Specifications

#### A. Buttons
*   **Primary Button:**
    *   **Background:** `#059669` (Emerald)
    *   **Text:** `#FFFFFF`, 16px, Semi-Bold
    *   **Border Radius:** 9999px (Fully rounded / Pill shape)
    *   **Height:** 56px (Large, for easy tapping)
    *   **Icon:** Trailing right arrow (→) aligned to the right edge.
*   **Secondary/Tab Button (Active):**
    *   **Background:** `#E0F2FE` (Light Blue)
    *   **Text:** `#0369A1` (Deep Blue)
    *   **Border Radius:** 12px

#### B. Cards (Surfaces)
*   **Standard Card:**
    *   **Background:** `#FFFFFF`
    *   **Border Radius:** 16px or 24px (Soft, friendly corners)
    *   **Shadow:** `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)` (Very soft, elegant elevation).
*   **Hero Card (Dashboard):**
    *   **Background:** Gradient or Solid Emerald/Navy.
    *   **Border Radius:** 24px
    *   **Content:** White text, clear numeric hierarchy.

#### C. Forms & Inputs
*   **Input Fields:**
    *   **Style:** Minimalist. Bottom border only (`border-b-2`) or soft grey background (`bg-gray-100`) with no border.
    *   **Label:** Floating or small top-aligned (12px, Muted Text).
    *   **Value:** 18px, High Contrast Text.
*   **Cash Grid Rows:**
    *   **Layout:** Flexbox row (`justify-between`, `items-center`).
    *   **Components:** `[Denomination (e.g., ₹500)]` + `[Qty Input Box]` + `[Calculated Total]`.
    *   **Qty Input Box:** 48px height, rounded-lg, centered text, grey background.

#### D. Status Chips & Indicators
*   **Pill Chip (e.g., "● Live" or "Shift A"):**
    *   **Height:** 28px
    *   **Padding:** 4px 12px
    *   **Border Radius:** 999px
    *   **Content:** 12px text with a 6px pulsing colored dot.

---

### 6. Specialized App Elements

*   **Task Checklist (Dashboard):** 
    *   A vertical stepper showing shift progress (e.g., 1. Nozzle Reading, 2. Cash Collection, 3. Reconciliation). 
    *   *Visuals:* Inactive steps are grey rings. Completed steps are solid green circles with white checkmarks.
*   **Nozzle UI Modules:**
    *   Use high-quality PNG renders of physical nozzles (Green for Petrol, Blue for Diesel) acting as toggle buttons or visual anchors.
    *   When selected, the active nozzle card elevates and gets a 2px Emerald border.
*   **Reconciliation Success State:**
    *   A massive centered green checkmark inside a soft green circular background (`#D1FAE5`).
    *   Confetti or subtle particle effects should be used sparingly (only opacity animations, no heavy physics) upon submission.

### 7. Iconography
*   **Family:** *Heroicons* (Outline for inactive, Solid for active) or *Phosphor Icons*.
*   **Stroke Weight:** 2px consistent stroke.
*   **Usage:** Keep icons monochromatic (usually muted grey or emerald) to avoid clashing with the primary data. 

---

### 8. Implementation Notes for Frontend (React/Ionic)
*   **CSS Framework:** Tailwind CSS is highly recommended to implement this design system quickly using utility classes like `rounded-2xl`, `shadow-sm`, `text-gray-900`, etc.
*   **Keyboard Management:** For the Cash Grid and Nozzle Readings, disable the native OS alphanumeric keyboard. Trigger the OS `numeric` keypad, or better yet, build a custom React NumPad component that slides up, ensuring massive touch targets for the pump attendants.
*   **Animations:** Use CSS transitions for button presses (`scale-95`, duration `150ms`) to provide immediate tactile feedback.