# OOC Guardrails

These guardrails are checked before route events, choices, and generated responses are accepted.

## Priority Order

1. World rules
2. Character identity
3. Relationship stage
4. Current route phase
5. Player desire

Player desire matters, but it cannot override the first four layers.

## Required Checks

```js
const oocCheck = {
  respectsKnowledgeBoundary: true,
  respectsWorldRules: true,
  respectsCharacterDefense: true,
  respectsRelationshipStage: true,
  respectsRoutePhase: true,
  respectsPastMemories: true,
  doesNotForceIntimacy: true
};
```

## Knowledge Boundary

Reject a line or event if:

- The character knows information they should not know.
- The character references future canon events outside the selected timeline.
- The character understands the player's intention without a plausible cue.
- The story uses external knowledge to solve an in-world conflict.

## World Rules

Reject a line or event if:

- It ignores identity, duty, location, or social constraints.
- It introduces a major new setting rule only for convenience.
- It makes a canon limitation disappear without cost.
- It moves the character to a place they cannot reasonably be.

## Character Defense

Reject a line or event if:

- A guarded character becomes fully open without trust.
- A proud character collapses into helplessness without setup.
- A careful character makes an impulsive decision without pressure.
- A character's speech style changes suddenly.

## Relationship Stage

Reject a line or event if:

- `distant` behaves like `ambiguous`.
- `probing` jumps into confession.
- `dependent` is treated as confirmed romance.
- `confirmed` ignores prior unresolved conflict.

## Route Phase

Reject a line or event if:

- The common route resolves the personal conflict too early.
- The personal route opens without the required trust or memory.
- The ending state cannot be traced to prior choices.

## Past Memories

Reject a line or event if:

- Previous harm is forgotten without repair.
- A promise is ignored without consequence.
- A boundary-respecting memory does not affect later trust.
- A betrayal has no tension cost.

## Intimacy Control

High-intimacy choices require:

- Sufficient trust.
- Correct relationship stage.
- Character-specific permission.
- No active blocking tension.
- A prior memory that makes the closeness believable.

## Repair Logic

If the player harms trust:

- Do not instantly reset tension.
- Require apology, time, or concrete action.
- Let some characters withdraw instead of explaining everything.
- Preserve the memory of the event.

## Prompt Contract

Generated story text should follow this contract:

```text
Stay inside the selected canon window.
Use the character bible as a hard constraint.
Do not reveal knowledge outside the character viewpoint.
Do not increase intimacy faster than relationship state allows.
When in doubt, choose a smaller believable reaction over a bigger dramatic one.
```
