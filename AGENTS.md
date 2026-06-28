# Repository Guidelines

## Project Structure & Module Organization
`stellar-space` is a browser Vite app with main runtime code under `src/`.

- `src/ai`, `src/core`, `src/world`, `src/systems`, `src/tools`, `src/ui`, `src/overlays`, `src/multiplayer`, `src/supabase`, `src/utils`, `src/audio`: main feature modules
- `src/styles`: global styles plus component/overlay CSS modules
- `public/`: static assets
- `supabase/`: init SQL and Supabase client configs
- `dist/`: generated production build output
- Root files: `package.json`, `vite.config.js`, `.env.example`, `SUPABASE_SETUP.md`, `.github/workflows/deploy.yml`

## Build, Test, and Development Commands
- `npm install`: install dependencies for local development
- `npm run dev`: start Vite dev server (served with host enabled on port `3000` in Vite config)
- `npm run build`: production build into `dist/`
- `npm run preview`: preview built app locally
- `npm ci`: clean, lockfile-based install used by CI

## Coding Style & Naming Conventions
- JavaScript style is ES modules (`type: module`) with 2-space indentation and semicolons.
- Naming: `camelCase` for variables/functions, `PascalCase` for classes, file names generally in `PascalCase.js` for major modules and `kebab-case.css` for styles.
- Keep imports grouped by domain (core/world/audio/UI/etc.) and reuse existing utility/helper modules before introducing new dependencies.
- No repo-level formatter/linter command is defined yet; keep changes consistent with existing files and avoid broad style reformatting.

## Testing Guidelines
- No automated test script is configured currently (`package.json` has no `test`/`lint` scripts).
- For validation, run `npm run build` and manually smoke-test locally with `npm run dev`.
- For new features, add targeted tests in `src/**` and a test script before expanding QA (e.g., Vitest/Jest pattern: `*.test.js` or `*.spec.js`).
- Always verify shared-data and AI/overlay interactions manually after UI or multiplayer changes.

## Commit & Pull Request Guidelines
- Existing commit history uses concise Conventional Commit-style prefixes, especially `feat:` and `security:`, followed by short Chinese/English summaries.
- Recommended format: `<type>(scope): <short imperative description>`, e.g., `feat(world): add minimap interaction`.
- PRs should include:
  - summary of behavior changes and affected folders/files
  - manual verification steps and results
  - screenshots for visual behavior changes
  - migration notes if backend data/config changes

## Security & Configuration Tips
- Copy `.env.example` → `.env.local` for local development; never commit secrets.
- Keep Supabase credentials in env vars and GitHub Actions secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_BUCKET`).
- `ALBUM_PASSWORD` is hashed at build time in `vite.config.js` and `src/main.js` consumes the hash constant; avoid hardcoding secrets in code.
