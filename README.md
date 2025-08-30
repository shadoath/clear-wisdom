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
- 2 quotes from others
  ```js
  {
    "id": "2019-08-08-quotes-1",
    "quote": "...",
    "intro": "...",
    "newsletter_link": "...",
    "author": "...",
    "date": "...",
    "section": "...",
    "explanation": "..."
  }
  ```
- 1 question to consider
  ```js
  {
    "id": "2019-08-08-question",
    "quote": "...",
    "intro": "...",
    "newsletter_link": "...",
    "author": "...",
    "date": "...",
    "section": "...",
  }
  ```

## Automated Newsletter Updates

This project includes GitHub Actions automation for updating newsletter content:

### Manual Update via GitHub Actions
1. Go to the Actions tab in your GitHub repository
2. Select "Update Newsletter Content" workflow
3. Click "Run workflow"
4. Enter a newsletter URL (e.g., `https://jamesclear.com/3-2-1/september-19-2019`)
5. The workflow will extract content and create a PR with the updates

### Automatic Weekly Check
- The workflow runs every Thursday at 10 AM UTC
- Checks for the 5 most recent newsletters
- Automatically adds any new content found
- Creates a PR for review

### Local Usage
You can also run the extraction script locally:

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Extract a specific newsletter
python scripts/extract_newsletter.py --url https://jamesclear.com/3-2-1/september-19-2019

# Check for latest newsletters
python scripts/extract_newsletter.py --check-latest

# Validate JSON files
python scripts/validate_json.py
```

## License

This project is open source and available under the MIT License.
