import { loadMovies, mountYear, pickPoster } from "./common.js";

const MODES = [
  { key: "final", label: "最终得分" },
  { key: "personal", label: "个人维度" },
  { key: "art", label: "艺术维度" },
  { key: "external", label: "外部维度" }
];

const TIME_FILTERS = [
  { key: "12m", label: "最近一年", months: 12 },
  { key: "6m", label: "最近六个月", months: 6 },
  { key: "3m", label: "最近三个月", months: 3 },
  { key: "1m", label: "最近一个月", months: 1 }
];

const SCORE_BANDS = [
  { key: "90", label: "90-100 分", kicker: "高分区", min: 90 },
  { key: "80", label: "80-89 分", kicker: "核心区", min: 80 },
  { key: "70", label: "70-79 分", kicker: "稳态区", min: 70 },
  { key: "60", label: "60-69 分", kicker: "低分区", min: 60 },
  { key: "0", label: "60 分以下", kicker: "极低分区", min: 0 }
];

const state = {
  movies: [],
  mode: "final",
  activeTag: "全部",
  activeTime: "12m"
};

function safe(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatScore(value) {
  return safe(value).toFixed(1);
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

function watchTs(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function modeLabel(key) {
  const found = MODES.find((mode) => mode.key === key);
  return found ? found.label : "最终得分";
}

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => {
    const tags = Array.isArray(movie.tags) ? movie.tags : [];
    tags.forEach((tag) => tagSet.add(tag));
  });
  return ["全部", ...Array.from(tagSet)];
}

function buildScoreProfile(movie) {
  const summary = movie.summaryScores ?? {};
  const personal = safe(summary.personal);
  const art = safe(summary.art);
  const external = safe(summary.external);

  const computedMax = Math.max(personal, art, external);
  const hasDim = computedMax > 0;
  const fallbackTotal = safe(summary.total) || safe(movie.rating) * 10;
  const final = hasDim ? computedMax : fallbackTotal;

  const dominantKeys = hasDim
    ? [
        ["personal", personal],
        ["art", art],
        ["external", external]
      ]
        .filter((item) => item[1] === computedMax)
        .map((item) => item[0])
    : [];

  return {
    personal,
    art,
    external,
    final,
    dominantKeys
  };
}

function scoreOf(movie, mode) {
  if (mode === "personal") {
    return movie._scoreProfile.personal;
  }
  if (mode === "art") {
    return movie._scoreProfile.art;
  }
  if (mode === "external") {
    return movie._scoreProfile.external;
  }
  return movie._scoreProfile.final;
}

function tierByScore(score) {
  if (score >= 90) {
    return "S";
  }
  if (score >= 80) {
    return "A";
  }
  if (score >= 70) {
    return "B";
  }
  if (score >= 60) {
    return "C";
  }
  return "F";
}

function bandKeyByScore(score) {
  if (score >= 90) {
    return "90";
  }
  if (score >= 80) {
    return "80";
  }
  if (score >= 70) {
    return "70";
  }
  if (score >= 60) {
    return "60";
  }
  return "0";
}

function dominantLabel(profile) {
  if (!profile.dominantKeys.length) {
    return "未判定";
  }
  if (profile.dominantKeys.length > 1) {
    return "并列主导";
  }
  if (profile.dominantKeys[0] === "personal") {
    return "个人主导";
  }
  if (profile.dominantKeys[0] === "art") {
    return "艺术主导";
  }
  return "外部主导";
}

function buildBandBuckets(list) {
  const buckets = SCORE_BANDS.map((band) => ({
    ...band,
    movies: []
  }));
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  list.forEach((movie) => {
    const score = scoreOf(movie, state.mode);
    const key = bandKeyByScore(score);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.movies.push(movie);
    }
  });

  return buckets;
}

function renderModeBar() {
  const bar = document.querySelector("#score-mode-bar");
  bar.innerHTML = "";

  MODES.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.classList.toggle("active", state.mode === mode.key);
    button.textContent = mode.label;

    button.addEventListener("click", () => {
      state.mode = mode.key;
      renderModeBar();
      renderLeaderboard();
    });

    bar.append(button);
  });
}

function renderTagBar() {
  const bar = document.querySelector("#score-tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.classList.toggle("active", state.activeTag === tag);
    button.textContent = tag;

    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderTagBar();
      renderLeaderboard();
    });

    bar.append(button);
  });
}

function renderTimeBar() {
  const bar = document.querySelector("#score-time-filter-bar");
  bar.innerHTML = "";

  TIME_FILTERS.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-btn";
    button.classList.toggle("active", state.activeTime === item.key);
    button.textContent = item.label;

    button.addEventListener("click", () => {
      state.activeTime = item.key;
      renderTimeBar();
      renderLeaderboard();
    });

    bar.append(button);
  });
}

function calcCutoffTs(filterKey) {
  const selected = TIME_FILTERS.find((item) => item.key === filterKey);
  if (!selected) {
    return Number.NEGATIVE_INFINITY;
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - selected.months);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff.getTime();
}

function buildFiltered() {
  const cutoffTs = calcCutoffTs(state.activeTime);

  const filtered =
    state.activeTag === "全部"
      ? [...state.movies]
      : state.movies.filter((movie) => (Array.isArray(movie.tags) ? movie.tags : []).includes(state.activeTag));

  const withTime = filtered.filter((movie) => {
    const ts = watchTs(movie);
    return Number.isFinite(ts) && ts >= cutoffTs;
  });

  withTime.sort((a, b) => {
    const diff = scoreOf(b, state.mode) - scoreOf(a, state.mode);
    if (diff !== 0) {
      return diff;
    }

    const finalDiff = b._scoreProfile.final - a._scoreProfile.final;
    if (finalDiff !== 0) {
      return finalDiff;
    }

    return watchTs(b) - watchTs(a);
  });

  return withTime;
}

function renderTopCards(list) {
  if (!list.length) {
    return "";
  }

  return `
    <section class="score-top-grid" aria-label="榜单前三">
      ${list
        .slice(0, 3)
        .map((movie, idx) => {
          const profile = movie._scoreProfile;
          const score = scoreOf(movie, state.mode);
          const logline = String(movie.logline || "").trim();
          return `
            <a class="score-top-card" href="/movie.html?id=${encodeURIComponent(movie.id)}">
              <span class="score-top-rank">#${idx + 1}</span>
              <div class="score-top-poster"><img src="${pickPoster(movie)}" alt="${movie.titleZh} 海报" loading="lazy" /></div>
              <div class="score-top-body">
                <h3>${movie.titleZh}</h3>
                ${logline ? `<p class="score-top-logline">${logline}</p>` : ""}
                <p>${modeLabel(state.mode)} ${formatScore(score)} · 最终 ${formatScore(profile.final)}</p>
                <p>${dominantLabel(profile)} · ${formatWatchDate(movie.watchDate)}</p>
              </div>
            </a>
          `;
        })
        .join("")}
    </section>
  `;
}

function rowMarkup(movie, rank) {
  const profile = movie._scoreProfile;
  const currentScore = scoreOf(movie, state.mode);
  const tier = tierByScore(currentScore);
  const tags = Array.isArray(movie.tags) ? movie.tags.slice(0, 3) : [];
  const logline = String(movie.logline || "").trim();

  return `
    <a class="score-rank-row" href="/movie.html?id=${encodeURIComponent(movie.id)}">
      <div class="score-rank-num">${String(rank).padStart(2, "0")}</div>
      <div class="score-rank-poster">
        <img src="${pickPoster(movie)}" alt="${movie.titleZh} 海报" loading="lazy" />
      </div>
      <div class="score-rank-main">
        <div class="score-rank-head">
          <h3>${movie.titleZh}</h3>
          <span class="score-rank-tier tier-${tier}">${tier}</span>
        </div>
        ${logline ? `<p class="score-rank-logline">${logline}</p>` : ""}
        <p class="score-rank-meta">${modeLabel(state.mode)} ${formatScore(currentScore)} · 最终 ${formatScore(profile.final)} · ${formatWatchDate(movie.watchDate)}</p>
        <div class="score-rank-bars">
          <span class="rank-bar personal${state.mode === "personal" ? " active" : ""}" style="--w:${profile.personal}%;">个 ${formatScore(profile.personal)}</span>
          <span class="rank-bar art${state.mode === "art" ? " active" : ""}" style="--w:${profile.art}%;">艺 ${formatScore(profile.art)}</span>
          <span class="rank-bar external${state.mode === "external" ? " active" : ""}" style="--w:${profile.external}%;">外 ${formatScore(profile.external)}</span>
        </div>
        ${
          tags.length
            ? `<div class="score-rank-tags">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>`
            : ""
        }
      </div>
    </a>
  `;
}

function renderBandIndex(buckets) {
  return `
    <aside class="score-range-index" aria-label="分数区间目录">
      <p class="score-range-index-kicker">目录</p>
      <h3 class="score-range-index-title">快速前往分数区间</h3>
      <nav class="score-range-index-nav">
        ${buckets
          .map((bucket) => {
            const disabled = bucket.movies.length === 0;
            return `
              <a
                class="score-index-link${disabled ? " is-empty" : ""}"
                href="#score-band-${bucket.key}"
                ${disabled ? 'aria-disabled="true"' : ""}
              >
                <span>${bucket.label}</span>
                <em>${bucket.movies.length} 部</em>
              </a>
            `;
          })
          .join("")}
      </nav>
    </aside>
  `;
}

function renderBandSections(buckets, rankMap) {
  return buckets
    .map((bucket) => {
      const body = bucket.movies.length
        ? `
          <div class="score-rank-list">
            ${bucket.movies.map((movie) => rowMarkup(movie, rankMap.get(movie.id) ?? 0)).join("")}
          </div>
        `
        : `<div class="score-band-empty">当前区间暂无电影。</div>`;

      return `
        <section class="score-band-section" id="score-band-${bucket.key}">
          <header class="score-band-head">
            <div>
              <p class="score-band-kicker">${bucket.kicker}</p>
              <h3>${bucket.label}</h3>
            </div>
            <span>${bucket.movies.length} 部</span>
          </header>
          ${body}
        </section>
      `;
    })
    .join("");
}

function renderLeaderboard() {
  const mount = document.querySelector("#score-leaderboard");
  const list = buildFiltered();

  if (!list.length) {
    mount.innerHTML = `<div class="empty">当前标签与时间筛选下暂无可展示的电影。</div>`;
    return;
  }

  const topMarkup = renderTopCards(list);
  const rankMap = new Map(list.map((movie, idx) => [movie.id, idx + 1]));
  const buckets = buildBandBuckets(list);
  const indexMarkup = renderBandIndex(buckets);
  const sectionsMarkup = renderBandSections(buckets, rankMap);

  mount.innerHTML = `
    <section class="score-rank-layout">
      ${indexMarkup}
      <div class="score-rank-content">
        ${topMarkup}
        <div class="score-band-stack" aria-label="分数区间榜单">
          ${sectionsMarkup}
        </div>
      </div>
    </section>
  `;

  mount.querySelectorAll('.score-index-link[href^="#score-band-"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.classList.contains("is-empty")) {
        event.preventDefault();
        return;
      }
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) {
        return;
      }
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function init() {
  mountYear();

  try {
    const movies = await loadMovies();
    state.movies = movies.map((movie) => ({
      ...movie,
      _scoreProfile: buildScoreProfile(movie)
    }));

    renderModeBar();
    renderTagBar();
    renderTimeBar();
    renderLeaderboard();
  } catch (error) {
    console.error(error);
    document.querySelector("#score-leaderboard").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
  }
}

init();
