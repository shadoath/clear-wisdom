# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clear Wisdom is a Chrome extension that displays wisdom quotes from James Clear's 3-2-1 newsletter in new tabs. It provides three modes (Ideas, Quotes, Questions), search functionality, favorites system, and a clean minimalist interface.

## Architecture

### Core Components
- **newtab.js**: Main logic for new tab functionality, handles mode switching, quote display, and user interactions
- **src/markdown.js**: Parses markdown formatting in quotes (bold, italic, line breaks)
- **src/favorites.js**: Manages favorite quotes storage and retrieval
- **src/viewed.js**: Tracks view counts for quotes
- **src/util.js**: Utility functions for random selection, animations, and helpers

### Data Structure
Content is stored in three JSON files in `lib/`:
- **ideas.json**: James Clear's insights (3 per newsletter)
- **quotes.json**: Quotes from other authors (2 per newsletter)  
- **questions.json**: Reflection questions (1 per newsletter)

Each entry follows this structure:
```json
{
  "id": "YYYY-MM-DD-type-N",
  "quote": "The actual quote text",
  "intro": "Brief intro/topic",
  "newsletter_link": "URL to newsletter",
  "author": "Author name",
  "date": "YYYY-MM-DD",
  "section": "Ideas|Quotes|Questions",
  "explanation": "Optional context"
}
```

## Development Commands

### Installing the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project directory
4. The extension will replace new tabs with the Clear Wisdom interface

### Testing Changes
- Reload the extension in `chrome://extensions/` after making code changes
- Open a new tab to see changes immediately
- Use Chrome DevTools Console to debug JavaScript issues

### Adding New Content
When adding new quotes to the JSON files:
- Maintain the existing JSON structure exactly
- Use the date format: `YYYY-MM-DD`
- Ensure IDs follow the pattern: `YYYY-MM-DD-type-N`
- Validate JSON syntax before committing

## Key Implementation Details

- Uses jQuery 3.7.1 and jQuery UI 1.13.2 (loaded from `lib/`)
- Chrome Storage API for persistence (favorites, view counts)
- ES6 modules for code organization
- Markdown support for formatting within quotes
- SVG icons optimized for light theme display