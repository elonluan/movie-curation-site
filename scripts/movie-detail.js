import { loadMovies, mountYear, pickPoster } from "./common.js";

function readMovieId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderNotFound() {
  const container = document.querySelector("#movie-detail");
  container.innerHTML = `
    <div class="empty">
      未找到该电影条目。请从 <a href="/movies.html" style="text-decoration: underline;">电影列表页</a> 重新进入。
    </div>
  `;
}

function renderMovie(movie) {
  const container = document.querySelector("#movie-detail");
  const tags = movie.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");

  container.innerHTML = `
    <article class="detail-layout reveal">
      <div class="detail-poster">
        <img src="${pickPoster(movie)}" alt="${movie.titleZh} 海报" />
      </div>
      <div class="detail-info">
        <h1>${movie.titleZh}</h1>
        <div class="detail-original">${movie.titleOriginal}</div>

        <ul class="meta-list">
          <li><span class="meta-label">年份</span><span class="meta-value">${movie.year}</span></li>
          <li><span class="meta-label">国家/地区</span><span class="meta-value">${movie.country}</span></li>
          <li><span class="meta-label">导演</span><span class="meta-value">${movie.director}</span></li>
          <li><span class="meta-label">我的评分</span><span class="meta-value">${movie.rating} / 10</span></li>
        </ul>

        <div class="tag-row">${tags}</div>
        <p class="logline">${movie.logline}</p>
        ${movie.note ? `<p class="note">${movie.note}</p>` : ""}
      </div>
    </article>
  `;
}

async function initDetailPage() {
  mountYear();

  const movieId = readMovieId();
  if (!movieId) {
    renderNotFound();
    return;
  }

  try {
    const movies = await loadMovies();
    const target = movies.find((movie) => movie.id === movieId);

    if (!target) {
      renderNotFound();
      return;
    }

    document.title = `${target.titleZh} | 帧间档案`;
    renderMovie(target);
  } catch (error) {
    console.error(error);
    renderNotFound();
  }
}

initDetailPage();
