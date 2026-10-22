# Tetris Arcade — Sci-Fi HUD Edition

A browser-based **Tetris** arcade game built with vanilla **HTML5**, **CSS3**, and **JavaScript (ES6+)** with zero external dependencies. Features a custom cyberpunk/space HUD interface, 7-bag piece randomizer, ghost landing indicator, hold queue, combo/back-to-back scoring, and synthesized Web Audio sound effects.

## Project Structure

```text
├── index.html   # Game layout, HUD structure, and semantic controls
├── style.css    # Responsive cyberpunk sci-fi HUD styling and animations
├── script.js    # Core 10x20 Tetris engine, collision/rotation, and Web Audio SFX
├── LICENSE      # MIT License
└── README.md    # Project documentation
```

## Features

- **Authentic 10×20 Grid & 7-Bag Randomizer**: Fair tetromino distribution across all 7 standard pieces (`I`, `J`, `L`, `O`, `S`, `T`, `Z`).
- **Hold & 3-Piece Next Queue**: Swap awkward pieces using `C` or `Shift` and plan ahead with a 3-piece preview.
- **Ghost Piece Guide**: Toggleable landing outline (`G` or top bar button) showing exact drop placement.
- **Wall Kicks & Smooth Rotation**: Rotate clockwise (`Space`, `Up Arrow`, `W`, `X`) or counter-clockwise (`Z`) with wall-kick offsets.
- **Arcade Scoring & Combos**: Standard line-clear multipliers (Single, Double, Triple, Tetris), Combo streaks, Back-to-Back 1.5× bonuses, and persistent `localStorage` high score tracking.
- **Web Audio Synthesizer**: Built-in retro sound effects generated dynamically via the browser Web Audio API (no external audio assets required).
- **Responsive Desktop & Mobile Controls**: Full keyboard support alongside an on-screen tactile arcade control dock.

## Controls

| Action | Keyboard | On-Screen Dock |
| :--- | :--- | :--- |
| **Move Left / Right** | `←` `→` or `A` `D` | `← Left` / `Right →` |
| **Rotate Clockwise** | `Space`, `↑`, `W`, or `X` | `↻ Rotate` |
| **Rotate Counter-Clockwise** | `Z` | `↺ CCW` |
| **Soft Drop** | `↓` or `S` | `↓ Soft` |
| **Hard Drop** | `Enter` | `⤓ Hard Drop` |
| **Hold Piece** | `C` or `Shift` | `Hold` |
| **Toggle Ghost Piece** | `G` | `Ghost: ON/OFF` |
| **Mute / Unmute Audio** | `M` | `SFX: ON/OFF` |
| **Pause / Resume** | `P` or `Esc` | `Pause` |
| **New Game** | `R` | `New Game` |

## Running Locally

No build tools or package managers are required:

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser, or serve the folder with a local static server (e.g., `npx serve .` or `python3 -m http.server 8000`).

## Deploying to GitHub Pages

1. Upload `index.html`, `style.css`, `script.js`, `README.md`, and `LICENSE` to your GitHub repository.
2. Go to **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment**, select **Deploy from a branch**, choose your `main` branch and `/ (root)` folder, and click **Save**.
