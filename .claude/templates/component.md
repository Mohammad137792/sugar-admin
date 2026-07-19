---
id: template-component
title: Shared UI Component Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Shared UI Component Template

## Purpose

Use this template to propose or document a new shared component in
`src/components/ui/` — the presentation-layer primitives used across features
(`Button`, `Input`, `Card`, `Avatar`, `Badge`, `Divider`, `IconButton`, `Row`,
`Screen`, `Spacer`, `Typography`, exported from `src/components/ui/index.ts`).

Filled out by `ui-engineer`. A component belongs in `src/components/ui/` only if
it is genuinely reusable across more than one feature (`context.md`'s Folder
Philosophy: "shared code exists only when it is genuinely reusable"); a component
used by one screen belongs inside that feature's own `components/` folder instead
(`src/features/<feature>/components/`), not here.

## Instructions

1. **Name** the component with a specific, non-generic name — `context.md`'s
   Naming Philosophy explicitly forbids generic names like "manager," "helper,"
   "component2." `Chip` is acceptable; `GenericTag` is not.
2. **Props interface** — every prop typed explicitly, optional props given
   sensible defaults matching the pattern in `Button.tsx` (`variant = "primary"`,
   `loading = false`, etc., destructured with defaults in the function signature).
3. **Variants** — if the component has visual variants, model them as a string
   union type (`type Variant = "primary" | "secondary" | ...`), exactly like
   `Button.tsx`'s `Variant` type — not booleans (`isPrimary`, `isSecondary`) and
   not a loose `string`.
4. **Theming** — every component must call `useTheme()` from
   `src/context/ThemeContext.tsx` for any color value; never hardcode a hex color
   in a component's JSX or styles except for fixed white/black text on a gradient
   (see `Button.tsx`'s `"#fff"` on the primary gradient — the one accepted
   exception, because that text sits on a fixed gradient regardless of theme).
5. **Styling** — use `StyleSheet.create` at the bottom of the file, matching every
   existing component in `src/components/ui/`. Do not introduce a new styling
   approach (e.g. inline style objects for static styles, or NativeWind
   className strings) inside `src/components/ui/` without an explicit
   `architecture-proposal.md` — NativeWind is in `package.json` but the existing
   shared components use `StyleSheet.create`, and consistency wins over a
   per-component preference (constitution.md: Predictability).
6. **States** — cover disabled/loading states where applicable, matching
   `Button.tsx`'s `isDisabled = disabled || loading` pattern.
7. **Accessibility** — every interactive component needs an accessible label/role;
   every touch target should meet minimum size guidelines (constitution.md:
   Accessibility).
8. List every screen/feature expected to use this component — if the honest answer
   is "one screen," this belongs in that feature's own `components/` folder
   instead, not `src/components/ui/`.

---

## The Template

```markdown
### Component: <Name>

**Location:** `src/components/ui/<Name>.tsx`

**Purpose:** <one sentence — what UI concept this represents>

**Used by (must be 2+ features/screens, or it doesn't belong in src/components/ui/):**
- <feature/screen>
- <feature/screen>

**Props:**
```ts
type Variant = "<variant1>" | "<variant2>";

interface Props {
  <prop>: <type>;
  <optionalProp>?: <type>; // default: <value>
}
```

**Variants:** <describe each variant's visual/behavioral difference>

**States covered:** default | disabled | loading | <other states specific to this component>

**Theming:** <which `useTheme().colors` tokens this component uses>

**Accessibility:** <accessible role/label, minimum touch target, dynamic type behavior>

**Example usage:**
```tsx
<Name <prop>={<value>} />
```
```

---

## Filled Example: `Chip`

```markdown
### Component: Chip

**Location:** `src/components/ui/Chip.tsx`

**Purpose:** A small, tappable pill used to represent a selectable filter or a
removable tag — e.g. category filters on ProductListScreen, or selected
categories on ProductFormScreen.

**Used by (2+ features, so it belongs in src/components/ui/):**
- products feature — ProductListScreen category filter row
- products feature — ProductFormScreen selected-categories list
- content feature — ContentScreen tag filter row (existing feature, reusable need)

**Props:**
```ts
type ChipVariant = "filter" | "removable";

interface Props {
  label: string;
  variant?: ChipVariant;   // default: "filter"
  selected?: boolean;      // default: false — only meaningful for variant="filter"
  disabled?: boolean;      // default: false
  onPress?: () => void;    // required for variant="filter" (toggles selection)
  onRemove?: () => void;   // required for variant="removable"
}
```

**Variants:**
- `filter` — toggleable pill; `selected` controls a filled vs. outlined visual
  state; tapping calls `onPress`.
- `removable` — static label with a trailing "x" affordance; tapping the "x"
  calls `onRemove`; the label itself is not tappable.

**States covered:** default, selected (filter variant only), disabled

**Theming:** `colors.violet`/`colors.pink` for the selected-filter fill
(consistent with `Button.tsx`'s primary gradient palette), `colors.btnSecondaryBg`
/ `colors.btnSecondaryBorder` for the unselected/outlined state, `colors.textPrimary`
for label text, matching the token names already used in `Button.tsx`.

**Accessibility:** `accessibilityRole="button"`, `accessibilityState={{ selected }}`
for the filter variant so screen readers announce selection state; minimum 44x44pt
touch target achieved via padding even though the visual pill is smaller;
`removable` variant's "x" has `accessibilityLabel={`Remove ${label}`}`.

**Example usage:**
```tsx
import Chip from "../../../components/ui/Chip";

// Filter usage (ProductListScreen)
<Chip
  label="Clothing"
  variant="filter"
  selected={categoryId === "clothing"}
  onPress={() => setCategoryId("clothing")}
/>

// Removable usage (ProductFormScreen)
<Chip label="Clothing" variant="removable" onRemove={() => removeCategory("clothing")} />
```

**Implementation sketch (for reference, not authoritative — ui-engineer owns final code):**
```tsx
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type ChipVariant = "filter" | "removable";

interface Props {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export default function Chip({
  label, variant = "filter", selected = false, disabled = false, onPress, onRemove,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={variant === "filter" ? onPress : undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.base,
        selected
          ? { backgroundColor: colors.violet }
          : { backgroundColor: colors.btnSecondaryBg, borderWidth: 1, borderColor: colors.btnSecondaryBorder },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: selected ? "#fff" : colors.textPrimary }]}>
        {label}
      </Text>
      {variant === "removable" && (
        <TouchableOpacity onPress={onRemove} accessibilityLabel={`Remove ${label}`}>
          <Text style={{ color: colors.textPrimary }}>×</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:     { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, minHeight: 44 },
  disabled: { opacity: 0.45 },
  label:    { fontSize: 13, fontWeight: "600" },
});
```
```

---

## Checklist

- [ ] Name is specific, not generic (no "manager," "helper," "componentN")
- [ ] Used by at least two features/screens — otherwise this belongs in a feature's own `components/` folder
- [ ] Props interface fully typed, no bare `any`
- [ ] Variants (if any) modeled as a string union, not booleans
- [ ] Uses `useTheme()` for every color, no hardcoded hex except fixed-contrast text on a gradient
- [ ] Uses `StyleSheet.create`, matching existing `src/components/ui/*` files
- [ ] Disabled/loading states covered if applicable
- [ ] Accessibility role, label, and touch target size specified

## References

- `.claude/constitution.md` — Naming Philosophy (via context.md), Accessibility, Design Principles
- `.claude/context.md` — Folder Philosophy, Naming Philosophy
- `src/components/ui/Button.tsx` — the reference shape this template is modeled on
- `src/context/ThemeContext.tsx` — `useTheme()` contract (`mode`, `isDark`, `colors`, `toggleTheme`)
- `src/components/ui/index.ts` — where new shared components must be exported from
