# Things

My own task management app **inspired** by Things, built with TanStack Start, Drizzle and React.

This is vibecoded so use at your own risk. I built it and self-hosted it for my own personal use.

## Why?

Things is pretty much perfect and I have used it for more than a decade.
But it only runs in Apple devices, as I move into Linux I always dreamt of a
Web version plus a CLI and API to build integrations.
So I vibecoded this one.

## Setup

```bash
cp .env.example .env
bun install
bun run db:push
bun run db:seed     # Optional
bun run dev
```

## Configuration

Database path defaults to `./data/things.db`. Override with:

```bash
DATABASE_URL=./data/my-things.db
```

## CLI Setup

The CLI allows you to interact with Things from the command line. To use it:

1. Start the web server (`bun run dev`)
2. Log in and go to Settings > API Keys
3. Create a new API key with "Read & Write" scope
4. Set the environment variables:

```bash
export THINGS_API_KEY=sk_live_...
export THINGS_API_BASE_URL=http://localhost:3000/api  # Optional, defaults to this
```

5. Use the CLI:

```bash
bun run cli add "Buy groceries"
bun run cli list today
bun run cli complete <task-id>
```

## Docker

```bash
docker build -t things .
docker run -p 3000:3000 -v things-data:/data things
```

## Contributions

Welcome but since its a personal project I might not accept all PRs.
AI contrinutions are welcome since i dont even know about this code. Whatever forever.

## Disclaimer

This has nothing to do with Things or CulturedCode.
