const state = {
  all: [],
  folderTree: [],
  folderFilter: "",
  folderIdByPath: new Map(),
  expandedFolders: new Set(),
  query: "",
  domainFilter: "",
  sortMode: "smart",
  density: localStorage.getItem("bookmark-workbench-density") || "comfortable",
};

const locale = navigator.language || "en-US";
const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });

const els = {
  clock: document.querySelector("#clock"),
  today: document.querySelector("#today"),
  search: document.querySelector("#search"),
  stats: document.querySelector("#stats"),
  domainPills: document.querySelector("#domainPills"),
  folders: document.querySelector("#folders"),
  clearFilter: document.querySelector("#clearFilter"),
  addBookmark: document.querySelector("#addBookmark"),
  sortMode: document.querySelector("#sortMode"),
  densityToggle: document.querySelector("#densityToggle"),
  resultTitle: document.querySelector("#resultTitle"),
  bookmarks: document.querySelector("#bookmarks"),
  empty: document.querySelector("#empty"),
  dialog: document.querySelector("#bookmarkDialog"),
  form: document.querySelector("#bookmarkForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  bookmarkId: document.querySelector("#bookmarkId"),
  bookmarkTitle: document.querySelector("#bookmarkTitle"),
  bookmarkUrl: document.querySelector("#bookmarkUrl"),
  dialogFolder: document.querySelector("#dialogFolder"),
  deleteBookmark: document.querySelector("#deleteBookmark"),
  cancelDialog: document.querySelector("#cancelDialog"),
  saveBookmark: document.querySelector("#saveBookmark"),
};

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function leafFolder(path) {
  const parts = path.split(" / ").filter(Boolean);
  return parts.at(-1) || path;
}

function compactText(value, max = 34) {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.62);
  const tail = Math.floor((max - 1) * 0.38);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function flattenBookmarks(nodes, trail = []) {
  const out = [];
  for (const node of nodes) {
    if (node.url) {
      const folder = trail.filter(Boolean).join(" / ") || "Bookmarks";
      out.push({
        id: node.id,
        title: node.title || hostname(node.url),
        url: node.url,
        domain: hostname(node.url),
        folder,
        parentId: node.parentId,
        dateAdded: Number(node.dateAdded || 0),
        haystack: `${node.title || ""} ${node.url} ${folder}`.toLowerCase(),
      });
      continue;
    }

    const nextTrail = node.title ? [...trail, node.title] : trail;
    out.push(...flattenBookmarks(node.children || [], nextTrail));
  }
  return out;
}

function countBookmarks(node) {
  if (node.url) return 1;
  return (node.children || []).reduce((total, child) => total + countBookmarks(child), 0);
}

function buildFolderTree(nodes, trail = [], depth = 0) {
  const folders = [];

  for (const node of nodes) {
    if (node.url) continue;

    const nextTrail = node.title ? [...trail, node.title] : trail;
    const path = nextTrail.filter(Boolean).join(" / ");
    const children = buildFolderTree(node.children || [], nextTrail, depth + 1);
    const count = countBookmarks(node);

    if (path && count > 0) {
      state.folderIdByPath.set(path, node.id);
      folders.push({
        id: node.id,
        name: node.title || "Bookmarks",
        path,
        depth,
        count,
        children,
      });
    } else {
      folders.push(...children);
    }
  }

  return folders;
}

function updateClock() {
  const now = new Date();
  els.clock.textContent = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  els.today.textContent = now.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function sortBookmarks(items) {
  return [...items].sort((a, b) => {
    if (state.sortMode === "title") return collator.compare(a.title, b.title);
    if (state.sortMode === "domain") return collator.compare(a.domain, b.domain) || collator.compare(a.title, b.title);
    if (state.sortMode === "folder") return collator.compare(a.folder, b.folder) || collator.compare(a.title, b.title);
    return b.dateAdded - a.dateAdded || collator.compare(a.title, b.title);
  });
}

function filteredBookmarks() {
  const query = state.query.trim().toLowerCase();
  return sortBookmarks(state.all.filter((item) => {
    if (state.folderFilter && item.folder !== state.folderFilter && !item.folder.startsWith(`${state.folderFilter} / `)) return false;
    if (state.domainFilter && item.domain !== state.domainFilter) return false;
    if (query && !item.haystack.includes(query)) return false;
    return true;
  }));
}

function firstVisibleBookmark() {
  return els.bookmarks.querySelector(".bookmark-link");
}

function updateDensity() {
  document.body.dataset.density = state.density;
  const compact = state.density === "compact";
  els.densityToggle.textContent = compact ? "Comfortable" : "Compact";
  els.densityToggle.setAttribute("aria-pressed", String(compact));
  localStorage.setItem("bookmark-workbench-density", state.density);
}

function selectedParentId() {
  if (state.folderFilter && state.folderIdByPath.has(state.folderFilter)) {
    return state.folderIdByPath.get(state.folderFilter);
  }

  return state.folderTree[0]?.id || "1";
}

function openBookmarkDialog(item = null) {
  els.dialogTitle.textContent = item ? "Edit bookmark" : "Add bookmark";
  els.bookmarkId.value = item?.id || "";
  els.bookmarkTitle.value = item?.title || "";
  els.bookmarkUrl.value = item?.url || "";
  els.dialogFolder.textContent = item
    ? `Folder: ${item.folder}`
    : `Folder: ${state.folderFilter || state.folderTree[0]?.path || "Bookmarks bar"}`;
  els.deleteBookmark.hidden = !item;
  els.dialog.showModal();
  els.bookmarkTitle.focus();
}

function closeBookmarkDialog() {
  els.dialog.close();
  els.form.reset();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function reloadBookmarks() {
  if (state.folderFilter) state.expandedFolders.add(state.folderFilter);
  await loadBookmarks();
}

async function saveBookmarkFromDialog() {
  const id = els.bookmarkId.value;
  const title = els.bookmarkTitle.value.trim();
  const url = normalizeUrl(els.bookmarkUrl.value);

  if (id) {
    await chrome.bookmarks.update(id, { title, url });
  } else {
    await chrome.bookmarks.create({ parentId: selectedParentId(), title, url });
  }

  closeBookmarkDialog();
  await reloadBookmarks();
}

async function deleteBookmarkFromDialog() {
  const id = els.bookmarkId.value;
  if (!id) return;

  const confirmed = confirm("Delete this bookmark?");
  if (!confirmed) return;

  await chrome.bookmarks.remove(id);
  closeBookmarkDialog();
  await reloadBookmarks();
}

function renderFolders() {
  const rows = [];

  function visit(folder) {
    rows.push(folder);
    if (state.expandedFolders.has(folder.path)) {
      for (const child of folder.children) visit(child);
    }
  }

  for (const folder of state.folderTree) visit(folder);

  els.folders.replaceChildren(...rows.map((folder) => {
    const row = document.createElement("div");
    row.className = `folder-row${state.folderFilter === folder.path ? " active" : ""}`;
    row.style.setProperty("--depth", folder.depth);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "folder-toggle";
    toggle.title = folder.children.length ? "Toggle folder" : "No subfolders";
    toggle.textContent = folder.children.length ? (state.expandedFolders.has(folder.path) ? "⌄" : "›") : "";
    toggle.disabled = folder.children.length === 0;
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.expandedFolders.has(folder.path)) {
        state.expandedFolders.delete(folder.path);
      } else {
        state.expandedFolders.add(folder.path);
      }
      renderFolders();
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-btn";
    button.innerHTML = `<span class="folder-name"></span><span class="count"></span>`;
    button.querySelector(".folder-name").textContent = compactText(folder.name, 24);
    button.querySelector(".folder-name").title = folder.path;
    button.querySelector(".count").textContent = folder.count;
    button.addEventListener("click", () => {
      state.folderFilter = state.folderFilter === folder.path ? "" : folder.path;
      state.domainFilter = "";
      render();
    });

    row.append(toggle, button);
    return row;
  }));
}

function renderDomains() {
  const counts = new Map();
  for (const item of state.all) counts.set(item.domain, (counts.get(item.domain) || 0) + 1);

  const entries = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);

  els.domainPills.replaceChildren(...entries.map(([domain, count]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "domain-pill";
    if (state.domainFilter === domain) button.classList.add("active");
    button.innerHTML = `<img alt=""><strong></strong><span></span>`;
    button.querySelector("img").src = faviconUrl(`https://${domain}`);
    button.querySelector("strong").textContent = compactText(domain, 26);
    button.querySelector("strong").title = domain;
    button.querySelector("span").textContent = count;
    button.addEventListener("click", () => {
      state.domainFilter = state.domainFilter === domain ? "" : domain;
      state.folderFilter = "";
      render();
    });
    return button;
  }));
}

function renderBookmarks() {
  const items = filteredBookmarks();
  const isEmptyLibrary = state.all.length === 0;
  els.empty.hidden = items.length > 0;
  els.empty.textContent = isEmptyLibrary ? "No bookmarks found yet." : "No bookmarks match this view.";
  els.bookmarks.replaceChildren(...items.map((item) => {
    const card = document.createElement("article");
    card.className = "bookmark-card";
    card.title = item.url;
    card.innerHTML = `
      <a class="bookmark-link" href="">
        <span class="icon-shell"><img class="bookmark-icon" alt=""></span>
        <span class="bookmark-copy">
          <span class="bookmark-title"></span>
          <span class="bookmark-meta">
            <span class="tag domain"></span>
            <span class="tag folder"></span>
          </span>
        </span>
      </a>
      <span class="bookmark-actions">
        <button class="card-action edit-action" type="button">Edit</button>
        <button class="card-action delete-action" type="button">Delete</button>
      </span>
    `;
    card.querySelector(".bookmark-link").href = item.url;
    card.querySelector(".bookmark-icon").src = faviconUrl(item.url);
    card.querySelector(".bookmark-title").textContent = item.title;
    card.querySelector(".bookmark-title").title = item.title;
    card.querySelector(".tag.domain").textContent = compactText(item.domain, 22);
    card.querySelector(".tag.domain").title = item.domain;
    card.querySelector(".tag.folder").textContent = compactText(leafFolder(item.folder), 24);
    card.querySelector(".tag.folder").title = item.folder;
    card.querySelector(".edit-action").addEventListener("click", () => openBookmarkDialog(item));
    card.querySelector(".delete-action").addEventListener("click", async () => {
      const confirmed = confirm(`Delete "${item.title}"?`);
      if (!confirmed) return;
      await chrome.bookmarks.remove(item.id);
      await reloadBookmarks();
    });
    return card;
  }));

  const suffix = state.folderFilter || state.domainFilter || "Bookmarks";
  els.resultTitle.textContent = suffix;
  const filters = [state.folderFilter && "folder", state.domainFilter && "domain", state.query && "search"].filter(Boolean);
  els.stats.textContent = `${items.length} shown / ${state.all.length} total${filters.length ? ` · ${filters.join(" + ")}` : ""}`;
}

function render() {
  renderFolders();
  renderDomains();
  renderBookmarks();
}

async function loadBookmarks() {
  try {
    const tree = await chrome.bookmarks.getTree();
    state.folderIdByPath = new Map();
    state.all = flattenBookmarks(tree);
    state.folderTree = buildFolderTree(tree);
    state.folderTree.slice(0, 3).forEach((folder) => state.expandedFolders.add(folder.path));
    render();
  } catch (error) {
    els.empty.hidden = false;
    els.empty.textContent = "Bookmark permission is unavailable. Reload the extension and try again.";
    els.stats.textContent = "Unable to read bookmarks";
    console.error(error);
  }
}

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderBookmarks();
});

els.clearFilter.addEventListener("click", () => {
  state.folderFilter = "";
  state.domainFilter = "";
  state.query = "";
  els.search.value = "";
  render();
});

els.sortMode.addEventListener("change", (event) => {
  state.sortMode = event.target.value;
  renderBookmarks();
});

els.addBookmark.addEventListener("click", () => openBookmarkDialog());

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveBookmarkFromDialog();
});

els.deleteBookmark.addEventListener("click", deleteBookmarkFromDialog);

els.cancelDialog.addEventListener("click", closeBookmarkDialog);

els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) closeBookmarkDialog();
});

els.densityToggle.addEventListener("click", () => {
  state.density = state.density === "compact" ? "comfortable" : "compact";
  updateDensity();
});

document.addEventListener("keydown", (event) => {
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

  if (els.dialog.open) return;

  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    els.search.focus();
    return;
  }

  if (event.key === "Escape") {
    state.query = "";
    state.domainFilter = "";
    state.folderFilter = "";
    els.search.value = "";
    render();
    els.search.blur();
    return;
  }

  if (event.key === "Enter" && document.activeElement === els.search) {
    firstVisibleBookmark()?.click();
  }
});

updateDensity();
updateClock();
setInterval(updateClock, 30_000);
loadBookmarks();
