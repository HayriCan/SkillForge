# Contributing to Skill Forge

Thank you for your interest in contributing to Skill Forge! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Platform-specific Tauri dependencies: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Getting Started

```bash
git clone https://github.com/HayriCan/skill-forge.git
cd skill-forge
npm install
npm run tauri dev
```

## Making Changes

### Branch Naming

Create a feature branch from `main`:

```bash
git checkout -b feat/your-feature-name
```

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use |
|--------|-----|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or updating tests |
| `chore:` | Build process, CI, or tooling changes |

Examples:

```
feat: add profile export as JSON
fix: prevent crash when .claude dir is missing
docs: update MCP server setup guide
```

### Code Style

- **TypeScript** with strict mode
- **Svelte 5** runes syntax (`$state`, `$derived`, `$effect`)
- **Tailwind CSS v4** for styling
- Run `npm run check` before committing to catch type errors

## Pull Request Process

1. **Ensure your code compiles**: Run `npm run check` and fix any errors.
2. **Test your changes**: Run the app with `npm run tauri dev` and verify your feature works.
3. **Write a clear PR description**: Explain what changed and why.
4. **Include screenshots**: For any UI changes, attach before/after screenshots.
5. **Keep PRs focused**: One feature or fix per PR.

### PR Checklist

- [ ] `npm run check` passes
- [ ] Tested manually in the app
- [ ] Screenshots attached (for UI changes)
- [ ] Commit messages follow conventional commits

## Reporting Bugs

Use the [bug report template](https://github.com/HayriCan/skill-forge/issues/new?template=bug_report.md) to file issues. Include:

- Steps to reproduce
- Expected vs actual behavior
- Your OS and Skill Forge version

## Suggesting Features

Use the [feature request template](https://github.com/HayriCan/skill-forge/issues/new?template=feature_request.md) to propose new features.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
