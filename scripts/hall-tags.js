import { createMovieCard, loadMovies, mountYear } from "./common.js";

const state = {
  movies: [],
  activeTag: "全部"
};

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => movie.tags.forEach((tag) => tagSet.add(tag)));
  return ["全部", ...Array.from(tagSet)];
}

function renderFilters() {
  const bar = document.querySelector("#tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", tag === state.activeTag);

    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderFilters();
      renderHall();
    });

    bar.append(button);
  });
}

function renderHall() {
  const grid = document.querySelector("#tag-grid");
  grid.innerHTML = "";

  const filtered =
    state.activeTag === "全部"
      ? state.movies
      : state.movies.filter((movie) => movie.tags.includes(state.activeTag));

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">当前标签下暂时没有电影。</div>`;
    return;
  }

  filtered.forEach((movie, index) => {
    const card = createMovieCard(movie, { scoreMode: "total" });
    card.classList.add("reveal");
    card.style.animationDelay = `${index * 30}ms`;
    grid.append(card);
  });
}

async function init() {
  mountYear();
  try {
    state.movies = await loadMovies();
    renderFilters();
    renderHall();
  } catch (error) {
    console.error(error);
    document.querySelector("#tag-grid").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
