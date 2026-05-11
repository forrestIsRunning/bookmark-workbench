# Bookmark Workbench

Bookmark Workbench is a privacy-first Chrome new tab extension for people who keep research links, docs, internal tools, videos, and daily workflows in Chrome bookmarks.

It turns the default new tab into a compact bookmark workspace with nested folders, search, editing, and dense cards.

## Features

- Browse Chrome bookmarks in a focused new tab dashboard.
- Filter by nested folders; parent folders include bookmarks from subfolders.
- Search by title, domain, URL, and folder path.
- Sort by recent, title, domain, or folder.
- Add, edit, and delete bookmarks directly from the page.
- Create, rename, and delete folders from the folder tree.
- Right-click a folder to create a subfolder, rename it, or delete it.
- Drag bookmarks onto folders to move them.
- Use `Manual` sort to drag bookmarks before another bookmark in the same folder.
- Toggle compact density for larger bookmark collections.
- Use keyboard shortcuts: `/` to search, `Enter` to open the first result, `Esc` to clear filters.
- Respect the browser language for date/time formatting and sorting.
- Support light and dark system color schemes.

## Install

### Option 1: Ask an AI coding assistant

If you use Codex, Claude Code, Cursor, or another local coding assistant, you can ask it to install the extension for you:

```text
Clone https://github.com/forrestIsRunning/bookmark-workbench,
then help me load it as an unpacked Chrome extension from chrome://extensions.
```

This is often the easiest path because the assistant can clone the repository, open the extension folder, and guide you through Chrome's final confirmation step.

### Option 2: Manual install from Git

```bash
git clone https://github.com/forrestIsRunning/bookmark-workbench.git
```

Then:

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the cloned `bookmark-workbench` folder.
5. Open a new tab.

### Option 3: Manual install from ZIP

1. Download this repository as a ZIP from GitHub.
2. Unzip it locally.
3. Open `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the unzipped folder.

## Permissions

Bookmark Workbench asks for:

- `bookmarks`: read, create, update, and delete your Chrome bookmarks and folders.
- `favicon`: show site icons for bookmark cards.

The extension does not send bookmark data to any server.

## Development

There is no build step. The extension is plain HTML, CSS, and JavaScript.

After editing files, reload the extension in `chrome://extensions` and open a new tab.

## License

MIT
