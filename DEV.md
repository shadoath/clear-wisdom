## Project Structure

All extension files are organized in the `extension/` folder for better compilation and distribution.

## Content Structure

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

### To build for Chrome Web Store

Navigate to the extension folder and create the zip:

```bash
cd extension
zip -r clear-wisdom.zip . -x ".*" -x "__MACOSX/*" -x "*.DS_Store" -x "*.zip" -x ".git/*" -x "node_modules/*"
```
