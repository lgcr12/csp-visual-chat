# Route State Spec

Route state is the shared data model for modes, choices, memories, route progress, and endings.

## Core Shape

```js
const routeState = {
  routePhase: "common",
  relationshipStage: "distant",
  affection: 0,
  trust: 0,
  intimacy: 0,
  tension: 0,
  honesty: 0,
  flags: {},
  memories: [],
  currentScene: null,
  gameplayMode: "hybrid",
  unlockedEndings: []
};
```

## Fields

`routePhase`

Current route phase: `common`, `personal`, or `ending`.

`relationshipStage`

Current relationship stage: `distant`, `probing`, `dependent`, `ambiguous`, or `confirmed`.

`affection`

Emotional warmth. This is not trust.

`trust`

Whether the character believes the player is safe, reliable, or sincere.

`intimacy`

Closeness. This must not grow faster than trust for guarded characters.

`tension`

Conflict, pressure, misunderstanding, or emotional risk.

`honesty`

Willingness to face the real issue directly.

`flags`

Boolean or counted route facts.

`memories`

Relationship-significant events.

`currentScene`

The active story event, if any.

`gameplayMode`

`free`, `story`, or `hybrid`.

`unlockedEndings`

Ending states that are currently possible.

## Relationship Stage Rules

Example thresholds:

```js
if (trust >= 25 && affection >= 20 && tension < 35) {
  relationshipStage = "probing";
}

if (trust >= 50 && affection >= 45 && hasFlag("shared_private_moment")) {
  relationshipStage = "dependent";
}

if (trust >= 65 && intimacy >= 55 && honesty >= 45 && tension < 50) {
  relationshipStage = "ambiguous";
}

if (
  trust >= 80 &&
  intimacy >= 75 &&
  honesty >= 70 &&
  hasFlag("personal_conflict_resolved")
) {
  relationshipStage = "confirmed";
}
```

These values are starting points. Each character bible can make them stricter.

## Choice Shape

```js
const choice = {
  label: "Tell her you will not force an answer.",
  tone: "boundary-care",
  modes: ["story", "hybrid"],
  conditions: {
    routePhase: ["personal"],
    relationshipStage: ["dependent", "ambiguous"],
    minTrust: 45,
    maxTension: 60,
    requiredFlags: ["avoided_topic_once"],
    blockedFlags: ["asked_too_directly_before"]
  },
  effects: {
    affection: 2,
    trust: 4,
    intimacy: 1,
    tension: -2,
    honesty: 3,
    flags: ["invited_honesty"]
  },
  reason: "The player has already respected her boundary once."
};
```

## Choice Types

- `baseline`: always available to keep the route moving.
- `progress`: advances trust or route phase.
- `risk`: can unlock deeper scenes but raises tension.
- `hidden`: appears only after specific flags or memories.

## Memory Shape

```js
const memory = {
  id: "player_respected_boundary",
  title: "The player did not keep pressing.",
  type: "boundary",
  sceneId: "rain_room_01",
  emotionalMeaning: "She confirmed the player will not force her to answer.",
  effects: {
    trust: 6,
    tension: -4
  }
};
```

## Memory Types

- `boundary`
- `comfort`
- `conflict`
- `promise`
- `secret`
- `turning_point`

## Ending Rules

`distant_reserved`

```js
trust < 45 || tension >= 75
```

`trust_established`

```js
trust >= 60 && honesty >= 45 && intimacy < 55
```

`ambiguous_stay`

```js
trust >= 65 && intimacy >= 55 && honesty < 70
```

`confirmed_bond`

```js
trust >= 80 &&
intimacy >= 75 &&
honesty >= 70 &&
hasFlag("personal_conflict_resolved")
```

`costly_closeness`

```js
trust >= 70 &&
intimacy >= 65 &&
tension >= 65 &&
hasFlag("chose_costly_truth")
```

## First Implementation Scope

Start with:

- `routePhase`
- `relationshipStage`
- `gameplayMode`
- `affection`
- `trust`
- `intimacy`
- `tension`
- `flags`
- `memories`

Add `honesty` and formal ending unlocks after the first working version.
