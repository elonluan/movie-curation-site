import { createMovieCard, loadMovies, mountYear } from "./common.js";

const SCORE_SORT_OPTIONS = [
  { key: "total", label: "最终得分" },
  { key: "personal", label: "个人维度" },
  { key: "art", label: "艺术维度" },
  { key: "external", label: "外部维度" }
];

const state = {
  movies: [],
  activeTag: "全部",
  scoreSort: "total"
};

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => movie.tags.forEach((tag) => tagSet.add(tag)));
  return ["全部", ...Array.from(tagSet)];
}

function renderTagFilters() {
  const bar = document.querySelector("#tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;

    if (tag === state.activeTag) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderTagFilters();
      renderTagHall();
    });

    bar.append(button);
  });
}

function renderScoreSortControls() {
  const bar = document.querySelector("#score-sort-bar");
  bar.innerHTML = "";

  SCORE_SORT_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = option.label;

    if (option.key === state.scoreSort) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.scoreSort = option.key;
      renderScoreSortControls();
      renderScoreHall();
    });

    bar.append(button);
  });
}

function renderTagHall() {
  const filtered =
    state.activeTag === "全部"
      ? state.movies
      : state.movies.filter((movie) => movie.tags.includes(state.activeTag));

  renderCards("#tag-grid", filtered, "当前标签下暂时没有电影。");
}

function renderCalendarHall() {
  const sorted = [...state.movies].sort((a, b) => {
    return getWatchDateTimestamp(b) - getWatchDateTimestamp(a);
  });

  renderCards("#calendar-grid", sorted, "暂无可展示的观影日历。");
}

function renderScoreHall() {
  const sorted = [...state.movies].sort((a, b) => {
    const scoreDelta = getScoreByMode(b, state.scoreSort) - getScoreByMode(a, state.scoreSort);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return getWatchDateTimestamp(b) - getWatchDateTimestamp(a);
  });

  renderCards("#score-grid", sorted, "暂无可展示的评分数据。");
}

function renderCards(selector, movies, emptyText) {
  const container = document.querySelector(selector);
  container.innerHTML = "";

  if (!movies.length) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  movies.forEach((movie, index) => {
    const card = createMovieCard(movie);
    card.classList.add("reveal");
    card.style.animationDelay = `${index * 35}ms`;
    container.append(card);
  });
}

function getScoreByMode(movie, mode) {
  const summary = movie.summaryScores ?? {};

  if (mode === "personal") {
    return safeNumber(summary.personal);
  }
  if (mode === "art") {
    return safeNumber(summary.art);
  }
  if (mode === "external") {
    return safeNumber(summary.external);
  }

  return safeNumber(summary.total) || safeNumber(movie.rating) * 10;
}

function getWatchDateTimestamp(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function initMoviesPage() {
  mountYear();

  try {
    state.movies = await loadMovies();
    renderTagFilters();
    renderTagHall();
    renderCalendarHall();
    renderScoreSortControls();
    renderScoreHall();
  } catch (error) {
    console.error(error);
    ["#tag-grid", "#calendar-grid", "#score-grid"].forEach((selector) => {
      const container = document.querySelector(selector);
      if (container) {
        container.innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
      }
    });
  }
}

initMoviesPage();
