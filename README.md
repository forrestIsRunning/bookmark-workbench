# Bookmark Workbench

Bookmark Workbench is a local Chrome extension that replaces the default new tab page with a focused bookmark dashboard.

It is designed for people who keep research links, internal tools, docs, videos, and daily workflows in Chrome bookmarks but want something denser and more useful than a plain white bookmark page.

## Install

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder:

```text
/Users/xiaoxia/Projects/work/chrome-bookmark-dashboard
```

Open a new tab after loading the extension.

## Features

- Reads your existing Chrome bookmarks through `chrome.bookmarks`.
- Replaces the new tab page with a compact bookmark workbench.
- Shows nested folder filters, top domains, favicon cards, search, and sorting.
- Parent folder filters include bookmarks in subfolders; child folder filters narrow to that branch.
- Shortens long titles, domains, and folder labels so dense bookmark collections stay readable.
- Does not modify, sync, export, or copy bookmark data.

## Privacy

Bookmark Workbench only uses Chrome extension APIs locally:

- `chrome.bookmarks` to read your bookmark tree.
- `chrome://favicon` access through the `favicon` permission to show site icons.

It does not send bookmark data to any server.
