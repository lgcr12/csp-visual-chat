# Implementation Plan

This plan turns the galgame direction into code in stages.

## Stage 1: Documentation and State Foundation

Deliverables:

- Add galgame design docs.
- Add route state fields for gameplay mode and relationship stage.
- Keep existing route values backward compatible.
- Add helper functions for condition checks.

Scope:

- No major UI rebuild yet.
- No storage migration beyond safe defaults.

## Stage 2: UI Structure

Deliverables:

- Promote galgame mode as a full stage layout.
- Make dialogue, speaker plate, choices, and route status the visual priority.
- Move mode selection into the system menu.
- Make system menu compact by default.
- Improve mobile choice layout and text readability.

Acceptance:

- Player can identify character, text, and choices immediately.
- System controls do not dominate the scene.
- Text remains readable on mobile.

## Stage 3: Gameplay Modes

Deliverables:

- Add `free`, `story`, and `hybrid` mode state.
- Add UI control for mode selection.
- Adjust choice frequency per mode.
- Let story mode prefer scene choices.
- Let free mode prefer open chat.
- Let hybrid mode trigger events from state thresholds.

Acceptance:

- Switching modes does not reset route state.
- The same character route continues across modes.

## Stage 4: Conditional Choices

Deliverables:

- Add structured choice definitions.
- Filter choices by route phase, relationship stage, flags, and memories.
- Add hidden or locked choices where useful.
- Track choice reasons internally.
- Implemented: story event choices now carry `modes`, `conditions`, and an internal unlock reason, so they behave closer to Ren'Py-style conditional menu items.

Acceptance:

- Choices appear because the route supports them.
- The player sees fewer generic reply chips.
- High-intimacy choices cannot appear too early.

## Stage 5: Character Bible Integration

Deliverables:

- Add per-character bible fields or generated metadata.
- Connect CSP-derived behavior constraints to prompts.
- Add OOC guardrail checks before choices and route events.
- Implemented: per-character Story Bible editor persists canon window, world boundaries, speech DNA, relationship logic, stress response, route hooks, forbidden actions, and OOC risks.
- Implemented: backend prompt now injects route phase, relationship stage, current scene, recent memories, and Story Bible guardrails.
- Implemented: new characters receive a conservative `draft:auto` Story Bible, and existing characters can generate a reviewable draft from the editor.

Acceptance:

- Character voice and boundaries remain stable.
- World knowledge limits affect generated content.

## Stage 6: Story Events

Deliverables:

- Add `currentScene`.
- Add scene templates for common route and personal route.
- Add scene entry and exit effects.
- Add memories produced by scenes.

Acceptance:

- Hybrid mode can enter a route event from normal chat.
- Event choices update state and write memories.

## Stage 7: Endings

Deliverables:

- Add ending state detection.
- Add ending summaries.
- Add route log entries that explain why the ending was reached.
- Implemented: ending states now include summaries and the play status panel shows a readable ending reason.

Acceptance:

- Endings are based on accumulated route state.
- The player can understand why the result happened.

## Stage 8: Polish and QA

Deliverables:

- Review UI with desktop and mobile screenshots.
- Check text overflow.
- Check keyboard and touch access.
- Check route state persistence.
- Check mock provider behavior.

Acceptance:

- The app feels like an AI galgame first.
- Existing workbench and pet-console modes still work.
