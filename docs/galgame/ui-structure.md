# Galgame UI Structure

The galgame interface should read as a stage first and a tool second. The player should know where to look without needing explanatory text.

## Screen Layers

1. Stage layer

The stage holds background, character standee or Live2D, atmosphere, and scene lighting. It carries mood, not controls.

2. Dialogue layer

The dialogue layer is the primary reading surface. It contains the speaker name, line text, and subtle route context.

3. Choice layer

Choices appear only when the current state supports a route decision. They should look like branch cards, not quick reply chips.

4. System layer

History, auto, skip, save, load, settings, scene picker, and mode selection live here. It should be available but visually quiet until opened.

5. Route status layer

The route status shows current phase and relationship state. It should feel like a chapter marker, not a debug panel.

## Priority

The visual priority should be:

1. Character
2. Current dialogue
3. Available choices
4. Route status
5. System controls

If a control competes with character art or dialogue text, it should be moved, dimmed, or hidden behind the system menu.

## Dialogue Box

The dialogue box should:

- Use comfortable reading size.
- Keep line height generous.
- Show speaker name clearly.
- Leave enough space for longer character lines.
- Avoid crowding with debug-like route data.

The speaker plate should carry identity. The route status should carry context.

## Choices

Choices should include:

- A stable index or icon.
- The main action text.
- A tone label such as `care`, `probe`, `comfort`, or `risk`.
- Optional lock state for unavailable choices in story mode.

Choice text should be written as player intent, not generic UI commands.

Good:

```text
Stay quiet and let her finish.
Ask what she was about to hide.
Tell her you will not force an answer.
```

Weak:

```text
Option 1
Continue
Ask more
```

## System Menu

The system menu should include:

- History
- Auto
- Skip read
- Skip text
- Save
- Load
- Hide dialogue
- Voice
- Mode
- Scene
- Atmosphere
- Settings

Default state should be compact. Expanded state can be denser because the player intentionally opened it.

## Mobile Rules

On mobile:

- Dialogue text stays readable before decorative effects.
- Choices become vertical full-width branch cards.
- System menu moves to bottom or compact overlay.
- No touch target should be smaller than 44px.
- Long text wraps instead of shrinking below comfortable reading size.

## Anti-patterns

- Controls permanently covering the character.
- Route data shown like a spreadsheet.
- Choices that look identical to normal buttons.
- Tiny text in the dialogue layer.
- Heavy glass effects that reduce text contrast.
- Always-visible tool panels that make the scene feel like an editor.
