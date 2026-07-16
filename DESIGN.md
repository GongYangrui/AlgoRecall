---
name: AlgoRecall
description: A calm study workspace for sustainable algorithm review.
colors:
  paper: "#fcfcf7"
  paper-muted: "#f4f5ec"
  border: "#e5e7da"
  ink: "#12212c"
  teal: "#078c8c"
  green: "#3c8f72"
  amber: "#c48a18"
  success: "#3fae68"
  error: "#d9544d"
typography:
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  field: "0.55rem"
  panel: "0.8rem"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

# Design System: AlgoRecall

## Overview

**Creative North Star: "The Study Margin"**

AlgoRecall should feel like a precise annotation written beside the learner's current work. The system is bright and paper-like, with compact information density, restrained teal emphasis, and warm amber reserved for caution or a moment that needs attention. It should never feel like another dashboard demanding attention.

The extension panel inherits this language while remaining visually independent from LeetCode through Shadow DOM. It is collapsed at rest on every LeetCode page, opens to today's review queue outside problem pages, and becomes a focused recording tool on problem pages.

## Colors

Paper neutrals carry almost every surface. Teal is reserved for connection, focus, and the primary action; green confirms a recorded review; amber signals an expiring or unsupported state; red is reserved for actionable failure.

- **Paper** (`#fcfcf7`): primary light surface.
- **Muted Paper** (`#f4f5ec`): secondary surface and subtle grouping.
- **Ink** (`#12212c`): primary text.
- **Recall Teal** (`#078c8c`): primary action and focus.
- **Study Amber** (`#c48a18`): warning and attention.
- **Success Green** (`#3fae68`): completed state.
- **Error Red** (`#d9544d`): destructive or failed state.

Dark presentation uses the same hue relationships with tinted near-black surfaces rather than pure black. Primary color should remain under roughly 10% of a task surface.

## Typography

Use the existing Inter/system sans stack for product familiarity and fast rendering. Headings use strong weight rather than display styling; labels are concise and compact; body copy stays within 65–75 characters when it becomes explanatory.

- **Title:** 1.25rem, weight 800, line-height 1.2.
- **Body:** 0.875rem, weight 400, line-height 1.5.
- **Label:** 0.75rem, weight 700, line-height 1.3.
- **Problem identifiers:** system monospace, 0.75rem–0.875rem, weight 700.

## Elevation

Depth is mostly tonal and structural. First-party pages use daisyUI's low elevation and borders; the injected panel may use one ambient shadow because it floats above an unrelated host page. Shadows must remain diffuse and never stack across nested containers.

- **Floating panel:** `0 18px 48px rgb(18 33 44 / 0.18)`.
- **Focus:** a 2px teal outline with 2px offset.

## Components

- **Buttons:** daisyUI `btn` variants on first-party pages. Use one primary action per state; secondary and destructive actions use outline or ghost treatment.
- **Fields:** daisyUI `textarea` and standard labeled inputs, with persistent character count for review notes.
- **Alerts:** daisyUI soft alerts for page-level errors and success; compact inline status text inside the extension.
- **Connection list:** simple list rows with device metadata and one explicit revoke action, not a grid of cards.
- **Extension trigger:** a compact pill with status dot and AlgoRecall label; it expands into a single 320px panel.
- **Extension panel:** one surface, no nested cards. Result choices form a readable two-column action group, followed by an optional note field.
- **Extension study flow:** use compact Record and Today tabs. Keep the current problem's memory rail in Record, and present today's due problems as navigable list rows rather than nested cards.
- **Extension home:** outside problem pages, omit the Record tab and lead with one Start Review action followed by the same compact due-problem list. Navigation stays in the current tab and preserves the active LeetCode domain.

## Do's and Don'ts

### Do

- Do keep the injected trigger compact and clear of LeetCode's primary controls.
- Do use semantic state labels in addition to color.
- Do use visible focus, keyboard order, and polite live-region feedback.
- Do keep transitions between 150–220ms and disable them for reduced motion.
- Do use the established daisyUI vocabulary on AlgoRecall pages.

### Don't

- Don't use noisy gamification, streak pressure, or celebratory effects that interrupt concentration.
- Don't use neon accents, purple gradients, glass-heavy panels, gradient text, or decorative blur.
- Don't obscure LeetCode's editor or problem workspace.
- Don't nest decorative cards or use colored side-stripe borders.
- Don't load remote fonts, scripts, CSS, or icons in the extension.
