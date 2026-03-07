# Clear Wisdom

**Transform every new tab into a moment of wisdom.**

[Install on Chrome](https://chromewebstore.google.com/detail/clear-wisdom-gems-of-wisd/jijfmgoijddfmlcdghopbkdpelbpmjdm) &nbsp;·&nbsp; [Landing Page](https://shadoath.github.io/clear-wisdom/) &nbsp;·&nbsp; [James Clear's 3-2-1 Newsletter](https://jamesclear.com/3-2-1)

Clear Wisdom is a free Chrome extension that replaces your new tab with a piece of wisdom from James Clear's acclaimed 3-2-1 newsletter. 300+ insights spanning ideas, quotes from world-class thinkers, and reflection questions — growing with every new issue.

---

## Features

- **Ideas** — Original insights from James Clear on habits, decision-making, and continuous improvement
- **Quotes** — Hand-selected quotes from Marcus Aurelius, Lao Tzu, Seneca, and more
- **Questions** — Reflection prompts designed to spark meaningful introspection
- **Search** — Full-text search across all 300+ entries
- **Favorites** — Save insights locally; revisit them anytime
- **Private & offline** — No account, no tracking, no external requests after install

## Project Structure

```
clear-wisdom/
├── extension/          # Chrome extension source
│   ├── newtab.html     # New tab page
│   ├── newtab.js       # Main logic (mode switching, display, interactions)
│   ├── newtab.css      # New tab styles
│   ├── options.html    # Extension options popup
│   ├── options.js      # Options logic
│   ├── manifest.json   # Chrome extension manifest (v3)
│   ├── images/         # Icons and SVGs
│   ├── lib/            # jQuery, MiniSearch, shared CSS, content JSON by year
│   └── src/            # Modules: favorites.js, viewed.js, markdown.js, util.js
└── docs/               # GitHub Pages marketing site
    ├── index.html
    └── style.css
```

## Content Structure

Content lives in `extension/lib/{year}/` as three JSON files:

| File | Description | Count per newsletter |
|------|-------------|----------------------|
| `ideas.json` | James Clear's original insights | 3 |
| `quotes.json` | Quotes from other thinkers | 2 |
| `questions.json` | Reflection questions | 1 |

Each entry follows this schema:

```json
{
  "id": "YYYY-MM-DD-type-N",
  "quote": "The quote text",
  "intro": "Brief topic label",
  "newsletter_link": "https://jamesclear.com/3-2-1/...",
  "author": "Author name",
  "date": "YYYY-MM-DD",
  "section": "Ideas | Quotes | Questions",
  "explanation": "AI-generated context that adds depth"
}
```

New entries are added to the **start** of the relevant JSON file.

## Development

### Load the extension locally

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. Open a new tab

After editing any file, click the reload icon in `chrome://extensions/` and open a new tab.

### Adding new content

1. Identify the correct year folder under `extension/lib/`
2. Read an existing entry to confirm the schema
3. Add the new entry to the **top** of the array
4. Validate JSON before committing

## Tech Stack

- Vanilla JS (ES6 modules)
- jQuery 3.7.1 + jQuery UI 1.13.2
- MiniSearch for full-text search
- Chrome Storage API (favorites, view counts)
- Chrome Manifest v3

## Credits

All content is sourced from [James Clear's 3-2-1 Newsletter](https://jamesclear.com/3-2-1).
Built by [Shadoath](https://github.com/shadoath).
