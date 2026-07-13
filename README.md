# solo-skills

**One problem. One skill.**

A community collection of focused [Agent Skills](https://agentskills.io) — small, portable capabilities that each solve exactly one problem well. No kitchen-sink mega-skills, no vague catch-alls. Every skill in this repo does one thing, does it reliably, and stays out of the way otherwise.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Agent Skills](https://img.shields.io/badge/format-SKILL.md-5B3FA8.svg)](https://agentskills.io)

---

## What is this?

An **Agent Skill** is a folder with a `SKILL.md` file — instructions, metadata, and optional scripts/references — that an AI agent loads *on demand* when a task matches the skill's description. The format started as Anthropic's SKILL.md for Claude Code and is now an open standard adopted across Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot, and more. A skill written once works across all of them.

`solo-skills` is a curated, open-source set of these, held to one rule: **each skill solves a single, well-scoped problem.**

## Why single-problem skills?

- **They trigger reliably.** An agent decides whether to load a skill from its description alone. Narrow scope = a sharp, unambiguous description = it fires when it should and stays quiet when it shouldn't.
- **They compose.** Small skills stack. A big skill that tries to do five things fights with everything around it.
- **They're easy to review, test, and trust.** One problem is one thing to verify.

## Repository structure

```
solo-skills/
├── README.md              # you are here
├── LICENSE                # MIT
├── CONTRIBUTING.md        # quality bar + how to add a skill
├── .claude-plugin/
│   └── marketplace.json   # lets Claude Code install these as a plugin
└── skills/
    ├── example-skill/
    │   ├── SKILL.md        # required: frontmatter + instructions
    │   ├── scripts/        # optional: code the agent runs
    │   ├── references/     # optional: docs loaded only when needed
    │   └── assets/         # optional: templates, examples
    └── .../
```

## Installing & using

### Claude Code (plugin marketplace)

```bash
/plugin marketplace add <your-github-username>/solo-skills
/plugin install <skill-or-bundle>@solo-skills
```

Then just mention what you want — e.g. *"Use the peppol-validator skill on invoice.xml"*.

### Manual (any project)

Copy a skill folder into your project's skills directory:

```bash
cp -r skills/example-skill /path/to/project/.claude/skills/
```

Personal skills live in `~/.claude/skills/`; project skills are checked into the repo under `.claude/skills/`.

### Other agents

Because these follow the open SKILL.md standard, they also drop into Codex CLI (`~/.codex/skills`), Cursor, Gemini CLI, and other compatible tools. See each tool's docs for where it looks for skills.

## Skills index

| Skill | Solves | Trigger phrases |
|-------|--------|-----------------|
| `example-skill` | _one clearly-scoped problem_ | _"do X", "handle Y"_ |
| _your skill here_ | _..._ | _..._ |

> Keep this table current — every merged skill gets a row.

## Contributing

Contributions are welcome and encouraged. The bar is simple but strict:

1. **One problem per skill.** If your skill has "and" in its purpose, split it.
2. **Nail the description.** The `description:` field is the *only* thing an agent reads to decide whether to load your skill. Write it in terms of **when to use it** and include realistic trigger phrases. This is the single most important part of a good skill.
3. **Earn your place.** A skill should make the agent meaningfully better at something it does poorly without it.
4. **Test it on real tasks** before opening a PR.

### How to add a skill

```bash
# 1. Fork & clone
git clone https://github.com/<you>/solo-skills.git

# 2. Scaffold a folder
mkdir -p skills/my-skill

# 3. Write skills/my-skill/SKILL.md
#    --- frontmatter ---
#    name: my-skill
#    description: <what it does + when to use it + trigger keywords>
#    --- markdown body: the instructions ---

# 4. Add a row to the Skills index table in this README

# 5. Open a PR
```

**PR checklist**
- [ ] Skill solves exactly one problem
- [ ] `SKILL.md` has valid frontmatter (`name`, `description`)
- [ ] Description states *when to use it* + trigger phrases
- [ ] SKILL.md stays lean; heavy detail pushed into `references/`
- [ ] Tested on at least one real task
- [ ] Added to the Skills index in the README

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## License

[MIT](./LICENSE) — free to use, modify, and redistribute. Contributions are accepted under the same license.

---

_Built on the open [Agent Skills](https://agentskills.io) standard._
