# Gameplay Modes

The project should support three modes. They share the same route state, memories, and character guardrails.

## Free Chat Mode

Free chat mode keeps the AI companion feeling strongest.

Player experience:

- The player types freely.
- The character responds in voice and behavior.
- Relationship variables change slowly.
- Story events appear rarely.

Best for:

- Daily companionship.
- Low-pressure character interaction.
- Slow relationship building.

State behavior:

- Small changes to affection, trust, intimacy, tension, and honesty.
- Strong emphasis on memories.
- Choices appear only when a route event is naturally triggered.

## Story Mode

Story mode behaves closest to a traditional visual novel.

Player experience:

- The system presents scene events.
- The player advances text and makes choices.
- Route branches and chapter progression are explicit.
- Save, load, history, auto, and skip become central.

Best for:

- Personal route events.
- Key emotional scenes.
- Ending progression.

State behavior:

- Uses `currentScene`.
- Choices have stronger effects.
- Route phase can move from `common` to `personal` to `ending`.
- Scene exits write memories and flags.

## Hybrid Mode

Hybrid mode should be the default.

Player experience:

- Normal interaction feels like free chat.
- When route state supports it, the app enters a story event.
- During an event, the UI behaves like a visual novel.
- After the event resolves, the player returns to free chat.

Best for:

- AI galgame as a product.
- Keeping both freedom and route structure.
- Letting the player feel that choices came from prior conversation.

State behavior:

```js
if (
  routePhase === "common" &&
  trust >= 30 &&
  affection >= 25 &&
  hasMemory("player_respected_boundary")
) {
  offerScene("first_private_scene");
}
```

## Mode Selection

The player should be able to switch modes from the system menu:

- `Free`: fewer route prompts, more open chat.
- `Story`: stronger scene guidance and more choices.
- `Hybrid`: automatic switching between chat and route events.

Changing mode should not reset route state.

## Mode-specific Choice Frequency

Free chat:

- Low frequency.
- Mostly soft choices.

Story mode:

- High frequency.
- Formal branch choices.

Hybrid mode:

- Medium frequency.
- Higher frequency inside route events.

## Shared Invariants

All modes must obey:

- Character knowledge boundaries.
- Relationship stage limits.
- Original world constraints.
- Past memory consequences.
- Route phase requirements.
