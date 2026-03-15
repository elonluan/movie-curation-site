import { loadMovies, mountYear, pickPoster } from "./common.js";

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const state = {
  movies: [],
  activeTag: "全部",
  monthEntries: [],
  dayMap: new Map(),
  orderedDayKeys: [],
  activeDayKey: "",
  frameEls: new Map(),
  monthSectionEls: new Map(),
  monthIndexBtns: new Map(),
  posterAnchorEl: null,
  scrollRaf: 0,
  listenersBound: false
};

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => {
    const tags = Array.isArray(movie.tags) ? movie.tags : [];
    tags.forEach((tag) => tagSet.add(tag));
  });
  return ["全部", ...Array.from(tagSet)];
}

function parseDateParts(dateStr) {
  if (typeof dateStr !== "string") {
    return null;
  }

  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(utcDate.getTime())) {
    return null;
  }

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;

  return {
    year,
    month,
    day,
    monthKey,
    dayKey,
    weekday: WEEKDAY_LABELS[utcDate.getUTCDay()] || "",
    dateUtc: utcDate
  };
}

function prepareMovies(movies) {
  return movies.map((movie) => {
    const dateInfo = parseDateParts(movie.watchDate);
    const summaryTotal = Number(movie?.summaryScores?.total);
    const fallbackRating = Number(movie?.rating);

    return {
      ...movie,
      _dateInfo: dateInfo,
      _dayKey: dateInfo ? dateInfo.dayKey : "undated",
      _monthKey: dateInfo ? dateInfo.monthKey : "undated",
      _score:
        Number.isFinite(summaryTotal) && summaryTotal > 0
          ? summaryTotal
          : Number.isFinite(fallbackRating)
            ? fallbackRating * 10
            : 0,
      _isTheatrical: Boolean(movie.isTheatrical)
    };
  });
}

function compareMovieInDay(a, b) {
  const scoreDiff = b._score - a._score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return String(a.titleZh ?? "").localeCompare(String(b.titleZh ?? ""), "zh-Hans-CN");
}

function buildMonthEntries(movies) {
  const monthMap = new Map();

  movies.forEach((movie) => {
    const monthKey = movie._monthKey;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, new Map());
    }

    const dayMap = monthMap.get(monthKey);
    if (!dayMap.has(movie._dayKey)) {
      dayMap.set(movie._dayKey, []);
    }

    dayMap.get(movie._dayKey).push(movie);
  });

  const monthKeys = [...monthMap.keys()].sort((a, b) => {
    if (a === "undated") {
      return 1;
    }
    if (b === "undated") {
      return -1;
    }
    return b.localeCompare(a);
  });

  return monthKeys.map((monthKey) => {
    const dayEntries = [...monthMap.get(monthKey).entries()]
      .map(([dayKey, dayMovies]) => {
        const sortedMovies = [...dayMovies].sort(compareMovieInDay);
        const first = sortedMovies[0];
        const info = first?._dateInfo;
        const theatricalCount = sortedMovies.filter((movie) => movie._isTheatrical).length;

        return {
          dayKey,
          monthKey,
          movies: sortedMovies,
          count: sortedMovies.length,
          theatricalCount,
          nonTheatricalCount: sortedMovies.length - theatricalCount,
          isUndated: dayKey === "undated",
          dateInfo: info || null,
          sampleTitles: sortedMovies.slice(0, 2).map((movie) => `《${movie.titleZh}》`).join(" · "),
          venueType:
            theatricalCount === 0
              ? "home"
              : theatricalCount === sortedMovies.length
                ? "cinema"
                : "mixed"
        };
      })
      .sort((a, b) => {
        if (a.dayKey === "undated") {
          return 1;
        }
        if (b.dayKey === "undated") {
          return -1;
        }
        return b.dayKey.localeCompare(a.dayKey);
      });

    return {
      monthKey,
      monthLabel: monthKey === "undated" ? "未记录日期" : monthKey,
      days: dayEntries
    };
  });
}

function venueLabel(dayEntry) {
  if (dayEntry.venueType === "cinema") {
    return "院线放映";
  }
  if (dayEntry.venueType === "home") {
    return "非院线观看";
  }
  return "院线 / 非院线混合";
}

function movieVenueLabel(movie) {
  return movie._isTheatrical ? "院线" : "非院线";
}

function getMovieTitle(movie) {
  return String(movie.titleZh || movie.titleEn || "未命名影片");
}

function diffDays(newerDate, olderDate) {
  if (!newerDate || !olderDate) {
    return 0;
  }
  const diff = Math.round((newerDate.getTime() - olderDate.getTime()) / 86400000);
  return Math.max(0, diff);
}

function renderTagFilters() {
  const bar = document.querySelector("#calendar-tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", tag === state.activeTag);

    button.addEventListener("click", () => {
      state.activeTag = tag;
      renderTagFilters();
      renderHall();
    });

    bar.append(button);
  });
}

function flattenDayKeys() {
  return state.monthEntries.flatMap((monthEntry) => monthEntry.days.map((dayEntry) => dayEntry.dayKey));
}

function ensureActiveDay() {
  if (state.activeDayKey && state.dayMap.has(state.activeDayKey)) {
    return;
  }

  state.activeDayKey = state.orderedDayKeys[0] || "";
}

function scrollToMonth(monthKey) {
  const target = state.monthSectionEls.get(monthKey);
  if (!target) {
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - 104;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function updateMonthIndexActive() {
  const activeDay = state.dayMap.get(state.activeDayKey);
  const activeMonthKey = activeDay?.monthKey || "";

  state.monthIndexBtns.forEach((button, monthKey) => {
    button.classList.toggle("active", monthKey === activeMonthKey);
  });
}

function renderMonthIndex() {
  const indexBar = document.querySelector("#calendar-month-index");
  if (!indexBar) {
    return;
  }

  indexBar.innerHTML = "";
  state.monthIndexBtns.clear();

  state.monthEntries.forEach((monthEntry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-index-btn";
    button.textContent = monthEntry.monthKey === "undated" ? "未标注日期" : monthEntry.monthKey;
    button.addEventListener("click", () => {
      scrollToMonth(monthEntry.monthKey);
    });
    indexBar.append(button);
    state.monthIndexBtns.set(monthEntry.monthKey, button);
  });

  updateMonthIndexActive();
}

function renderReel() {
  const container = document.querySelector("#calendar-reel");
  container.innerHTML = "";
  state.frameEls.clear();
  state.monthSectionEls.clear();

  let revealIndex = 0;

  state.monthEntries.forEach((monthEntry) => {
    const monthSection = document.createElement("section");
    monthSection.className = "reel-month reveal";
    monthSection.style.animationDelay = `${revealIndex * 18}ms`;
    monthSection.dataset.monthKey = monthEntry.monthKey;
    monthSection.id = `calendar-month-${monthEntry.monthKey.replace(/[^a-zA-Z0-9-]/g, "-")}`;
    state.monthSectionEls.set(monthEntry.monthKey, monthSection);

    const monthTitle = document.createElement("h2");
    monthTitle.className = "calendar-month";
    monthTitle.textContent = monthEntry.monthLabel;
    monthSection.append(monthTitle);

    const strip = document.createElement("div");
    strip.className = "reel-strip";

    let previousDate = null;

    monthEntry.days.forEach((dayEntry) => {
      if (!dayEntry.isUndated && previousDate && dayEntry.dateInfo?.dateUtc) {
        const gap = diffDays(previousDate, dayEntry.dateInfo.dateUtc) - 1;
        if (gap > 0) {
          const gapNode = document.createElement("div");
          gapNode.className = "reel-gap";
          gapNode.innerHTML = `
            <span class="reel-gap-perf left"></span>
            <span class="reel-gap-perf right"></span>
            <span class="reel-gap-label">未曝光 ${gap} 天</span>
          `;
          strip.append(gapNode);
        }
      }

      const frame = document.createElement("button");
      frame.type = "button";
      frame.className = `reel-day-frame ${dayEntry.venueType}`;
      frame.dataset.dayKey = dayEntry.dayKey;

      const dayNum = dayEntry.isUndated ? "--" : String(dayEntry.dateInfo.day).padStart(2, "0");
      const weekday = dayEntry.isUndated ? "未标注" : dayEntry.dateInfo.weekday;
      const fullDate = dayEntry.isUndated ? "未记录具体日期" : dayEntry.dayKey;

      frame.innerHTML = `
        <span class="reel-perf left"></span>
        <span class="reel-perf right"></span>
        <div class="reel-day-date">
          <span class="reel-day-num">${dayNum}</span>
          <span class="reel-day-week">${weekday}</span>
          <span class="reel-day-full">${fullDate}</span>
        </div>
        <div class="reel-day-exposure">
          <p class="reel-day-count">${dayEntry.count} 部影片</p>
          <p class="reel-day-venue">${venueLabel(dayEntry)}</p>
          <p class="reel-day-sample">${dayEntry.sampleTitles || "暂无片名"}</p>
        </div>
      `;

      frame.addEventListener("click", () => {
        setActiveDay(dayEntry.dayKey, { forceRender: true });
      });

      strip.append(frame);
      state.frameEls.set(dayEntry.dayKey, frame);
      revealIndex += 1;

      if (!dayEntry.isUndated) {
        previousDate = dayEntry.dateInfo?.dateUtc || previousDate;
      }
    });

    monthSection.append(strip);
    container.append(monthSection);
  });
}

function renderPosterStage(dayEntry, animate = true) {
  const flow = document.querySelector("#poster-flow");
  flow.innerHTML = "";
  state.posterAnchorEl = null;
  flow.classList.remove("is-refreshed", "is-single-item", "is-two-items", "is-many-items");

  if (!dayEntry || !dayEntry.movies.length) {
    flow.innerHTML = `<div class="day-screening-empty">当前日期暂无海报内容。</div>`;
    return;
  }

  if (dayEntry.movies.length === 1) {
    flow.classList.add("is-single-item");
  } else if (dayEntry.movies.length === 2) {
    flow.classList.add("is-two-items");
  } else {
    flow.classList.add("is-many-items");
  }

  dayEntry.movies.forEach((movie, index) => {
    const title = getMovieTitle(movie);
    const posterSrc = pickPoster(movie);
    const dateLabel = dayEntry.isUndated ? "未记录日期" : dayEntry.dayKey;
    const scoreText = movie._score > 0 ? `${Math.round(movie._score)} 分` : "未评分";

    const card = document.createElement("a");
    card.className = `poster-flow-item ${dayEntry.venueType} ${movie._isTheatrical ? "theatrical" : "non-theatrical"}${index === 0 ? " is-featured" : ""}`;
    card.href = `/movie.html?id=${encodeURIComponent(movie.id)}`;
    card.dataset.dayKey = dayEntry.dayKey;
    card.dataset.movieId = String(movie.id ?? "");

    card.innerHTML = `
      <div class="poster-flow-thumb-wrap">
        ${posterSrc ? `<img class="poster-flow-thumb" src="${posterSrc}" alt="${title} 海报" loading="lazy" />` : ""}
      </div>
      <div class="poster-flow-caption">
        <p class="poster-flow-date">${dateLabel} · ${scoreText}</p>
        <p class="poster-flow-title">《${title}》</p>
        <p class="poster-flow-venue">
          <span class="poster-flow-badge ${movie._isTheatrical ? "theatrical" : "non-theatrical"}">${movieVenueLabel(movie)}</span>
        </p>
      </div>
    `;

    flow.append(card);
    if (index === 0) {
      state.posterAnchorEl = card;
    }
  });

  if (animate) {
    void flow.offsetWidth;
    flow.classList.add("is-refreshed");
  }
}

function updateFocusInfo(dayEntry) {
  const title = document.querySelector("#day-screening-title");
  const meta = document.querySelector("#day-screening-meta");
  const info = document.querySelector("#poster-focus-info");

  if (!dayEntry) {
    title.textContent = "滚动左侧卷轴，右侧同步显影海报";
    meta.textContent = "右侧仅随左侧日期变化，无独立滚动。";
    info.innerHTML = `<div class="day-screening-empty">当前筛选条件下暂无可展示日期。</div>`;
    return;
  }

  const label = dayEntry.isUndated ? "未记录日期" : dayEntry.dayKey;
  title.textContent = `${label} · 聚焦展映`;
  meta.textContent = `共 ${dayEntry.count} 部 · 院线 ${dayEntry.theatricalCount} 部 · 非院线 ${dayEntry.nonTheatricalCount} 部`;

  info.innerHTML = `
    <ul class="poster-focus-list">
      ${dayEntry.movies
        .map(
          (movie) => `
        <li class="poster-focus-item ${movie._isTheatrical ? "theatrical" : "non-theatrical"}">
          <span class="poster-focus-venue">${movie._isTheatrical ? "院线" : "非院线"}</span>
          <a href="/movie.html?id=${encodeURIComponent(movie.id)}">《${getMovieTitle(movie)}》</a>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function updateConnector() {
  const connector = document.querySelector("#reel-connector");
  const beam = document.querySelector("#reel-connector-beam");
  const line = document.querySelector("#reel-connector-line");
  const layout = document.querySelector(".reel-layout");
  const frame = state.frameEls.get(state.activeDayKey);
  const poster = state.posterAnchorEl;

  if (!connector || !beam || !line || !layout || !frame || !poster || window.innerWidth <= 980) {
    if (line) {
      line.setAttribute("opacity", "0");
    }
    if (beam) {
      beam.setAttribute("opacity", "0");
    }
    return;
  }

  const layoutRect = layout.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const posterRect = poster.getBoundingClientRect();

  const x1 = frameRect.right - layoutRect.left;
  const y1 = frameRect.top + frameRect.height / 2 - layoutRect.top;
  const x2 = posterRect.left - layoutRect.left;
  const y2 = posterRect.top + posterRect.height / 2 - layoutRect.top;
  const distanceX = Math.max(80, Math.abs(x2 - x1));
  const controlOffset = Math.max(74, distanceX * 0.36);
  const c1x = x1 + controlOffset;
  const c1y = y1;
  const c2x = x2 - controlOffset * 0.7;
  const c2y = y2;
  const path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;

  connector.setAttribute("viewBox", `0 0 ${layoutRect.width} ${layoutRect.height}`);
  beam.setAttribute("d", path);
  line.setAttribute("d", path);
  beam.setAttribute("opacity", "1");
  line.setAttribute("opacity", "1");
}

function applyActiveFrameClasses() {
  state.frameEls.forEach((frame, dayKey) => {
    frame.classList.toggle("is-active", dayKey === state.activeDayKey);
  });
}

function syncLayoutFocusTheme(dayEntry) {
  const layout = document.querySelector(".reel-layout");
  if (!layout) {
    return;
  }

  if (!dayEntry) {
    delete layout.dataset.focusVenue;
    return;
  }

  layout.dataset.focusVenue = dayEntry.venueType;
}

function setActiveDay(dayKey, { forceRender = false } = {}) {
  if (!dayKey || !state.dayMap.has(dayKey)) {
    return;
  }

  const dayEntry = state.dayMap.get(dayKey);
  const changed = state.activeDayKey !== dayKey;

  if (changed) {
    state.activeDayKey = dayKey;
  }

  if (changed || forceRender) {
    applyActiveFrameClasses();
    syncLayoutFocusTheme(dayEntry);
    updateMonthIndexActive();
    updateFocusInfo(dayEntry);
    renderPosterStage(dayEntry, changed);
    requestAnimationFrame(() => {
      updateConnector();
    });
    return;
  }

  updateConnector();
}

function syncActiveDayByViewport() {
  if (!state.orderedDayKeys.length) {
    return;
  }

  const viewportMid = window.innerHeight * 0.5;
  let bestKey = "";
  let bestDistance = Number.POSITIVE_INFINITY;

  const visibleKeys = [];
  state.orderedDayKeys.forEach((dayKey) => {
    const frame = state.frameEls.get(dayKey);
    if (!frame) {
      return;
    }

    const rect = frame.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - viewportMid);

    const intersects = rect.bottom > 0 && rect.top < window.innerHeight;
    if (intersects) {
      visibleKeys.push({ dayKey, distance });
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestKey = dayKey;
    }
  });

  if (visibleKeys.length) {
    visibleKeys.sort((a, b) => a.distance - b.distance);
    bestKey = visibleKeys[0].dayKey;
  }

  setActiveDay(bestKey);
}

function requestScrollSync() {
  if (state.scrollRaf) {
    return;
  }

  state.scrollRaf = requestAnimationFrame(() => {
    state.scrollRaf = 0;
    syncActiveDayByViewport();
  });
}

function bindScrollSync() {
  if (state.listenersBound) {
    return;
  }

  window.addEventListener("scroll", requestScrollSync, { passive: true });
  window.addEventListener("resize", requestScrollSync, { passive: true });
  state.listenersBound = true;
}

function renderHall() {
  const filtered =
    state.activeTag === "全部"
      ? state.movies
      : state.movies.filter((movie) => (Array.isArray(movie.tags) ? movie.tags : []).includes(state.activeTag));

  if (!filtered.length) {
    document.querySelector("#calendar-reel").innerHTML = `<div class="empty">当前标签下暂无可展示的观影记录。</div>`;
    document.querySelector("#poster-flow").innerHTML = "";
    document.querySelector("#poster-focus-info").innerHTML = `<div class="day-screening-empty">暂无可展示的日展映内容。</div>`;
    document.querySelector("#calendar-month-index").innerHTML = "";
    document.querySelector("#day-screening-title").textContent = "滚动左侧卷轴，右侧同步显影海报";
    document.querySelector("#day-screening-meta").textContent = "右侧仅随左侧日期变化，无独立滚动。";
    state.frameEls.clear();
    state.monthSectionEls.clear();
    state.monthIndexBtns.clear();
    state.dayMap.clear();
    state.orderedDayKeys = [];
    state.activeDayKey = "";
    state.posterAnchorEl = null;
    syncLayoutFocusTheme(null);
    updateConnector();
    return;
  }

  state.monthEntries = buildMonthEntries(filtered);
  state.dayMap = new Map();
  state.monthEntries.forEach((monthEntry) => {
    monthEntry.days.forEach((dayEntry) => {
      state.dayMap.set(dayEntry.dayKey, dayEntry);
    });
  });

  state.orderedDayKeys = flattenDayKeys();
  ensureActiveDay();

  renderReel();
  renderMonthIndex();
  setActiveDay(state.activeDayKey, { forceRender: true });
}

async function init() {
  mountYear();

  try {
    const movies = await loadMovies();
    state.movies = prepareMovies(movies);
    renderTagFilters();
    renderHall();
    bindScrollSync();
    requestScrollSync();
  } catch (error) {
    console.error(error);
    document.querySelector("#calendar-reel").innerHTML = `<div class="empty">电影数据读取失败，请检查 /data/movies.json。</div>`;
    document.querySelector("#poster-flow").innerHTML = "";
    document.querySelector("#poster-focus-info").innerHTML = `<div class="day-screening-empty">无法加载日展映内容。</div>`;
  }
}

init();
