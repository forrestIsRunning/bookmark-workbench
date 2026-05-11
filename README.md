# Bookmark Workbench

Bookmark Workbench is a Chrome extension that replaces the new tab page with a practical bookmark manager.

It is built for people who keep many links in Chrome bookmarks and want a faster way to search, organize, edit, and move them without opening Chrome's default bookmark manager.

## What It Does

- Shows your Chrome bookmarks in a clean new tab dashboard.
- Keeps your existing Chrome bookmark data; there is no separate database.
- Supports nested folders, including empty folders.
- Lets you search by title, URL, domain, and folder path.
- Lets you add, edit, delete, drag, and move bookmarks.
- Lets you create, rename, delete, and right-click manage folders.
- Supports compact mode, light/dark mode, and keyboard shortcuts.
- Automatically refreshes when bookmarks or folders change.

## Common Use Cases

- Clean up a large bookmark collection.
- Move links between folders by dragging them.
- Create subfolders quickly from the folder tree.
- Use a more useful new tab page for daily links, docs, tools, and reading lists.
- Keep bookmark organization local to Chrome without sending data to a server.

## Install

Bookmark Workbench is currently installed as an unpacked Chrome extension.

### Install With an AI Coding Assistant

If you use Codex, Claude Code, Cursor, or another local coding assistant, you can ask it:

```text
Clone https://github.com/forrestIsRunning/bookmark-workbench,
then help me load it as an unpacked Chrome extension in Chrome.
```

The assistant can clone the repository and open the right folder. Chrome still requires you to confirm loading the extension from `chrome://extensions`.

### Install Manually From Git

```bash
git clone https://github.com/forrestIsRunning/bookmark-workbench.git
```

Then:

1. Open `chrome://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select the cloned `bookmark-workbench` folder.
5. Open a new tab.

### Install Manually From ZIP

1. Download this repository as a ZIP from GitHub.
2. Unzip it.
3. Open `chrome://extensions`.
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select the unzipped folder.
7. Open a new tab.

## How To Use

- Search from the top input.
- Click a folder to filter bookmarks.
- Right-click a folder to create a subfolder, rename it, or delete it.
- Click `Add` to create a bookmark in the current folder.
- Hover a bookmark card to edit or delete it.
- Drag a bookmark onto a folder to move it.
- Choose `Manual` sorting to reorder bookmarks by dragging them before another bookmark in the same folder.

Keyboard shortcuts:

- `/`: focus search
- `Enter`: open the first visible bookmark while search is focused
- `Esc`: clear filters and search

## Permissions

Bookmark Workbench asks for two Chrome permissions:

- `bookmarks`: read, create, update, move, and delete Chrome bookmarks and folders.
- `favicon`: show site icons on bookmark cards.

The extension does not send bookmark data to any server. All bookmark operations use Chrome's local extension APIs.

## Development

There is no build step. The extension uses plain HTML, CSS, and JavaScript.

After editing files:

1. Reload the extension in `chrome://extensions`.
2. Open a new tab.

## License

MIT
