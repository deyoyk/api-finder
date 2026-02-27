## API Finder

Simple Chrome extension that captures JSON API requests and responses as you browse and lets you export them to YAML or JSON.

### Install locally

1. Build or download this repository into a folder, for example:
   - `c:\Github\api-finder`
2. Open Chrome and go to:
   - `chrome://extensions`
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the `api-finder` folder (the one that contains `manifest.json`).

The extension should now appear in your toolbar (pin it if needed).

### Using the extension

1. Browse any site that makes JSON API calls.
2. Click the API Finder icon in the Chrome toolbar.
3. The popup shows a list of captured API calls.
4. Click a request row to expand and view:
   - Request headers and body
   - Response headers and body
   - Cookies for that request
5. Click **Export** to download all captured requests as a `.yml` or `.json` file (depending on your options).
6. Click **Clear all** to remove all captured requests and start fresh.

