# Design — UI/UX Design Specification

**Phase 2 position:** First step (before synthesize).

**Core duty:** Through questions and reference collection, determine product visual style and interaction spec. Output `docs/DESIGN.md` as mandatory reference for all subsequent UI implementation.

## Trigger

- "Help me design the UI"
- "I want a nice interface"
- "I care about interaction experience"
- Phase 2 design phase begins
- User provides screenshots, reference app names, or visual keywords
- "Like XXX's style"

## Process

### Step 1: Collect References (Priority Over Questions)

Ask user if they have:
1. Screenshots — send directly, AI analyzes style
2. Reference app — just name it (e.g. "like Linear", "like Notion")
3. Keywords — say anything (e.g. "dark, big radius, clean")

No reference is fine — AI recommends based on product type.

**Screenshot:** Analyze color, font, spacing, radius, animation. Extract design language, confirm with user.

**Reference app:** Describe core design characteristics, ask "Is this the feel? What would you adjust?"

**No reference:** Recommend 2-3 style directions based on product type.

### Step 2: Ask Design Preferences One by One

**① Overall style**
- A. Clean minimal (lots of whitespace, font-driven, like Linear/Notion)
- B. Playful modern (colors, gradients, like Figma/Vercel)
- C. Professional serious (dark theme, data-dense, like GitHub/Raycast)
- D. You describe

**② Color**
- Dark mode primary / Light mode primary / Follow system
- Any primary color preference?

**③ Radius and spacing**
- Big radius (softer, modern) / Small radius (serious, precise) / Right angle (minimal, professional)

**④ Animation**
- Rich and smooth (page transitions, spring physics) / Minimal (only necessary transitions) / None (pure, fast)

**⑤ Interaction feedback**
- Obvious feedback (click has scale, color change) / Subtle feedback (professional feel)

### Step 3: Infer and Complete

After user confirms direction, auto-infer remaining details:
- Font recommendation (1-2 based on direction)
- Primary/secondary/background/text colors (specific values)
- Spacing unit (4px / 8px system)
- Radius sizes (specific values)
- Shadow style (yes / no / subtle)
- Icon style (line / fill / mixed)

Present completed plan for confirmation:
```
Based on your direction, I infer these details. Confirm?

Primary: #2C5F8A (deep blue)
Background: #0F1117 (dark mode main)
Text: #F4F4F5
Radius: 8px (medium)
Font: Inter (UI) / JetBrains Mono (code)
Spacing: 8px multiple system
Animation: 150ms ease-out transition
```

### Step 4: Write docs/DESIGN.md

After user confirms, generate `docs/DESIGN.md` with:
- Overall style (one sentence)
- Color system (primary, secondary, background, text, danger, success)
- Fonts (UI font, code font, weight scale)
- Spacing and radius
- Shadows
- Animation specs (page transition, element appear, interaction feedback, prohibited)
- Icon specs (library, style, sizes)
- Core component conventions (button, card, form input, empty state, loading state)
- Prohibitions (no unauthorized changes, no undefined colors, no mixed icon styles, no over-duration animations)

### Step 5: Inform Reference Rules

After writing, tell user:
```
DESIGN.md written to docs/.

Subsequent rules:
- Phase 3: AI must read DESIGN.md before any UI implementation
- If UI doesn't match spec, say "this doesn't match DESIGN.md", AI must fix
- To adjust design spec, say "update DESIGN.md", re-run question process
```

## Notes

- **Disable compression.** Design phase needs full natural language. Resume after design ends.
- **Screenshot priority.** When user provides screenshots, extract from screenshot first, don't ignore and ask questions.
- **Don't write DESIGN.md without confirmation.** Must confirm plan with user first.
- **DESIGN.md is Phase 3 mandatory constraint.** Every component must reference this doc, no improvisation.
- **If user says "this looks bad" in Phase 3:** First determine if it's DESIGN.md style problem or AI not following DESIGN.md. Former: update process. Latter: make AI redo per spec.
