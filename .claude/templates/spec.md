# Spec: <feature>

<!-- Written by the planner to docs/specs/<feature>.md. The user approves it before any task is written.
Delete the comments when filling it in. -->

Status: draft | approved by the user on <date> · Roadmap: phase <B–E>, sprint <#> · Author: planner

## Problem
What the reader or the owner can't do today, in 2–4 sentences.

## Research
- What exists in the code: files, functions, patterns to reuse (`path:line`).
- Outside sources consulted (docs, articles), with links, and what they changed in the plan.

## Options
| Option | How | Cost | Risk |
|---|---|---|---|
| A | | | |
| B | | | |

Recommendation: <A/B> because …

## Questions for the user
1. A question whose answer changes the plan, with the planner's default.

A plan that goes against an entry in `docs/decisions.md` names it here (`D-<n>`) and asks.

## Scope
- In: …
- Out (deferred): …

## Acceptance criteria
- AC1: observable behaviour, testable (who does what, what they see).
- AC2: …
- ACn: essential content works without JavaScript (when the feature renders content).

## Sprint split
| Sprint | Branch | Scope | Owners |
|---|---|---|---|
| <#> | `feat/<name>` | | developer, tester, reviewer |
