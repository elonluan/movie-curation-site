import { createMovieCard, loadMovies, mountYear } from "./common.js";

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

function renderHall(movies) {
  const container = document.querySelector("#calendar-stream");
  container.innerHTML = "";

  const sorted = [...movies].sort((a, b) => toTimestamp(b) - toTimestamp(a));
  if (!sorted.length) {
    container.innerHTML = `<div class="empty">暂无可展示的观影记录。</div>`;
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
    const movies = await loadMovies();
    renderHall(movies);
  } catch (error) {
    console.error(error);
    document.querySelector("#calendar-stream").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
