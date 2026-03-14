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

function renderFilters(tags) {
  const bar = document.querySelector("#filter-bar");

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;
    if (tag === state.activeTag) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.activeTag = tag;
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.textContent === state.activeTag);
      });
      renderMovies();
    });

    bar.append(button);
  });
}

function renderMovies() {
  const container = document.querySelector("#movie-grid");
  container.innerHTML = "";

  const filtered =
    state.activeTag === "全部"
      ? state.movies
      : state.movies.filter((movie) => movie.tags.includes(state.activeTag));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty">当前标签下暂时没有电影。</div>`;
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
    renderFilters(getAllTags(state.movies));
    renderMovies();
  } catch (error) {
    console.error(error);
    const grid = document.querySelector("#movie-grid");
    grid.innerHTML = `<div class="empty">电影数据读取失败，请检查 data/movies.json。</div>`;
  }
}

initMoviesPage();
