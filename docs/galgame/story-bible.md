# Story Bible

The story system exists to make route progress feel earned. It should not force romance, intimacy, conflict, or endings before the character and world can support them.

## Product Position

CSP Visual Chat is an AI galgame:

- Playable through free conversation.
- Guided by visual novel style route events.
- Protected by character and world constraints.
- Able to reach ending states that can be explained by prior choices.

## World Layer

Every route must define:

- Timeline: when this takes place relative to canon.
- Location pool: where scenes can reasonably happen.
- Identity rules: who the character is at this point.
- Relationship defaults: how the player is allowed to know them.
- Knowledge boundaries: what the character knows or does not know.
- Risk rules: what actions carry cost or are impossible.

World rules outrank plot convenience.

## Route Structure

Each character route has three phases:

- `common`
- `personal`
- `ending`

## Common Route

The common route establishes the basic relationship and world context.

It should:

- Introduce the current scene and emotional temperature.
- Show the character's ordinary defense style.
- Let the player earn initial trust.
- Seed the personal conflict without resolving it.

It should avoid:

- Immediate high intimacy.
- Sudden confession.
- Deep trauma reveal without trust.
- Treating the player as more important than canon supports.

## Personal Route

The personal route opens the character's specific conflict.

Common drivers:

- Responsibility versus desire.
- Pride versus dependence.
- Past wound versus current closeness.
- Public role versus private feeling.
- Canon loyalty versus new interaction.

The personal route should make the character's old coping pattern insufficient, but not erase it.

## Ending State

Endings are relationship states, not just score results.

Base endings:

- `distant_reserved`: they understand each other more, but stay apart.
- `trust_established`: stable trust exists, but intimacy stays limited.
- `ambiguous_stay`: affection is real, but not fully confirmed.
- `confirmed_bond`: both sides acknowledge the relationship.

Optional endings:

- `missed_chance`
- `costly_closeness`
- `unspoken_mutuality`
- `protective_distance`

## Narrative Units

The system should think in units larger than individual replies:

- `daily_fragment`
- `scene_event`
- `relationship_node`
- `route_node`
- `ending_node`

Daily fragments build texture. Scene events create a clear location and goal. Relationship nodes change distance. Route nodes decide direction. Ending nodes explain the accumulated result.

## Relationship Stages

Use five stages:

- `distant`
- `probing`
- `dependent`
- `ambiguous`
- `confirmed`

Upgrades should require both numeric thresholds and story flags. Intimacy cannot bypass trust. Confirmation cannot bypass the personal conflict.

## Conditional Choices

Every important choice should define:

- World conditions.
- Character conditions.
- Relationship conditions.
- Memory conditions.
- Route conditions.

Choices should be player intent, not UI labels.

## Writing Ban List

Do not:

- Lower a character's guard just to accelerate romance.
- Skip trust building for sweetness.
- Use sudden contradiction as a cheap twist.
- Ignore canon identity, duty, or world rules.
- Replace actual relationship change with score changes.
- Let every route become the same romance pattern.
