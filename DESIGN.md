# Design System: The Editorial Table

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Slow-Living Curator."** 

Unlike traditional e-commerce platforms that prioritize high-velocity sales through loud banners and aggressive CTA buttons, this system treats the interface as a premium lifestyle magazine. We are not just selling frozen food; we are selling a moment of "Stroll & Eat" (漫步食光) tranquility. 

The design breaks the "template" look through **intentional asymmetry**, where product imagery often breaks the grid, and **typographic dominance**, where large Serif headlines act as structural elements. We embrace "Negative Space as Luxury"—if a screen feels "empty," it is likely working exactly as intended.

---

## 2. Colors & Tonal Architecture
The palette is rooted in the organic, desaturated tones of high-end ceramics and natural linens.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts. For example, a recipe section using `surface-container-low` (#F4F4F0) should sit directly against the `surface` (#FAF9F6) background. The eye should perceive the change in "weight" rather than a hard edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper sheets. 
- **Base Layer:** `surface` (#FAF9F6).
- **Secondary Content (e.g., Sidebars):** `surface-container` (#EDEEEA).
- **Interactive Cards:** `surface-container-lowest` (#FFFFFF) to create a subtle "pop" against the cream background.

### Signature Textures (The Milk Tea Glow)
To provide a "soulful" professional polish, main CTAs and hero backgrounds should utilize a subtle radial gradient rather than a flat fill.
- **CTA Gradient:** Transitioning from `primary` (#725A39) at the center to `primary_dim` (#654F2E) at the edges. This mimics the natural depth of a steeped tea.

---

## 3. Typography: The Editorial Voice
The hierarchy is designed to feel like a high-end menu or an art gallery catalog.

- **Display & Headlines (Modern Songti Serif):** Use `notoSerif` for all `display-` and `headline-` tokens. These should be set with generous tracking and tight line-height to feel like a deliberate "stamp" of authority.
- **Body & Utility (Clean Sans-Serif):** Use `manrope` for all `body-`, `title-`, and `label-` tokens. This provides a functional, modern counter-balance to the traditional serif, ensuring legibility at small scales.
- **Visual Rhythm:** Use `display-lg` (3.5rem) sparingly for "brand moments," juxtaposed against `body-sm` (0.75rem) labels to create a high-contrast typographic scale that feels sophisticated.

---

## 4. Elevation & Depth: Tonal Layering
We reject the heavy drop-shadows of the 2010s. Depth is earned, not applied.

### The Layering Principle
Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift that mimics physical paper without artificial shadows.

### Ambient Shadows
When a floating effect is required (e.g., a "Quick Add" cart modal), use an **Ambient Shadow**:
- **Shadow Token:** `on-surface` (#2F3430) at 5% opacity.
- **Blur:** 40px to 60px.
- **Spread:** -10px (to keep the shadow "tucked" under the object).

### Glassmorphism & Depth
For floating navigation bars or overlays, use a "Frosted Glass" effect:
- **Background:** `surface` (#FAF9F6) at 80% opacity.
- **Backdrop-blur:** 12px.
- This allows the `primary` and `secondary` colors of product photography to bleed through the interface, making the app feel like a single, cohesive environment.

---

## 5. Component Logic

### Buttons (The "Soft Pebble" Style)
- **Primary:** `primary` (#725A39) background with `on_primary` (#FFF6EF) text. Radius: `md` (0.75rem).
- **Secondary:** `secondary_container` (#D4E8D2) background. No border.
- **Tertiary:** Text-only using `primary` with a small underline that only appears on hover.

### Cards & Lists (The Borderless Gallery)
- **Rule:** Forbid the use of divider lines between list items.
- **Method:** Use vertical white space (Spacing `8`: 2.75rem) or a subtle shift to `surface-container-high` on hover to define list boundaries. 
- **Corners:** Use `lg` (1rem) for product cards to emphasize a "gentle" and "approachable" feel.

### Input Fields
- **State:** Instead of a border, active fields use a background color shift to `surface-container-highest` (#E0E4DE).
- **Label:** Labels should be `label-sm` in `on-surface-variant` (#5C605C), positioned above the field, never inside as placeholder text.

### Signature Component: The "Ingredient Chip"
For '漫步食光', ingredients are the stars. Use `secondary` (#526453) backgrounds for "Organic" or "Vegan" chips, with a `full` (9999px) radius to look like smooth river stones.

---

## 6. Do’s and Don'ts

### Do
- **Do** use `spacing-16` (5.5rem) for section margins. Space is the primary indicator of a "high-end" experience.
- **Do** use `secondary` (Misty Green) to highlight health benefits and nutritional reassurance.
- **Do** align serif headlines to the left while keeping body text in a narrower, centered column for an editorial, asymmetric layout.

### Don't
- **Don't** use 100% black (#000000). Always use `on-surface` (#2F3430) for text to maintain the "Milk Tea" warmth.
- **Don't** use high-saturation red for errors. Use the `error` (#9E422C) token, which is a muted "Terra Cotta" red, keeping with the organic theme.
- **Don't** use standard grid-based image galleries. Vary the sizes of product images (using the `xl` 1.5rem corner radius) to create a more curated, "scrapbook" feeling.
