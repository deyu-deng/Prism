# VETO-003 — Verify/Check Mode for `plobi-scaffold`

## Status

Permanently rejected.

## Date

2026-05-20

## Proposal

Add a dedicated verify/check mode (or a separate verify skill) for `plobi-scaffold` to check whether `docs/agents/*.md` artifacts still match the seed-template schema.

## Rationale for Rejection

A second skill — or a `--verify` flag — would duplicate work the existing scaffold skill already handles in conversation.

The intended workflow is: **run `/plobi-scaffold` and tell it to verify your current setup.** The skill is prompt-driven, so the maintainer can scope it to a verification pass ("don't rewrite anything, just check my existing files against the current seed templates and report drift") without needing a separate code path. Adding a flag or a sibling skill would split the surface area of a feature that's already expressible through the natural-language entry point.

Keeping configuration management to a single skill also avoids the maintenance cost of two skills drifting from each other when seed templates evolve.

## Prior Requests

- #106 — Feature request: verify/check mode for plobi-scaffold
