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

## Extracting Content

Review all the readme files and the json files.
I need you to extract more content for the JSON files Use the following command to read each URL I give you:

`lynx -dump -nolist -nostatus -trim_blank_lines -width=10000 https://jamesclear.com/3-2-1/*` And complete the url with each newsletter link. Then extract into each JSON file. 

I will give you multiple links to extract content from.
Write all the content into the ideas.json/quotes.json/questions.json files.
Keep conversation responses concise, focused on the task at hand.
when writing content, follow the format of the existing content.
When given multiple links, read all content, then write the content into the JSON files instead of doing each one at a time.


### To build for Chrome Web Store

Navigate to the extension folder and create the zip:

```bash
cd extension
zip -r clear-wisdom.zip . -x ".*" -x "__MACOSX/*" -x "*.DS_Store" -x "*.zip" -x ".git/*" -x "node_modules/*"
```
