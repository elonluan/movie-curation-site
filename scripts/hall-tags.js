import { createMovieCard, loadMovies, mountYear } from "./common.js";

const state = {
  movies: [],
  activeCountry: "全部国家"
};

function safeCountry(movie) {
  const country = typeof movie?.country === "string" ? movie.country.trim() : "";
  return country || "未知地区";
}

function toTimestamp(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function getAllCountries(movies) {
  const counts = new Map();
  movies.forEach((movie) => {
    const country = safeCountry(movie);
    counts.set(country, (counts.get(country) || 0) + 1);
  });

  const ordered = [...counts.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) {
        return countDiff;
      }
      return a[0].localeCompare(b[0], "zh-Hans-CN");
    })
    .map(([country]) => country);

  return ["全部国家", ...ordered];
}

function renderCountryFilters() {
  const bar = document.querySelector("#country-filter-bar");
  bar.innerHTML = "";

  getAllCountries(state.movies).forEach((country) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = country;
    button.classList.toggle("active", country === state.activeCountry);

    button.addEventListener("click", () => {
      state.activeCountry = country;
      renderCountryFilters();
      renderHall();
    });

    bar.append(button);
  });
}

function buildCountryGroups(movies) {
  const groups = new Map();
  movies.forEach((movie) => {
    const country = safeCountry(movie);
    if (!groups.has(country)) {
      groups.set(country, []);
    }
    groups.get(country).push(movie);
  });

  const ordered = [...groups.entries()].sort((a, b) => {
    const countDiff = b[1].length - a[1].length;
    if (countDiff !== 0) {
      return countDiff;
    }
    return a[0].localeCompare(b[0], "zh-Hans-CN");
  });

  return ordered.map(([country, groupMovies]) => ({
    country,
    movies: groupMovies.sort((a, b) => toTimestamp(b) - toTimestamp(a))
  }));
}

function renderHall() {
  const container = document.querySelector("#country-stream");
  container.innerHTML = "";

  const filtered =
    state.activeCountry === "全部国家"
      ? state.movies
      : state.movies.filter((movie) => safeCountry(movie) === state.activeCountry);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty">当前国家下暂无可展示的电影。</div>`;
    return;
  }

  const groups = buildCountryGroups(filtered);
  let revealIndex = 0;

  groups.forEach(({ country, movies }, groupIndex) => {
    const section = document.createElement("section");
    section.className = "country-group reveal";
    section.style.animationDelay = `${groupIndex * 28}ms`;

    const head = document.createElement("div");
    head.className = "country-group-head";

    const title = document.createElement("h2");
    title.className = "country-name";
    title.textContent = country;

    const meta = document.createElement("p");
    meta.className = "country-meta";
    meta.textContent = `${movies.length} 部`;

    head.append(title, meta);

    const grid = document.createElement("div");
    grid.className = "grid";

    movies.forEach((movie) => {
      const card = createMovieCard(movie, { scoreMode: "total" });
      card.classList.add("reveal");
      card.style.animationDelay = `${revealIndex * 16}ms`;
      revealIndex += 1;
      grid.append(card);
    });

    section.append(head, grid);
    container.append(section);
  });
}

async function init() {
  mountYear();
  try {
    state.movies = await loadMovies();
    renderCountryFilters();
    renderHall();
  } catch (error) {
    console.error(error);
    document.querySelector("#country-stream").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
