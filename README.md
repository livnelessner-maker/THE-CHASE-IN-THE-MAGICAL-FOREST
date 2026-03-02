# THE CHASE IN THE MAGICAL FOREST

This repository hosts a browser-based game built as a single static page.

## Project Structure

```
/               # root
│ index.html    # main page (HTML only, layout + markup)
│
├── css/
│   └── styles.css  # all styling; responsive/mobile tweaks included
│
└── js/
    └── game.js     # complete game logic and UI scripting
```

Media assets (images/audio) are stored under `assets/images/` (picture files) or `assets/audio/`, and referenced correctly by the CSS.

## How to run

1. Serve the directory with a simple HTTP server; e.g.:  
   ```bash
   cd /workspaces/THE-CHASE-IN-THE-MAGICAL-FOREST
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080` in a browser.

Because `game.js` is loaded with `defer`, ensure the server sets correct MIME types.

## Enhancements added

- **Separation of concerns**: CSS and JavaScript extracted from `index.html`.
- **Responsive design**: container scales to viewport using `aspect-ratio` and JS scaling.
- **Mobile support**: touch controls added (`jump`, `duck`, `shoot`) with on-screen buttons.
- **Cleaner HTML**: inline `style`/`script` removed, external assets referenced.
- **Simplified layout**: mobile controls hidden on desktop, shown on small screens.

Feel free to extend or refactor further.
