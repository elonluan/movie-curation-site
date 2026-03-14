import { createMovieCard, loadMovies, mountYear } from "./common.js";

async function initHome() {
  mountYear();
  const container = document.querySelector("#featured-grid");

  try {
    const movies = await loadMovies();
    const featured = movies.filter((movie) => movie.featured).slice(0, 4);

    featured.forEach((movie, index) => {
      const card = createMovieCard(movie, { withIntro: true });
      card.classList.add("reveal");
      card.style.animationDelay = `${index * 90}ms`;
      container.append(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `<div class="empty">精选电影加载失败，请检查 data/movies.json。</div>`;
  }
}

initHome();
