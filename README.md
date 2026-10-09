# RSC Demo — Personal Blog (React Server Components)

A learning project for React Server Components (Next.js 14 App Router) + TypeScript.

## Requirements

- [Node.js](https://nodejs.org/) installed (latest LTS recommended).
- After cloning/downloading the project, install dependencies:

```bash
npm install
```

## How to run

### 1. Run dev (for active development)

```bash
npm run dev
```

- Has hot reload — edits show up immediately, no restart needed.
- Opens by default at: http://localhost:3001 (port comes from the `.env.local` file, see below).

### 2. Run production (simulates a real build, for checking before deploy)

You must build first, since Next.js needs to pre-compile into the `.next` directory:

```bash
npm run build
npm run start
```

Running `npm run start` without `npm run build` first will fail with:
`Could not find a production build in the '.next' directory`.

| Command | When to use it | Needs a build first? |
|---|---|---|
| `npm run dev` | Active development, needs hot reload | No |
| `npm run build` | Package the production bundle | — |
| `npm run start` | Try out the production build (after building) | Yes |

## Changing the port

The port is configured in [.env.local](.env.local):

```
PORT=3001
```

Change this number if it conflicts with another app already running on your machine, then re-run `npm run dev`/`npm run start`. No need to edit `package.json`.

> Why put it in `.env.local` instead of editing `package.json` directly? Because `.env.local` is the standard place to hold environment variables (port, API keys, database URL, etc.), kept separate from code — later, when AI features are added (see `lib/ai/`) and need an API key, it will also be declared here.

## Folder structure (summary)

- `app/` — routing, pages (Server Components), calling into `lib/data/` to fetch data.
- `components/` — shared UI. Only components that need interactivity (`useState`, `onClick`, etc.) are marked `"use client"`.
- `lib/data/` — data access layer (currently an in-memory fake).
- `lib/ai/` — (not created yet) will hold AI-related code later.
- `types/` — shared TypeScript types.

See more architecture details in [CLAUDE.md](CLAUDE.md).
