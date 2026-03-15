import { createMovieCard, loadMovies, mountYear } from "./common.js";

const MAP_DATA_PATH = "/data/world-countries.geojson";
const MAP_WIDTH = 980;
const MAP_HEIGHT = 520;
const PREVIEW_SAMPLE_SIZE = 3;
const SVG_NS = "http://www.w3.org/2000/svg";

const COUNTRY_META = {
  中国大陆: {
    mapName: "China",
    aliases: ["中国", "China Mainland", "Mainland China"]
  },
  中国台湾: {
    mapName: "Taiwan",
    aliases: ["台湾", "Taiwan"]
  },
  中国香港: {
    mapName: null,
    marker: [114.1694, 22.3193],
    aliases: ["香港", "Hong Kong", "Hong Kong SAR"]
  },
  美国: {
    mapName: "United States of America",
    aliases: ["USA", "US", "United States", "America"]
  },
  英国: {
    mapName: "United Kingdom",
    aliases: ["UK", "U.K.", "Great Britain", "Britain", "England"]
  },
  日本: {
    mapName: "Japan",
    aliases: ["Japan"]
  },
  韩国: {
    mapName: "South Korea",
    aliases: ["Korea", "Korea, Republic of", "South Korea"]
  },
  法国: {
    mapName: "France",
    aliases: ["France"]
  },
  德国: {
    mapName: "Germany",
    aliases: ["Germany"]
  },
  意大利: {
    mapName: "Italy",
    aliases: ["Italy"]
  },
  西班牙: {
    mapName: "Spain",
    aliases: ["Spain"]
  },
  瑞士: {
    mapName: "Switzerland",
    aliases: ["Switzerland"]
  },
  加拿大: {
    mapName: "Canada",
    aliases: ["Canada"]
  },
  澳大利亚: {
    mapName: "Australia",
    aliases: ["Australia"]
  },
  比利时: {
    mapName: "Belgium",
    aliases: ["Belgium"]
  },
  波兰: {
    mapName: "Poland",
    aliases: ["Poland"]
  },
  拉脱维亚: {
    mapName: "Latvia",
    aliases: ["Latvia"]
  },
  泰国: {
    mapName: "Thailand",
    aliases: ["Thailand"]
  },
  巴西: {
    mapName: "Brazil",
    aliases: ["Brazil"]
  }
};

const COUNTRY_NOTES = {
  日本: "一种在克制、流动与日常之间展开的观看经验。",
  法国: "镜头中的情绪密度与形式感并置，像影展手册的一章。",
  中国大陆: "从现实纹理进入银幕想象，常常在细部里显影。",
  美国: "类型与作者气质并行，构成一条持续扩张的观影主线。",
  英国: "冷静与锋利并存，叙事节奏里常有戏剧性的暗涌。"
};

const mapNameToCountry = new Map(
  Object.entries(COUNTRY_META)
    .filter(([, meta]) => Boolean(meta.mapName))
    .map(([country, meta]) => [meta.mapName, country])
);

const aliasToCountry = buildAliasLookup();

const state = {
  movies: [],
  mapFeatures: [],
  catalogCountries: [],
  countryStats: new Map(),
  activeTag: "全部",
  selectedRegionId: null,
  hoverRegionId: null,
  pathByRegion: new Map(),
  markerByRegion: new Map(),
  lastPointer: { x: 180, y: 120 }
};

function buildAliasLookup() {
  const lookup = new Map();

  Object.entries(COUNTRY_META).forEach(([country, meta]) => {
    const aliasList = [country, meta.mapName, ...(meta.aliases ?? [])].filter(Boolean);
    aliasList.forEach((alias) => lookup.set(aliasKey(alias), country));
  });

  return lookup;
}

function aliasKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function splitCountries(countryRaw) {
  if (typeof countryRaw !== "string") {
    return ["未知地区"];
  }

  const prepared = countryRaw
    .replace(/／/g, "/")
    .replace(/[、，,;；]/g, "/")
    .replace(/&/g, "/")
    .replace(/\s+与\s+/g, "/")
    .replace(/\s+和\s+/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .trim();

  const parts = prepared
    .split("/")
    .map((part) => normalizeCountryToken(part))
    .filter(Boolean);

  if (!parts.length) {
    return ["未知地区"];
  }

  return Array.from(new Set(parts));
}

function normalizeCountryToken(token) {
  const clean = String(token ?? "").trim();
  if (!clean) {
    return "";
  }

  const aliasMatched = aliasToCountry.get(aliasKey(clean));
  return aliasMatched || clean;
}

function watchTimestamp(movie) {
  if (!movie.watchDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const ts = Date.parse(movie.watchDate);
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function totalScore(movie) {
  if (typeof movie?.summaryScores?.total === "number" && Number.isFinite(movie.summaryScores.total)) {
    return movie.summaryScores.total;
  }
  if (typeof movie?.rating === "number" && Number.isFinite(movie.rating)) {
    return movie.rating * 10;
  }
  return 0;
}

function compareByWatchDesc(a, b) {
  const watchDiff = b._watchTs - a._watchTs;
  if (watchDiff !== 0) {
    return watchDiff;
  }

  const scoreDiff = b._score - a._score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return String(a.titleZh ?? "").localeCompare(String(b.titleZh ?? ""), "zh-Hans-CN");
}

function compareForPreview(a, b) {
  const scoreDiff = b._score - a._score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return compareByWatchDesc(a, b);
}

function prepareMovies(movies) {
  return movies.map((movie) => ({
    ...movie,
    _countries: splitCountries(movie.country),
    _watchTs: watchTimestamp(movie),
    _score: totalScore(movie)
  }));
}

function buildCatalogCountries(movies) {
  const counter = new Map();

  movies.forEach((movie) => {
    movie._countries.forEach((country) => {
      counter.set(country, (counter.get(country) || 0) + 1);
    });
  });

  return [...counter.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) {
        return countDiff;
      }
      return a[0].localeCompare(b[0], "zh-Hans-CN");
    })
    .map(([country]) => country);
}

function getAllTags(movies) {
  const tagSet = new Set();
  movies.forEach((movie) => {
    const tags = Array.isArray(movie.tags) ? movie.tags : [];
    tags.forEach((tag) => tagSet.add(tag));
  });
  return ["全部", ...Array.from(tagSet)];
}

function matchesTag(movie) {
  if (state.activeTag === "全部") {
    return true;
  }
  const tags = Array.isArray(movie.tags) ? movie.tags : [];
  return tags.includes(state.activeTag);
}

function recomputeCountryStats() {
  const stats = new Map();

  state.movies.forEach((movie) => {
    if (!matchesTag(movie)) {
      return;
    }

    movie._countries.forEach((country) => {
      if (!stats.has(country)) {
        stats.set(country, []);
      }
      stats.get(country).push(movie);
    });
  });

  stats.forEach((movieList) => movieList.sort(compareByWatchDesc));
  state.countryStats = stats;
}

function regionIdFromFeatureName(featureName) {
  return mapNameToCountry.get(featureName) || `map:${featureName}`;
}

function regionNameFromId(regionId) {
  if (!regionId) {
    return "";
  }
  return regionId.startsWith("map:") ? regionId.slice(4) : regionId;
}

function moviesForRegion(regionId) {
  if (!regionId || regionId.startsWith("map:")) {
    return [];
  }
  return state.countryStats.get(regionId) || [];
}

function projectPoint(lon, lat) {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return [x, y];
}

function ringToPath(ring) {
  if (!Array.isArray(ring) || !ring.length) {
    return "";
  }

  let d = "";
  ring.forEach((coord, index) => {
    if (!Array.isArray(coord) || coord.length < 2) {
      return;
    }
    const [x, y] = projectPoint(coord[0], coord[1]);
    d += `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return d ? `${d}Z` : "";
}

function polygonToPath(rings) {
  if (!Array.isArray(rings)) {
    return "";
  }
  return rings.map(ringToPath).join("");
}

function geometryToPath(geometry) {
  if (!geometry) {
    return "";
  }

  if (geometry.type === "Polygon") {
    return polygonToPath(geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map(polygonToPath).join("");
  }

  return "";
}

function pointerInStage(event) {
  const stage = document.querySelector("#film-map-stage");
  const rect = stage.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function renderTagFilters() {
  const bar = document.querySelector("#country-tag-filter-bar");
  bar.innerHTML = "";

  getAllTags(state.movies).forEach((tag) => {
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = tag;
    button.classList.toggle("active", tag === state.activeTag);

    button.addEventListener("click", () => {
      state.activeTag = tag;
      recomputeCountryStats();
      renderTagFilters();
      renderCountryDirectory();
      updateMapAppearance();
      renderSelectedRegionShowcase();
      if (state.hoverRegionId) {
        renderPreviewCard(state.hoverRegionId, state.lastPointer);
      }
    });

    bar.append(button);
  });
}

function renderCountryDirectory() {
  const bar = document.querySelector("#country-filter-bar");
  bar.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = "filter-btn";
  allButton.type = "button";
  allButton.textContent = "全部地区";
  allButton.classList.toggle("active", !state.selectedRegionId);
  allButton.addEventListener("click", () => setSelectedRegion(null));
  bar.append(allButton);

  state.catalogCountries.forEach((country) => {
    const count = moviesForRegion(country).length;
    const button = document.createElement("button");
    button.className = "filter-btn";
    button.type = "button";
    button.textContent = `${country} (${count})`;
    button.classList.toggle("active", state.selectedRegionId === country);
    button.classList.toggle("is-empty", count === 0);

    button.addEventListener("click", () => {
      setSelectedRegion(country);
    });

    bar.append(button);
  });
}

function buildPreviewPayload(regionId) {
  const name = regionNameFromId(regionId);
  const movies = moviesForRegion(regionId);
  const sampleMovies = [...movies].sort(compareForPreview).slice(0, PREVIEW_SAMPLE_SIZE);

  return {
    name,
    count: movies.length,
    sampleMovies,
    note:
      COUNTRY_NOTES[name] ||
      (movies.length
        ? "从这一地区进入你的观影档案，展开完整展映。"
        : "暂未收录影片，欢迎未来继续扩展这一区域。")
  };
}

function positionPreviewCard(pointer) {
  const stage = document.querySelector("#film-map-stage");
  const card = document.querySelector("#map-preview-card");
  if (!stage || !card || card.hidden) {
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  let left = pointer.x + 18;
  let top = pointer.y + 18;

  if (left + cardRect.width > stageRect.width - 10) {
    left = pointer.x - cardRect.width - 18;
  }
  if (top + cardRect.height > stageRect.height - 10) {
    top = stageRect.height - cardRect.height - 10;
  }

  left = Math.max(10, left);
  top = Math.max(10, top);

  card.style.transform = `translate(${left}px, ${top}px)`;
}

function renderPreviewCard(regionId, pointer) {
  const card = document.querySelector("#map-preview-card");

  if (!regionId) {
    card.hidden = true;
    return;
  }

  const payload = buildPreviewPayload(regionId);
  const sampleText = payload.sampleMovies.map((movie) => `《${movie.titleZh}》`).join("、");

  card.innerHTML = `
    <p class="map-preview-kicker">快速预览</p>
    <h3 class="map-preview-title">${payload.name}</h3>
    <p class="map-preview-count">${payload.count} 部影片</p>
    ${
      payload.sampleMovies.length
        ? `<p class="map-preview-titles">${sampleText}</p>`
        : `<p class="map-preview-empty">暂未收录影片</p>`
    }
    <p class="map-preview-note">${payload.note}</p>
  `;

  card.hidden = false;
  positionPreviewCard(pointer);
  requestAnimationFrame(() => positionPreviewCard(pointer));
}

function clearHoverState() {
  state.hoverRegionId = null;
  const card = document.querySelector("#map-preview-card");
  card.hidden = true;
  updateMapAppearance();
}

function toggleSelectedRegion(regionId) {
  if (state.selectedRegionId === regionId) {
    setSelectedRegion(null);
    return;
  }
  setSelectedRegion(regionId);
}

function setSelectedRegion(regionId) {
  state.selectedRegionId = regionId;
  renderCountryDirectory();
  renderSelectedRegionShowcase();
  renderClearButtons();
  updateMapAppearance();
}

function renderClearButtons() {
  const show = Boolean(state.selectedRegionId);
  document.querySelector("#map-clear-anchor").hidden = !show;
  document.querySelector("#map-clear-panel").disabled = !show;
}

function renderSelectedRegionShowcase() {
  const title = document.querySelector("#map-screening-title");
  const meta = document.querySelector("#map-screening-meta");
  const grid = document.querySelector("#map-screening-grid");
  grid.innerHTML = "";

  if (!state.selectedRegionId) {
    title.textContent = "点击地图中的国家/地区，展开完整片单";
    meta.textContent = "悬停可快速预览代表电影，点击进入完整展映。";
    grid.innerHTML = `<div class="map-screening-empty">当前未选中地区。你可以在地图上点击国家/地区，或使用上方地区目录快速定位。</div>`;
    return;
  }

  const regionName = regionNameFromId(state.selectedRegionId);
  const movies = moviesForRegion(state.selectedRegionId);

  title.textContent = `${regionName} · 展映单元`;

  if (!movies.length) {
    meta.textContent = "0 部影片";
    grid.innerHTML = `<div class="map-screening-empty">该地区在当前筛选条件下暂未收录影片。</div>`;
    return;
  }

  meta.textContent = `共 ${movies.length} 部影片 · 默认按观影日期从新到旧排序`;

  movies.forEach((movie, index) => {
    const card = createMovieCard(movie, { scoreMode: "total" });
    card.classList.add("reveal");
    card.style.animationDelay = `${index * 16}ms`;
    grid.append(card);
  });
}

function wireRegionEvents(target, regionId) {
  target.setAttribute("tabindex", "0");
  target.setAttribute("role", "button");
  target.setAttribute("aria-label", `${regionNameFromId(regionId)} 地区`);

  target.addEventListener("pointerenter", (event) => {
    state.hoverRegionId = regionId;
    state.lastPointer = pointerInStage(event);
    renderPreviewCard(regionId, state.lastPointer);
    updateMapAppearance();
  });

  target.addEventListener("pointermove", (event) => {
    state.hoverRegionId = regionId;
    state.lastPointer = pointerInStage(event);
    renderPreviewCard(regionId, state.lastPointer);
    updateMapAppearance();
  });

  target.addEventListener("pointerleave", () => {
    if (state.hoverRegionId === regionId) {
      clearHoverState();
    }
  });

  target.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleSelectedRegion(regionId);
  });

  target.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSelectedRegion(regionId);
    }
  });
}

function renderMap() {
  const svg = document.querySelector("#film-map-svg");
  svg.innerHTML = "";

  state.pathByRegion.clear();
  state.markerByRegion.clear();

  const regionLayer = document.createElementNS(SVG_NS, "g");
  regionLayer.classList.add("map-region-layer");

  state.mapFeatures.forEach((feature) => {
    const featureName = feature.properties?.name;
    const d = geometryToPath(feature.geometry);

    if (!featureName || !d) {
      return;
    }

    const regionId = regionIdFromFeatureName(featureName);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "map-region");
    path.setAttribute("data-region-id", regionId);

    wireRegionEvents(path, regionId);

    if (!state.pathByRegion.has(regionId)) {
      state.pathByRegion.set(regionId, []);
    }
    state.pathByRegion.get(regionId).push(path);

    regionLayer.append(path);
  });

  svg.append(regionLayer);

  const markerLayer = document.createElementNS(SVG_NS, "g");
  markerLayer.classList.add("map-marker-layer");

  Object.entries(COUNTRY_META).forEach(([country, meta]) => {
    if (!Array.isArray(meta.marker) || meta.marker.length !== 2) {
      return;
    }

    const [x, y] = projectPoint(meta.marker[0], meta.marker[1]);

    const marker = document.createElementNS(SVG_NS, "g");
    marker.setAttribute("class", "map-marker");
    marker.setAttribute("data-region-id", country);
    marker.setAttribute("transform", `translate(${x.toFixed(2)},${y.toFixed(2)})`);

    marker.innerHTML = `
      <circle class="map-marker-hit" r="11"></circle>
      <circle class="map-marker-ring" r="7"></circle>
      <circle class="map-marker-dot" r="3.8"></circle>
    `;

    wireRegionEvents(marker, country);
    state.markerByRegion.set(country, marker);
    markerLayer.append(marker);
  });

  svg.append(markerLayer);

  svg.addEventListener("pointerleave", () => {
    clearHoverState();
  });

  svg.addEventListener("click", (event) => {
    if (event.target.closest(".map-region, .map-marker")) {
      return;
    }
    setSelectedRegion(null);
  });

  updateMapAppearance();
}

function updateMapAppearance() {
  const focused = new Set([state.selectedRegionId, state.hoverRegionId].filter(Boolean));

  const applyStateClass = (regionId, element) => {
    const movieCount = moviesForRegion(regionId).length;
    const hasMovies = movieCount > 0;
    const isHover = state.hoverRegionId === regionId;
    const isSelected = state.selectedRegionId === regionId;
    const isDim = focused.size > 0 && !focused.has(regionId);

    element.classList.toggle("has-movies", hasMovies);
    element.classList.toggle("no-movies", !hasMovies);
    element.classList.toggle("is-hover", isHover);
    element.classList.toggle("is-selected", isSelected);
    element.classList.toggle("is-dim", isDim);
  };

  state.pathByRegion.forEach((paths, regionId) => {
    paths.forEach((path) => applyStateClass(regionId, path));
  });

  state.markerByRegion.forEach((marker, regionId) => {
    applyStateClass(regionId, marker);
  });
}

async function loadMapFeatures() {
  const response = await fetch(MAP_DATA_PATH);
  if (!response.ok) {
    throw new Error("无法加载世界地图数据");
  }

  const geo = await response.json();
  return (geo.features || []).filter(
    (feature) => feature?.properties?.name && feature.properties.name !== "Antarctica" && feature.geometry
  );
}

function bindStaticActions() {
  document.querySelector("#map-clear-anchor").addEventListener("click", () => setSelectedRegion(null));
  document.querySelector("#map-clear-panel").addEventListener("click", () => setSelectedRegion(null));
}

async function init() {
  mountYear();

  try {
    const [movies, mapFeatures] = await Promise.all([loadMovies(), loadMapFeatures()]);

    state.movies = prepareMovies(movies);
    state.mapFeatures = mapFeatures;
    state.catalogCountries = buildCatalogCountries(state.movies);

    bindStaticActions();
    recomputeCountryStats();
    renderTagFilters();
    renderCountryDirectory();
    renderMap();
    renderSelectedRegionShowcase();
    renderClearButtons();
  } catch (error) {
    console.error(error);
    document.querySelector("#film-map-stage").innerHTML = `<div class="empty">地图数据加载失败，请检查 /data/world-countries.geojson。</div>`;
    document.querySelector("#map-screening-grid").innerHTML = `<div class="empty">电影数据读取失败，请稍后重试。</div>`;
  }
}

init();
