# Clear Wisdom

A Chrome extension that displays wisdom quotes from James Clear's 3-2-1 newsletter in new tabs.

## Features

- **3-2-1 Format**: Displays James Clear's ideas, quotes from others, and reflection questions
- **Three Modes**: Switch between Ideas, Quotes, and Questions
- **Search Functionality**: Search through all wisdom content
- **Favorites System**: Save your favorite quotes
- **Clean Interface**: Minimalist design focused on the wisdom content

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `clear-wisdom` folder
5. Open a new tab to see the extension in action

## Usage

- **Ideas Mode**: James Clear's insights and wisdom
- **Quotes Mode**: Wisdom from other authors and thinkers
- **Questions Mode**: Reflection questions for personal growth
- **Search**: Use the search icon to find specific content
- **Favorites**: Click the heart icon to save quotes
- **Refresh**: Click the refresh icon for new content

## Content

All quotes are sourced from James Clear's 3-2-1 newsletter, which features:

- 3 ideas from James Clear
- 2 quotes from others
- 1 question to consider

Format:

```js
  {
    "id": "2019-08-08-ideas-1",
    "quote": "...",
    "intro": "...",
    "newsletter_link": "...",
    "author": "...",
    "date": "...",
    "section": "...",
    "explanation": "..."
  }
```

This project is open source and available under the MIT License.
