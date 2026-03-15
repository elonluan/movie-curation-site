import { createMovieCard, loadMovies, mountYear } from "./common.js";

const state = {
  movies: [],
  activeTag: "全部"
};

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => {
    const tags = Array.isArray(movie.tags) ? movie.tags : [];
    tags.forEach((tag) => tagSet.add(tag));
  });
  return ["全部", ...Array.from(tagSet)];
}

function renderTagFilters() {
  const bar = document.querySelector("#calendar-tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", tag === state.activeTag);

    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderTagFilters();
      renderHall();
    });

    bar.append(button);
  });
}

function toTimestamp(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function groupKey(movie) {
  if (!movie.watchDate) {
    return "未记录日期";
  }
  const d = new Date(movie.watchDate);
  if (Number.isNaN(d.getTime())) {
    return "未记录日期";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function renderHall() {
  const container = document.querySelector("#calendar-stream");
  container.innerHTML = "";

  const filtered =
    state.activeTag === "全部"
      ? state.movies
      : state.movies.filter((movie) => (Array.isArray(movie.tags) ? movie.tags : []).includes(state.activeTag));

  const sorted = [...filtered].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  if (!sorted.length) {
    container.innerHTML = `<div class="empty">当前标签下暂无可展示的观影记录。</div>`;
    return;
  }

  const groups = new Map();
  sorted.forEach((movie) => {
    const key = groupKey(movie);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(movie);
  });

  let indexOffset = 0;
  groups.forEach((groupMovies, key) => {
    const section = document.createElement("section");
    section.className = "calendar-group";

    const title = document.createElement("h2");
    title.className = "calendar-month";
    title.textContent = key;
    section.append(title);

    const grid = document.createElement("div");
    grid.className = "grid";

    groupMovies.forEach((movie, idx) => {
      const card = createMovieCard(movie, { scoreMode: "total" });
      card.classList.add("reveal");
      card.style.animationDelay = `${(indexOffset + idx) * 22}ms`;
      grid.append(card);
    });

    indexOffset += groupMovies.length;
    section.append(grid);
    container.append(section);
  });
}

async function init() {
  mountYear();
  try {
    state.movies = await loadMovies();
    renderTagFilters();
    renderHall();
  } catch (error) {
    console.error(error);
    document.querySelector("#calendar-stream").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
