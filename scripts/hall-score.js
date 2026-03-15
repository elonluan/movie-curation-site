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

function modeLabel(mode) {
  const option = SORT_OPTIONS.find((item) => item.key === mode);
  return option?.label ?? "最终得分";
}

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

function bucketStart(score) {
  const normalized = Math.max(0, Math.min(100, Math.floor(score)));
  if (normalized === 100) {
    return 100;
  }
  return Math.floor(normalized / 10) * 10;
}

function bucketLabel(start) {
  if (start === 100) {
    return "100 分档";
  }
  return `${start}-${start + 9} 分档`;
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
  const board = document.querySelector("#score-grid");
  board.innerHTML = "";

  const sorted = [...state.movies].sort((a, b) => {
    const diff = scoreOf(b, state.mode) - scoreOf(a, state.mode);
    if (diff !== 0) {
      return diff;
    }
    return watchTs(b) - watchTs(a);
  });

  if (!sorted.length) {
    board.innerHTML = `<div class="empty">暂无可展示的评分结果。</div>`;
    return;
  }

  const buckets = new Map();
  sorted.forEach((movie) => {
    const start = bucketStart(scoreOf(movie, state.mode));
    if (!buckets.has(start)) {
      buckets.set(start, []);
    }
    buckets.get(start).push(movie);
  });

  const orderedBuckets = [...buckets.keys()].sort((a, b) => b - a);
  let revealIndex = 0;

  orderedBuckets.forEach((start, bucketIndex) => {
    const movies = buckets.get(start) ?? [];
    const section = document.createElement("section");
    section.className = "score-bucket reveal";
    section.style.animationDelay = `${bucketIndex * 36}ms`;

    const head = document.createElement("div");
    head.className = "score-bucket-head";

    const title = document.createElement("h3");
    title.className = "score-bucket-title";
    title.textContent = bucketLabel(start);

    const meta = document.createElement("p");
    meta.className = "score-bucket-meta";
    meta.textContent = `${modeLabel(state.mode)} · ${movies.length} 部`;

    head.append(title, meta);

    const grid = document.createElement("div");
    grid.className = "grid score-bucket-grid";

    movies.forEach((movie) => {
      const card = createMovieCard(movie, { scoreMode: state.mode });
      card.classList.add("reveal");
      card.style.animationDelay = `${revealIndex * 14}ms`;
      revealIndex += 1;
      grid.append(card);
    });

    section.append(head, grid);
    board.append(section);
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
