# Architecture Decision Records

An ADR captures a significant design decision, the context that drove it,
and its known tradeoffs — so it doesn't get silently relitigated or
"fixed" by someone who wasn't there for the original reasoning. These are
short and status-tracked, not a design essay; see
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for how the pieces they describe
fit into the system as a whole, and [`FEATURES.md`](../FEATURES.md) for
current behavior.

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](./0001-thunderid-as-sole-identity-provider.md) | ThunderID as the sole identity provider | Accepted |
| [0002](./0002-in-app-position-layer.md) | In-app position/hierarchy layer instead of new IDP roles | Accepted |
| [0003](./0003-single-current-academic-year.md) | Single school, single current academic year per deployment | Accepted |
| [0004](./0004-in-app-only-notifications.md) | In-app-only notifications (no email/SMS channel) | Accepted |
| [0005](./0005-hand-rolled-password-reset.md) | Hand-rolled password lifecycle (no IDP primitive) | Accepted, known weakness |

## Adding a new ADR

Copy the format of an existing one: **Status**, **Context**, **Decision**,
**Consequences**. Number sequentially, never renumber or delete a
superseded record — mark its status `Superseded by NNNN` instead and add
the new one.
