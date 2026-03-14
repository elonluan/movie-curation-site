import { createMovieCard, loadMovies, mountYear } from "./common.js";

const VIEW_MODES = {
  tags: "标签索引",
  core: "分馆浏览"
};

const CORE_DIMENSIONS = ["全部", "个人", "艺术", "外部"];

const state = {
  movies: [],
  viewMode: "tags",
  activeTag: "全部",
  activeCore: "全部"
};

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => movie.tags.forEach((tag) => tagSet.add(tag)));
  return ["全部", ...Array.from(tagSet)];
}

function renderModeSwitch() {
  const container = document.querySelector("#view-mode");
  container.innerHTML = "";

  Object.entries(VIEW_MODES).forEach(([mode, label]) => {
    const button = document.createElement("button");
    button.className = "mode-btn";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(state.viewMode === mode));

    if (state.viewMode === mode) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.viewMode = mode;
      renderModeSwitch();
      renderFilters();
      renderMovies();
    });

    container.append(button);
  });
}

function renderFilters() {
  const bar = document.querySelector("#filter-bar");
  bar.innerHTML = "";

  if (state.viewMode === "core") {
    bar.setAttribute("aria-label", "分馆筛选");
    renderFilterButtons(bar, CORE_DIMENSIONS, state.activeCore, (value) => {
      state.activeCore = value;
      renderFilters();
      renderMovies();
    });
    return;
  }

  bar.setAttribute("aria-label", "标签筛选");
  renderFilterButtons(bar, getAllTags(state.movies), state.activeTag, (value) => {
    state.activeTag = value;
    renderFilters();
    renderMovies();
  });
}

function renderFilterButtons(container, options, activeValue, onSelect) {
  options.forEach((value) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = value;

    if (value === activeValue) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => onSelect(value));
    container.append(button);
  });
}

function getFilteredMovies() {
  if (state.viewMode === "core") {
    if (state.activeCore === "全部") {
      return state.movies;
    }
    return state.movies.filter((movie) => movie.coreDimension === state.activeCore);
  }

  if (state.activeTag === "全部") {
    return state.movies;
  }

  return state.movies.filter((movie) => movie.tags.includes(state.activeTag));
}

function renderMovies() {
  const container = document.querySelector("#movie-grid");
  container.innerHTML = "";

  const filtered = getFilteredMovies();

  if (filtered.length === 0) {
    const emptyText =
      state.viewMode === "core" ? "当前分馆下暂时没有电影。" : "当前标签下暂时没有电影。";
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  filtered.forEach((movie, index) => {
    const card = createMovieCard(movie);
    card.classList.add("reveal");
    card.style.animationDelay = `${index * 50}ms`;
    container.append(card);
  });
}

async function initMoviesPage() {
  mountYear();

  try {
    state.movies = await loadMovies();
    renderModeSwitch();
    renderFilters();
    renderMovies();
  } catch (error) {
    console.error(error);
    const grid = document.querySelector("#movie-grid");
    grid.innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

initMoviesPage();
