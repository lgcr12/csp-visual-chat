# Changelog

## 2026-06-09 - Galgame Route System Upgrade

This update turns CSP Visual Chat from a chat-first interface into a playable AI galgame prototype.

### Added

- Galgame gameplay modes: `free`, `story`, and `hybrid`.
- Route phases: `common`, `personal`, and `ending`.
- Relationship stages: `distant`, `probing`, `dependent`, `ambiguous`, and `confirmed`.
- Conditional route choices with flags, memories, tension, honesty, trust, intimacy, and route phase checks.
- Character-specific Story Bible drafts for `warm`, `tsundere`, `mystery`, `brave`, and `default` route templates.
- Semi-specialized route events per character template.
- Body-level Galgame choice layer with transparent VN-style cards.
- Click-only glass `MENU` control for the Galgame stage.
- Story Bible editor and draft API.

### Changed

- Galgame dialogue now uses a lighter glass style with fewer nested frames.
- The route prompt now injects Story Bible constraints, OOC guardrails, route state, memories, and current scene context.
- Choice generation now analyzes the assistant reply content before showing options.
- `normal` choice frequency no longer shows choices after almost every reply.
- Existing characters receive a generated Story Bible draft at API read time if they do not already have one.

### Fixed

- Fixed menu overlap and hover flicker by making the Galgame menu click-driven.
- Fixed central choice placement by moving route choices to a body-level overlay.
- Fixed dialogue box drifting to the right by locking the Galgame viewport and centering the dialogue shell.
- Fixed route choices being too generic by adding context-specific options.

### Notes

- `data/sessions.json` is runtime chat data and should generally not be included in product commits.
- Screenshots in `docs/assets/screenshots` are documentation SVG captures of the current product direction.
