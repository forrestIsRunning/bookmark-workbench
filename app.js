const state = {
  all: [],
  folderTree: [],
  folderFilter: "",
  expandedFolders: new Set(),
  query: "",
  domainFilter: "",
  sortMode: "smart",
};

const els = {
  clock: document.querySelector("#clock"),
  today: document.querySelector("#today"),
  search: document.querySelector("#search"),
  stats: document.querySelector("#stats"),
  domainPills: document.querySelector("#domainPills"),
  folders: document.querySelector("#folders"),
  clearFilter: document.querySelector("#clearFilter"),
  sortMode: document.querySelector("#sortMode"),
  resultTitle: document.querySelector("#resultTitle"),
  bookmarks: document.querySelector("#bookmarks"),
  empty: document.querySelector("#empty"),
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
  els.clock.textContent = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  els.today.textContent = now.toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function sortBookmarks(items) {
  const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
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
    toggle.title = folder.children.length ? "Expand folder" : "No subfolders";
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
    button.querySelector("strong").textContent = domain;
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
  els.empty.hidden = items.length > 0;
  els.bookmarks.replaceChildren(...items.map((item) => {
    const card = document.createElement("a");
    card.className = "bookmark-card";
    card.href = item.url;
    card.title = item.url;
    card.innerHTML = `
      <span class="icon-shell"><img class="bookmark-icon" alt=""></span>
      <span>
        <span class="bookmark-title"></span>
        <span class="bookmark-meta">
          <span class="tag domain"></span>
          <span class="tag folder"></span>
        </span>
      </span>
    `;
    card.querySelector(".bookmark-icon").src = faviconUrl(item.url);
    card.querySelector(".bookmark-title").textContent = item.title;
    card.querySelector(".bookmark-title").title = item.title;
    card.querySelector(".tag.domain").textContent = compactText(item.domain, 22);
    card.querySelector(".tag.domain").title = item.domain;
    card.querySelector(".tag.folder").textContent = compactText(leafFolder(item.folder), 24);
    card.querySelector(".tag.folder").title = item.folder;
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
  const tree = await chrome.bookmarks.getTree();
  state.all = flattenBookmarks(tree);
  state.folderTree = buildFolderTree(tree);
  state.folderTree.slice(0, 3).forEach((folder) => state.expandedFolders.add(folder.path));
  render();
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

updateClock();
setInterval(updateClock, 30_000);
loadBookmarks();
