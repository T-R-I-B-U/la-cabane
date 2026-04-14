# Claude Code Skills Cheat Sheet

Quick reference for all project skills available in `.claude/skills/`.

## Quick usage

- Show available skills in Claude Code: `/skills`
- Run a skill: `/skill-name` or `/skill-name argument`
- `on`: Claude can auto-invoke it (you can also run it manually)
- `user-only` (`Locked by author`): manual only (Claude will not auto-run it)

## Recommended workflow (token-efficient)

1. `/context-minifier <task>`
2. `/file-targeting <task>`
3. `/minimal-change-plan <task>`
4. implement
5. `/verification-plan <change summary>`
6. `/quality-gate`
7. `/commit-helper`

## Wave 1 - Foundations

- `/feature-kickoff` - turn a feature idea into an implementation plan
- `/file-targeting` - find the smallest relevant file set
- `/minimal-change-plan` - define a minimal diff before editing
- `/scope-lock` - prevent scope creep
- `/context-minifier` - compress useful context
- `/verification-plan` - define minimal validation steps
- `/repo-map` - map repository structure and commands
- `/impact-analysis` - estimate impact and regression risk

## Wave 2 - Code quality

- `/quality-gate` - lint + build + quality verdict
- `/pre-commit-check` - pre-commit checks
- `/lint-fix-pass` - targeted lint fix pass
- `/build-failure-debug` - diagnose build failures
- `/small-refactor` - small refactor with no behavior change
- `/dead-code-cleanup` - remove unused code/imports
- `/error-handling-audit` - audit error handling quality
- `/boundary-validation` - validate runtime boundaries

## Wave 3 - Three.js core

- `/scene-audit` - audit scene architecture and lifecycle
- `/three-debug` - structured Three.js debugging
- `/entity-scaffold` - scaffold an entity in `src/world/entities`
- `/loader-debug` - debug model/texture/audio loading
- `/asset-path-check` - verify asset paths
- `/animation-loop-audit` - audit update loop and delta usage
- `/cleanup-leaks` - clean up resource and listener leaks
- `/world-orchestration-check` - validate world/entity orchestration

## Wave 4 - Three.js advanced

- `/render-perf-check` - rendering performance audit
- `/material-review` - material consistency/reuse/cost review
- `/interaction-debug` - debug interaction and raycasting
- `/draco-readiness` - Draco integration readiness checklist
- `/arch-guard` - architecture guardrails
- `/where-to-place-code` - decide the best target path
- `/naming-check` - naming convention validation
- `/risk-scan` - risk scan with mitigations

## Wave 5 - UI / UX

- `/ui-overlay-guard` - enforce React overlay vs engine separation
- `/a11y-pass` - targeted accessibility pass
- `/responsive-pass` - responsive desktop/mobile pass
- `/css-variables-audit` - CSS variables audit
- `/motion-pass` - meaningful motion and animation pass
- `/ui-copy-polish` - improve UI micro-copy
- `/onboarding-dev` - developer onboarding brief
- `/code-explain` - concise explanation of code/files

## Wave 6 - Git / PR

- `/branch-helper` - propose compliant branch names
- `/commit-helper` - draft English conventional commit message
- `/pr-draft` - draft PR title and body
- `/pr-review-checklist` - PR review checklist
- `/review-response` - draft review comment responses
- `/diff-explain` - explain a diff clearly
- `/release-note` - draft release notes
- `/changelog-entry` - draft changelog entry

## Wave 7 - Docs / handoff

- `/readme-sync` - sync README with current repo state
- `/agents-sync` - sync AGENTS.md with current workflow
- `/decision-record` - document architecture decisions
- `/troubleshooting-note` - write reusable troubleshooting notes
- `/handoff-note` - write a developer handoff note
- `/ask-better` - rewrite prompts for better precision
- `/fallback-options` - produce A/B/C fallback plans
- `/stop-at-mvp` - enforce MVP-first scope

## Practical tips

- Use `user-only` skills for sensitive operations you want to control.
- Keep prompts short and explicit for better output quality.
- When in doubt, start with `/file-targeting` then `/minimal-change-plan`.
