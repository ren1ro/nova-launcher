# Nova Launcher

Custom Minecraft launcher with themes, mini-games, Sparks economy, streamer mode, and more.

**Version:** 1.0.0

## Download

- **Windows installer:** (setup.exe)
- **Source code:** this repository

## Features

- Custom UI (not the original Modrinth window)
- Themes (built-in + custom)
- Live backgrounds & seasonal themes
- Streamer mode
- Sparks currency, shop, achievements
- Mini-games: Tetris, Snake, Minesweeper
- Instance library, Modrinth catalog, Microsoft login (via Theseus)

## Credits / Based on

Nova Launcher is built on the open-source **Modrinth App** (Theseus) core.

- Official Modrinth App: https://modrinth.com/app
- Upstream source: https://github.com/modrinth/code

Custom UI, themes, Sparks economy, mini-games and extra features are part of Nova.

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
