# Contributing

## Development Workflow

1. Fork the repository and clone your fork
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes and test locally with `npm run dev`
4. Ensure the build passes:
   ```bash
   npm run build
   ```
5. Commit with a descriptive message (see conventions below)
6. Push your branch and open a Pull Request

## Branch Naming

| Prefix | Use |
|---|---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `chore/` | Dependency updates, config changes |
| `refactor/` | Code restructuring without behavior change |

## Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description

Optional longer explanation.
```

Examples:
```
feat(canvas): add eraser tool for annotations
fix(auth): handle expired session redirect loop
docs(readme): update setup instructions for storage bucket
chore(deps): bump next to 16.2.0
```

## Code Guidelines

- Use TypeScript for all new files
- Follow the existing component structure (`components/admin/`, `components/dashboard/`, etc.)
- Use shadcn/ui primitives for UI elements
- Keep Supabase queries in the component that needs the data (no separate API layer currently)
- Wrap all async operations in try/catch with user-facing error messages

## Pull Requests

- Fill out the PR template
- Keep PRs focused — one feature or fix per PR
- Include screenshots for UI changes
- Make sure `npm run build` passes before requesting review
