# Human Hook

![Human Hook](assets/logo.png)

A skill + hook system that verifies developer understanding before AI-generated code leaves their machine.

AI coding agents write and commit code fast. Human Hook adds one intentional checkpoint: before `git push`, it asks the developer 2–3 questions about the outgoing changes — architectural intent, integration points, trade-offs — and only allows the push if they can demonstrate genuine understanding. No checkbox, no quiz. A short conversation.

## How it works

```
Developer says "push" →
  Editor hook fires →
    check-verification.sh checks for a valid receipt →
      No receipt? Hook blocks, agent starts verification conversation →
        Developer answers questions →
          Pass → receipt written → push retried and allowed
          Fail → agent explains gaps → developer reviews and retries
```

The verification receipt is a SHA-256 hash of the outgoing diff. If new commits are made after verification, the hash no longer matches and re-verification is required.

## Installation

### 1. Install the skill

```bash
npx skills add arielbk/human-hook
```

This installs the skill into your editor's skills directory. The skill handles the rest — on first use it detects your editor (Cursor, Claude Code, or both) and runs setup automatically.

### 2. That's it

Tell the agent to push. If setup hasn't run yet, the skill will run it. The hook gets installed, and from that point on every `git push` through the agent is gated.

**To skip verification for a single push** (emergencies only):

```bash
HUMAN_HOOK_OVERRIDE=1 git push
```

Or tell the agent: *"Use the override and push."*

## Configuration

After first use, `.human-hook/config.json` appears in your project. Commit it to share settings with your team.

```json
{
  "triggers": ["push"],
  "trivial_threshold": {
    "max_lines": 5,
    "ignore_patterns": [
      "*.lock",
      "*.lockb",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "*.generated.*"
    ]
  },
  "override_env_var": "HUMAN_HOOK_OVERRIDE"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `triggers` | `["push"]` | Commands that trigger verification. Add `"commit"` to also gate commits. |
| `trivial_threshold.max_lines` | `5` | Changes below this line count skip verification. |
| `trivial_threshold.ignore_patterns` | lockfiles, generated files | Files matching these patterns are always considered trivial. |
| `override_env_var` | `HUMAN_HOOK_OVERRIDE` | Environment variable that bypasses verification when set. |

See `skill/references/.human-hook.config.example.json` for a copy of the defaults.

## What gets verified

The agent evaluates understanding across three areas:

- **Architectural intent** — Why does this change exist? Why this approach over alternatives?
- **Integration awareness** — What other parts of the system does this touch? What consumers are affected?
- **Trade-off consciousness** — What could go wrong? What are the performance, security, or maintainability implications?

Questions are generated from the actual diff — not generic questions that could apply to any codebase.

A pass requires demonstrating understanding across all three areas. Honest gaps with self-awareness are acceptable; the goal is genuine engagement, not perfection.

See `skill/references/verification-guide.md` for detailed evaluation criteria and examples.

## Compatibility

| | Cursor | Claude Code |
|--|--------|-------------|
| Hook config | `.cursor/hooks.json` | `.claude/settings.json` |
| Hook event | `beforeShellExecution` | `PreToolUse` (Bash) |
| Input format | `{ "command": "..." }` | `{ "tool_input": { "command": "..." } }` |

A single `SKILL.md` works in both editors without modification.

## Repository structure

```
human-hook/
├── assets/
│   └── logo.png
├── docs/                             # PRD and technical spec
├── README.md
└── skill/                            # Everything bundled by npx skills add
    ├── SKILL.md                      # Skill definition (Cursor + Claude Code)
    ├── scripts/
    │   ├── setup.sh                  # Installs hooks for detected editors
    │   └── check-verification.sh    # Hook script — receipt validation
    └── references/
        ├── verification-guide.md    # Evaluation criteria and examples
        └── .human-hook.config.example.json
```
