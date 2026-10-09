# TypeRush ⌨️

TypeRush is een AZERTY-first typing trainer built with plain HTML, CSS and JavaScript. Practice typing, track WPM and accuracy, and build a habit with a lightweight progress system.

## Features

- Timed tests: 15, 30, 60 and 120 seconds
- Word mode and full-text mode
- Dutch, English and French content
- Live WPM, accuracy, errors and timer
- Learning lessons for basics, words, punctuation and mixed practice
- Local test history, personal bests, XP and achievements
- Dark/light theme
- Responsive layout

## Run locally

Because the app uses JavaScript modules, open it through a local web server instead of double-clicking `index.html`.

### Option 1: VS Code Live Server
1. Open the project folder in VS Code.
2. Install the Live Server extension.
3. Right-click `index.html` and choose **Open with Live Server**.

### Option 2: Python
Run this command from the project folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish on GitHub Pages

1. Push the files to a GitHub repository.
2. Open **Settings → Pages**.
3. Under build and deployment, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.

## Project structure

```text
typerush/
├── index.html
├── README.md
├── css/
│   └── style.css
├── data/
│   └── content.js
└── js/
    ├── app.js
    ├── storage.js
    └── typing-engine.js
```

## Notes

- Progress is stored in the current browser using `localStorage`; it is not synced between devices.
- The test checks the characters typed, which is more suitable for accented characters than physical-key-only checking.
- This is an initial MVP. Before a public release, test keyboard edge cases and add automated tests for the typing engine.
