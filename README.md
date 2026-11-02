# Nova Launcher

Custom Minecraft launcher with themes, mini-games, Sparks economy, streamer mode, and more.

**Version:** 1.0.6

## Download

- **Windows installer:** see [Releases](https://github.com/ren1ro/nova-launcher/releases) (`setup.exe`)
- **Source code:** this repository

## Features

- Custom UI (not the original Modrinth window)
- Themes (built-in + custom) and custom sidebar icons
- Live backgrounds & seasonal themes
- Streamer mode
- Sparks currency, shop, achievements
- Mini-games: Tetris, Snake, Minesweeper
- Instance library, Modrinth catalog, Microsoft login (via Theseus)
- AI tab (ChatGPT, Grok, Gemini, DeepSeek in-app)

## Credits / Based on

Nova Launcher is built on the open-source **Modrinth App** (Theseus) core.

- Official Modrinth App: https://modrinth.com/app
- Upstream source: https://github.com/modrinth/code

Custom UI, themes, Sparks, mini-games and extra features are part of Nova.

## Development

Development was assisted by **Grok** (xAI) — help with UI features, fixes, and optimization.

## Build from source

### Requirements

- Node.js 20+
- pnpm
- Rust (rustup)
- Windows: Visual Studio Build Tools (C++)

### Steps

```bash
pnpm install
powershell -ExecutionPolicy Bypass -File .\build-windows.ps1
