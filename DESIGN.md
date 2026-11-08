---
name: Classroom World Map
description: A quiet, readable geographic canvas for classroom exploration.
colors:
  ocean: "#edf3f5"
  land: "#d4dfd2"
  ink: "#283b42"
  line: "#6b8184"
  paper: "#ffffff"
  focus: "#175c6f"
  disabled: "#8a979b"
  divider: "#c2ccce"
  control-hover: "#e4eded"
  control-active: "#d4e0df"
typography:
  attribution:
    fontFamily: '"Noto Sans", sans-serif'
    fontSize: "12px"
    lineHeight: 1.5
  disclosure:
    fontFamily: '"Noto Sans", sans-serif'
    fontSize: "13px"
    lineHeight: 1.6
  feedback:
    fontFamily: '"Noto Sans", sans-serif'
    fontSize: "14px"
  error-title:
    fontFamily: '"Noto Sans", sans-serif'
    fontSize: "18px"
    fontWeight: 700
rounded:
  zoom-inner: "2px"
  control: "3px"
spacing:
  control-gap: "8px"
  desktop-inset: "16px"
  attribution-inset: "14px"
  mobile-inset: "12px"
components:
  zoom-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    width: "44px"
    height: "44px"
    padding: "0"
  reset-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    width: "46px"
    height: "46px"
    padding: "0"
  navigation-hover:
    backgroundColor: "{colors.control-hover}"
  navigation-active:
    backgroundColor: "{colors.control-active}"
  loading-feedback:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.feedback}"
    rounded: "{rounded.control}"
    padding: "16px 20px"
  source-disclosure:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.disclosure}"
    rounded: "{rounded.control}"
    padding: "16px"
  retry-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  retry-button-hover:
    backgroundColor: "{colors.focus}"
---

# Design System: Classroom World Map

## Overview

**Creative North Star: "The Classroom World Map"**

A light, quiet geographic canvas supports students and educators on shared classroom screens. Muted sage land, pale ocean, distinct borders and plain country names carry the visual identity. Small white controls remain subordinate to geography.

The approved world replaces the former dark, gold, serif siege interface. The visual language favors clarity and geographic context; runtime geography and font assets are local.

**Key Characteristics:**
- Sage land against a pale blue-gray ocean.
- Plain sans-serif labels and distinct slate boundaries.
- Small white rectangular controls with visible keyboard focus.

## Colors

The palette is low saturation, with dark ink supplying readable labels and slate supplying boundaries.

### Primary
- **Sage Land** (`land`): country fills and the label halo that separates names from boundaries.

### Neutral
- **Pale Ocean** (`ocean`): map background and attribution backing.
- **Dark Ink** (`ink`): country names, interface text and retry button fill.
- **Slate Boundary** (`line`): country boundaries and interface outlines.
- **White Paper** (`paper`): controls and feedback surfaces.
- **Muted Divider** (`divider`): separation between the zoom buttons.
- **Disabled Slate** (`disabled`): unavailable control icons.
- **Hover Mist** (`control-hover`) and **Pressed Sage** (`control-active`): navigation states.
- **Focus Teal** (`focus`): keyboard outlines and retry hover.

**The Geographic Color Rule.** Keep land, ocean and boundary colors consistent between the CSS interface and the MapLibre style.

## Typography

**Font:** locally hosted Noto Sans, with sans-serif fallback. The variable font supports weights 100–900. Use the frontmatter roles for interface type; do not substitute a decorative display face.

Source text stays plain. The map has no title overlay; its accessible name remains available to assistive technology.

Country labels use the same Noto Sans family. Geographic area determines their
size tier, minimum zoom and collision priority, using the local country-labels
list. Larger areas place first. By size tier, font sizes are 14/12/11/10px at
zoom 0, 19/15/13/12px at zoom 3, 24/20/17/16px at zoom 5, and 34/28/24/22px at
zoom 8, interpolating between stops. The last font-size value covers tiers 3–6.
Labels use line height 1.15, maximum width 6 em, padding 2px, a land-colored halo
(width 1.1px, blur 0.4px), and collision avoidance. Minimum zoom determines
eligibility; available space determines final visibility. Center alignment uses
offline-computed interior anchors in the largest landmass, avoiding holes.

## Layout

The map fills the viewport, using dynamic viewport height with a conventional viewport fallback. Attribution sits lower left; stacked zoom and reset navigation sits lower right. The upper-left corner stays clear. These placements describe the current map surface, not a template for unrelated future screens.

Horizontal navigation wraps at the date line without stopping. The zoom-out
limit fills both viewport dimensions and adapts to viewport size. The zoom-in
cap is fixed at MapLibre zoom 21, using Google's documented close-up scale as a
reference. This supersedes the former 2× overview limit. The viewport's top and bottom stop at the
Mercator polar boundaries; tall screens show a narrower longitude range.
World wrapping is continuous navigation,
not a row of separate complete maps at the widest zoom.

Navigation uses 16px right/bottom insets and an 8px gap between the zoom group and reset. Safe-area insets take precedence. At widths up to 600px, navigation moves to a 12px right inset. Attribution reserves room for navigation with a maximum width of the viewport minus 90px.

Feedback is centered over the map with a maximum width of the viewport minus 40px. Source disclosure opens above the attribution, constrained to 340px or the viewport minus 90px. The geographic canvas resizes with its container; pan and zoom keep labels and boundaries on the same camera.

## Elevation & Depth

Surfaces have no shadows. Opaque white fill and a single slate border distinguish controls and messages from the map. Map labels use a land-colored halo for legibility rather than a shadow.

**The Flat Surface Rule.** Use borders and tonal contrast for separation; keep control surfaces unshadowed.

## Shapes

The form language is rectangular with restrained corners: controls, source disclosure and feedback use the control radius. The zoom pair shares one outlined shell with a dividing line. Navigation icons are simple 22px outline SVGs with 2px rounded strokes. Country borders scale from 0.65px at zoom 0 to 1px at zoom 4 and 1.4px at zoom 8.

## Components

### Navigation

The zoom pair uses 44px square buttons inside one bordered shell. Reset is a separately outlined 46px square. Buttons use white fill at rest, hover and pressed palette states, and disabled slate when unavailable. Hover transitions use 120ms ease-out. Keyboard focus uses a 3px teal outline offset 3px; the map canvas uses the same outline inset by 3px.

Reset fits the world bounds with a 650ms navigation animation. Initial fit has no animation and label fade is disabled. CSS state transitions become instantaneous for reduced-motion preference.

### Source disclosure

The attribution line uses small text with a plain source link and an underlined native disclosure summary. Expanded boundary notes use a white outlined rectangle. Preserve the nearby explanation that Natural Earth boundaries are generalized and may be disputed.

### Loading and error feedback

Loading uses a short status message in a centered white outlined surface. Errors use the same family with an 18px heading, explanatory text and a dark retry button with a minimum 44px height. Retry hover uses focus teal. Native status and alert semantics carry state changes.

## Do's and Don'ts

### Do:
- **Do** use local Noto Sans for both interface text and map labels.
- **Do** preserve visible borders, keyboard focus and generous navigation hit areas.
- **Do** let country labels reveal through zoom and collision placement.
- **Do** retain the source and boundary-convention disclosure.

### Don't:
- **Don't** revive the former dark, gold, serif siege visual language.
- **Don't** add ornamental shadows or decorative display typography.
- **Don't** treat illustrative mock geography as authoritative map geometry.
