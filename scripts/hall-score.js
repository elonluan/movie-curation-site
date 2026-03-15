import { createMovieCard, loadMovies, mountYear } from "./common.js";

const SORT_OPTIONS = [
  { key: "total", label: "最终得分" },
  { key: "personal", label: "个人维度" },
  { key: "art", label: "艺术维度" },
  { key: "external", label: "外部维度" }
];

const state = {
  movies: [],
  mode: "total"
};

function scoreOf(movie, mode) {
  const summary = movie.summaryScores ?? {};
  if (mode === "personal") {
    return safe(summary.personal);
  }
  if (mode === "art") {
    return safe(summary.art);
  }
  if (mode === "external") {
    return safe(summary.external);
  }
  return safe(summary.total) || safe(movie.rating) * 10;
}

function watchTs(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function safe(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function renderSortBar() {
  const bar = document.querySelector("#score-sort-bar");
  bar.innerHTML = "";

  SORT_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = option.label;
    button.classList.toggle("active", option.key === state.mode);

    button.addEventListener("click", () => {
      state.mode = option.key;
      renderSortBar();
      renderHall();
    });

    bar.append(button);
  });
}

function renderHall() {
  const grid = document.querySelector("#score-grid");
  grid.innerHTML = "";

  const sorted = [...state.movies].sort((a, b) => {
    const diff = scoreOf(b, state.mode) - scoreOf(a, state.mode);
    if (diff !== 0) {
      return diff;
    }
    return watchTs(b) - watchTs(a);
  });

  if (!sorted.length) {
    grid.innerHTML = `<div class="empty">暂无可展示的评分结果。</div>`;
    return;
  }

  sorted.forEach((movie, index) => {
    const card = createMovieCard(movie, { scoreMode: state.mode });
    card.classList.add("reveal");
    card.style.animationDelay = `${index * 20}ms`;
    grid.append(card);
  });
}

async function init() {
  mountYear();
  try {
    state.movies = await loadMovies();
    renderSortBar();
    renderHall();
  } catch (error) {
    console.error(error);
    document.querySelector("#score-grid").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
