---
name: Classroom World Map
description: A quiet, readable geographic canvas for classroom exploration.
colors:
  ocean: "#edf3f5"
  ocean-ink: "#476b7a"
  land: "#d4dfd2"
  ink: "#283b42"
  island-ink: "#405c60"
  water: "#b7d4df"
  river: "#709cac"
  water-ink: "#285366"
  landform-ink: "#5c5545"
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

Country labels use the same Noto Sans family. Natural Earth LABELRANK determines
fixed collision priority, with descending area and identifier as tie-breakers.
Rank 1–2 is eligible at zoom 0; ranks 3–7 at zoom 3–7 respectively. These are
app-specific bands; source MIN_LABEL is retained for reference. No priority
changes occur in response to browsing history. Geographic area controls font
size tiers only. Names
keep their centered geographic anchors and avoid overlaps. By size tier, font
sizes are 14/12/11/10px at zoom 0, 19/15/13/12px at zoom 3, 24/20/17/16px at
zoom 5, and 34/28/24/22px at
zoom 8, interpolating between stops. The last font-size value covers tiers 3–6.
Labels use line height 1.15, maximum width 6 em, padding 2px, a land-colored halo
(width 1.1px, blur 0.4px), and collision avoidance. Minimum zoom determines
eligibility; available space determines final visibility. Center alignment uses
offline-computed interior anchors in the largest landmass, avoiding holes.

Physical island and archipelago labels form a secondary layer. They use Noto Sans
at 11px at zoom 3, 14px at zoom 5 and 18px at zoom 8, with island ink and a 1px
land-colored halo. Minimum zoom is at least 3 and follows source guidance and size.
Country labels have collision priority. Archipelago labels disappear at closer
zoom to make room for individual islands. Avoid duplicating existing country names.

Standard ocean names use ocean ink (`#476b7a`) over an ocean-coloured 1.5px halo.
Noto Sans grows from 12px at zoom 0 to 15px at zoom 2, 22px at zoom 5 and 28px at
zoom 8, with 0.08em letter spacing, 1.2 line height and 4px collision padding.
Ocean names place first and always render when their anchors are in view; other
labels avoid their collision boxes. Seven sourced offshore anchors label
the five oceans, retaining North/South Atlantic and Pacific distinctions. They
are eligible from overview zoom onward; the layer is hidden in Physical Geography.

Sea, bay and gulf names share ocean ink and an ocean-coloured 1.5px halo, with a smaller scale:
11px at zoom 1, 14px at zoom 4, 19px at zoom 7 and 24px at zoom 10. Use 1.2 line
height and 3px collision padding. Major seas are eligible at zoom 1; smaller seas
follow source label guidance. Country/island labels have placement priority.
Sea anchors stay offshore in the bundled geography, and the layer follows
Standard-only visibility alongside ocean names.
Text stays centered on its water anchor with a five-em wrapping width. Names
yield to collisions rather than shifting toward nearby land.

## Layout

The map fills the viewport, using dynamic viewport height with a conventional viewport fallback. Attribution sits lower left; stacked zoom and reset navigation sits lower right. A compact Standard / Physical Geography switch sits upper left. These placements describe the current map surface, not a template for unrelated future screens.

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

### Map mode switch

Two native buttons share an outlined white shell at the upper-left 14px/16px
insets, respecting safe areas. Each has a minimum height of 44px, 10px 14px
padding, 13px medium Noto Sans text and the shared 3px focus outline. The active
button uses dark ink with white text; hover uses focus teal. `aria-pressed`
exposes the selected mode. No title or branding accompanies the switch.

Physical Geography hides country borders and country names. Local shaded-relief
tiles reveal ridges, valleys and plateaus beneath water features and names.
The source's cross-blended elevation/region colours are desaturated to 65%, with
90% raster opacity over sage land. Ocean areas are transparent, matching the
existing coastline mask. Native raster zooms 0–4 serve overview/regional detail;
closer views enlarge the same imagery. This is flat shaded relief, without tilt.
Lakes use water
fill, rivers use river blue, and water names use water ink. Landform names use
landform ink with a sage halo. Natural-feature names grow from 12px at zoom 1
to 16px at zoom 4 and 22px at zoom 8. Island labels remain in both modes. No
numerical elevation colour scale is implied. Switching layers preserves the same map camera.
Physical loading/error feedback sits below the mode switch, leaving navigation
usable. Standard startup does not fetch physical datasets.

Coastal features appear only in Physical Geography. Shorelines use slate at 75%
opacity and widths 0.45px at zoom 0, 0.8px at zoom 5 and 1.2px at zoom 8.
Coastal water labels use water ink with an ocean halo; land labels use landform
ink with a sage halo. Both grow from 11px at zoom 2 to 14px at zoom 5 and 19px at
zoom 8, with 4px collision padding. Cape locations use 2px island-ink dots and a
1px ocean stroke. Labels can choose nearby anchor positions to avoid collisions.
Named feature regions are not filled or outlined: those source polygons are
approximate label-placement aids, not exact geographic boundaries. Source-guided
label eligibility starts at zooms 2–10 and persists at closer zooms.

### Physical surface control and legends

Physical Geography offers a native radio group below the mode switch: “Terrain
relief”, “Land cover · 2020” and “Rock types”. One surface is selected at a time.
Each label has a 44px minimum hit area, 10px 12px padding, an 18px native radio
and an 8px gap. The white outlined group wraps on narrow screens. It preserves
the camera, reference water layers and labels. Land cover and rock types replace
relief colours with opaque categorical tiles; nearest-neighbour rendering and
lossless palette colours avoid blending categories. Palettes and source notes
live in the respective `public/data/world/{land-cover,geology}/legend.json` files.
Land cover is a modern 2020 overview. Rock types describe compiled surface
lithology, with no geological ages or subsurface interpretation implied.

A collapsed native disclosure above the lower-left attribution opens the
active legend. Its 44px summary reveals labelled, outlined 14px colour swatches,
a short source-specific overview notice and source credit. The panel fits within the
viewport minus navigation space; its contents scroll on short screens. Text is
12px dark ink on white, with 1.5 line height. No title plaque is reintroduced.
Selection is retained across mode changes but shown only in Physical Geography.
Classification loading uses a status surface below the radio group; failed tiles use
the existing physical-data retry path. Source credit stays visible in attribution.

### Navigation controls

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
