const DATA_PATH = "/data/movies.json";

const posterTones = {
  amber: ["#2f2419", "#a26c2a", "#f6d2a2"],
  slate: ["#1e242b", "#4d5b69", "#cad4de"],
  mist: ["#2e3843", "#6f8695", "#d8e0e8"],
  paper: ["#3d362b", "#95866f", "#e5ddcf"],
  mono: ["#1f1f1f", "#555555", "#dbdbdb"],
  rust: ["#342520", "#955840", "#e5b9a1"],
  forest: ["#1a2a25", "#496555", "#cad8ca"],
  charcoal: ["#232323", "#606060", "#d3d3d3"],
  rose: ["#3a2b31", "#8d5f70", "#e3ced6"],
  olive: ["#2a3023", "#6e7d57", "#d8dbc8"],
  sunset: ["#402718", "#aa5e34", "#efc69d"],
  earth: ["#2d271d", "#7f6b4d", "#d8cdb4"],
  oxide: ["#3c2a26", "#93514d", "#e0c4bc"],
  ink: ["#1a1b21", "#41455d", "#c6cad8"]
};

export async function loadMovies() {
  const res = await fetch(DATA_PATH);
  if (!res.ok) {
    throw new Error("无法加载电影数据");
  }
  return res.json();
}

export function pickPoster(movie) {
  if (movie.poster) {
    return movie.poster;
  }
  return generatePoster(movie);
}

function generatePoster(movie) {
  const [c1, c2, c3] = posterTones[movie.posterTone] ?? posterTones.paper;
  const latinTitle = (movie.titleOriginal ?? movie.titleZh)
    .replace(/&/g, "and")
    .replace(/[<>]/g, "")
    .slice(0, 36);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.18)"/>
    </pattern>
  </defs>
  <rect width="800" height="1200" fill="url(#g)"/>
  <rect width="800" height="1200" fill="url(#grain)" opacity="0.35"/>
  <rect x="54" y="58" width="692" height="1084" fill="none" stroke="rgba(245,240,230,0.52)" stroke-width="1.8"/>
  <rect x="84" y="88" width="632" height="1024" fill="none" stroke="rgba(245,240,230,0.28)" stroke-width="1"/>
  <text x="96" y="105" font-size="24" fill="rgba(247,242,233,0.84)" font-family="Georgia, serif" letter-spacing="4">ARCHIVE EDITION</text>
  <line x1="96" y1="145" x2="704" y2="145" stroke="rgba(247,242,233,0.55)" stroke-width="1"/>
  <text x="96" y="976" font-size="64" fill="#f8f2e7" font-family="Georgia, serif" letter-spacing="2">${latinTitle}</text>
  <text x="96" y="1038" font-size="22" fill="rgba(248,242,231,0.84)" font-family="Georgia, serif" letter-spacing="4">${movie.year}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createMovieCard(movie, { className = "movie-card", withIntro = false } = {}) {
  const finalScore = getFinalScore(movie);
  const watchDate = formatWatchDate(movie.watchDate);
  const meta = `最终得分 ${finalScore.toFixed(1)} · 观影日期 ${watchDate}`;

  const a = document.createElement("a");
  a.href = `/movie.html?id=${encodeURIComponent(movie.id)}`;
  a.className = className;
  a.innerHTML = `
    <div class="poster-wrap">
      <img src="${pickPoster(movie)}" alt="${movie.titleZh} 海报" loading="lazy" />
    </div>
    <div class="card-body">
      <h3 class="card-title">${movie.titleZh}</h3>
      <p class="card-subtitle">${movie.titleOriginal}</p>
      <p class="card-year">${movie.year}</p>
      <p class="card-meta">${meta}</p>
      <div class="tag-row">
        ${movie.tags.slice(0, 3).map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      ${withIntro ? `<p class="card-subtitle" style="margin-top: 12px;">${movie.logline}</p>` : ""}
    </div>
  `;
  return a;
}

function getFinalScore(movie) {
  if (typeof movie?.summaryScores?.total === "number" && Number.isFinite(movie.summaryScores.total)) {
    return movie.summaryScores.total;
  }
  if (typeof movie?.rating === "number" && Number.isFinite(movie.rating)) {
    return movie.rating * 10;
  }
  return 0;
}

function formatWatchDate(dateStr) {
  if (!dateStr) {
    return "未记录";
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return dateStr;
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mountYear() {
  const target = document.querySelector("[data-year]");
  if (target) {
    target.textContent = new Date().getFullYear();
  }
}
