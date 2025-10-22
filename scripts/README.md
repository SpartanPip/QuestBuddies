# Quest Buddies Development

## Quick Start

```bash
npm run dev:auto
```

This command will:

- Start all development watchers (client, server, devvit)
- Automatically deploy to Reddit when files change
- Use timestamp-based versioning to avoid conflicts
- Handle version updates automatically

## What it does

1. **Watches for changes** - Monitors your source files
2. **Builds automatically** - Compiles when files change
3. **Deploys automatically** - Uploads to Reddit with new version
4. **Prevents conflicts** - Uses unique timestamp versions

## Stopping

Press `Ctrl+C` to stop the development environment.

## Troubleshooting

If you get version conflicts, the script will automatically generate a new version and retry on the next build.
