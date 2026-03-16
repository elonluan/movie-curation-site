import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const DEFAULT_DATABASE_ID = "45324c28-0a20-8356-bdf6-81cbbdd77f76";
const NOTION_VERSION = "2022-06-28";
const OUTPUT_PATH = path.resolve(process.cwd(), "public/data/movies.json");

const DIMENSION_KEYS = {
  personal: {
    immersion: "沉浸与节奏体感",
    emotion: "情绪牵引与回响",
    resonance: "共鸣与私人投射",
    revisit: "记忆度与“想再见一次”"
  },
  art: {
    narrative: "叙事设计与结构控制",
    performance: "人物系统与表演调度",
    audiovisual: "视听语言与形式统一",
    style: "风格自洽与作者性",
    innovation: "创新与冒险"
  },
  external: {
    ideas: "思想密度与问题意识",
    realism: "现实观察与真实性",
    context: "文化语境与表达边界",
    influence: "影响力与作品地位"
  }
};

const POSTER_TONES = [
  "amber",
  "slate",
  "mist",
  "paper",
  "mono",
  "rust",
  "forest",
  "charcoal",
  "rose",
  "olive",
  "sunset",
  "earth",
  "oxide",
  "ink"
];

loadEnvFiles([".env.local", ".env"]);

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID || DEFAULT_DATABASE_ID;
const onlyOnsite = process.env.NOTION_ONLY_ONSITE === "true";

if (!token) {
  console.warn("[sync:notion] NOTION_TOKEN 未设置，跳过同步并保留现有 public/data/movies.json。");
  process.exit(0);
}

const pages = await queryAllMovies({ token, databaseId, onlyOnsite });
const transformed = await transformPages(pages, { token });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(transformed, null, 2)}\n`, "utf8");

console.log(
  `[sync:notion] 已同步 ${transformed.length} 条电影到 ${path.relative(process.cwd(), OUTPUT_PATH)}。`
);

async function queryAllMovies({ token: notionToken, databaseId: dbId, onlyOnsite: onlySite }) {
  const url = `https://api.notion.com/v1/databases/${dbId}/query`;
  const pages = [];
  let nextCursor;

  do {
    const body = {
      page_size: 100,
      sorts: [{ property: "年份", direction: "descending" }]
    };

    if (onlySite) {
      body.filter = {
        property: "上站",
        checkbox: { equals: true }
      };
    }

    if (nextCursor) {
      body.start_cursor = nextCursor;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`[sync:notion] Notion API 请求失败 (${response.status}): ${text}`);
    }

    const json = await response.json();
    pages.push(...json.results);
    nextCursor = json.has_more ? json.next_cursor : undefined;
  } while (nextCursor);

  return pages;
}

async function transformPages(pages, { token: notionToken }) {
  const usedIds = new Set();
  const movies = [];

  for (const page of pages) {
    const movie = await toMovie(page, usedIds, { token: notionToken });
    if (movie) {
      movies.push(movie);
    }
  }

  return movies.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

async function toMovie(page, usedIds, { token: notionToken }) {
  const p = page.properties ?? {};

  const titleZh = getTitle(p["电影名"]).trim();
  if (!titleZh) {
    return null;
  }

  const titleOriginal = getRichText(p["原文片名"]).trim();
  const year = normalizeYear(getNumber(p["年份"]));
  const countryList = getMultiSelect(p["地区"]);
  const typeTags = getMultiSelect(p["类型"]);
  const director = getRichText(p["导演"]).trim();
  const watchDate = getDateStart(p["观影日期"]);

  const baseId = makeBaseId({
    title: titleOriginal || titleZh,
    year,
    pageId: page.id
  });
  const id = ensureUniqueId(baseId, usedIds);

  const dimensionScores = collectDimensionScores(p);
  const summaryScores = collectSummaryScores(p, dimensionScores);
  const coreDimension = normalizeCoreDimension(getFormulaString(p["核心维度"])) || inferCoreDimension(summaryScores);
  const note = await readPageBodyNote({
    token: notionToken,
    pageId: page.id,
    fallback: ""
  });

  const movie = {
    id,
    titleZh,
    titleOriginal: titleOriginal || titleZh,
    year: year ?? new Date().getFullYear(),
    country: countryList.join(" / ") || "未知",
    director: director || "未知",
    rating: deriveDisplayRating(summaryScores, p),
    tags: normalizeTags(typeTags),
    logline: getRichText(p["一句话短评"]).trim() || "",
    note,
    watchDate,
    posterTone: pickPosterTone(id),
    featured: getCheckbox(p["首页精选"]),
    onSite: getCheckbox(p["上站"]),
    isTheatrical: getTheatricalFlag(p),
    coreDimension,
    summaryScores,
    dimensionScores
  };

  const poster = getFirstFileUrl(p["海报"]);
  if (poster) {
    movie.poster = poster;
  }

  return movie;
}

async function readPageBodyNote({ token: notionToken, pageId, fallback = "" }) {
  if (!notionToken || !pageId) {
    return fallback;
  }

  try {
    const blocks = await fetchAllBlockChildren({ token: notionToken, blockId: pageId });
    const lines = await flattenBlockLines({ token: notionToken, blocks, depth: 0 });
    const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return text || fallback;
  } catch (error) {
    console.warn(`[sync:notion] 页面正文读取失败 (${pageId}): ${error.message}`);
    return fallback;
  }
}

async function flattenBlockLines({ token: notionToken, blocks, depth }) {
  const lines = [];

  for (const block of blocks) {
    const line = blockToLine(block, depth);
    if (line) {
      lines.push(line);
    }

    if (block.has_children && depth < 4) {
      const children = await fetchAllBlockChildren({ token: notionToken, blockId: block.id });
      const childLines = await flattenBlockLines({
        token: notionToken,
        blocks: children,
        depth: depth + 1
      });
      lines.push(...childLines);
    }
  }

  return lines;
}

function blockToLine(block, depth) {
  if (!block || !block.type) {
    return "";
  }

  const indent = "  ".repeat(depth);
  const richText = readBlockRichText(block);
  const text = normalizeLineBreaks(richText).trim();
  if (!text) {
    return "";
  }

  if (block.type === "heading_1") {
    return `${indent}# ${text}`;
  }

  if (block.type === "heading_2") {
    return `${indent}## ${text}`;
  }

  if (block.type === "heading_3") {
    return `${indent}### ${text}`;
  }

  if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
    return `${indent}- ${text}`;
  }

  if (block.type === "to_do") {
    const checked = Boolean(block.to_do?.checked);
    return `${indent}${checked ? "[x]" : "[ ]"} ${text}`;
  }

  if (block.type === "quote") {
    return `${indent}> ${text}`;
  }

  return `${indent}${text}`;
}

function readBlockRichText(block) {
  const type = block?.type;
  if (!type) {
    return "";
  }

  const payload = block[type];
  if (!payload) {
    return "";
  }

  if (Array.isArray(payload.rich_text)) {
    return joinRichText(payload.rich_text);
  }

  if (type === "table_row" && Array.isArray(payload.cells)) {
    return payload.cells.map((cell) => joinRichText(cell)).filter(Boolean).join(" | ");
  }

  if (type === "child_page") {
    return payload.title ?? "";
  }

  return "";
}

function joinRichText(richText) {
  if (!Array.isArray(richText)) {
    return "";
  }
  return richText.map((item) => item?.plain_text || "").join("");
}

function normalizeLineBreaks(text) {
  return String(text || "").replace(/\r\n?/g, "\n");
}

async function fetchAllBlockChildren({ token: notionToken, blockId }) {
  const all = [];
  let nextCursor;

  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (nextCursor) {
      params.set("start_cursor", nextCursor);
    }

    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": NOTION_VERSION
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`[sync:notion] 读取 block children 失败 (${response.status}): ${text}`);
    }

    const json = await response.json();
    all.push(...(json.results || []));
    nextCursor = json.has_more ? json.next_cursor : undefined;
  } while (nextCursor);

  return all;
}

function collectDimensionScores(properties) {
  return {
    personal: {
      immersion: getNumber(properties[DIMENSION_KEYS.personal.immersion]),
      emotion: getNumber(properties[DIMENSION_KEYS.personal.emotion]),
      resonance: getNumber(properties[DIMENSION_KEYS.personal.resonance]),
      revisit: getNumber(properties[DIMENSION_KEYS.personal.revisit])
    },
    art: {
      narrative: getNumber(properties[DIMENSION_KEYS.art.narrative]),
      performance: getNumber(properties[DIMENSION_KEYS.art.performance]),
      audiovisual: getNumber(properties[DIMENSION_KEYS.art.audiovisual]),
      style: getNumber(properties[DIMENSION_KEYS.art.style]),
      innovation: getNumber(properties[DIMENSION_KEYS.art.innovation])
    },
    external: {
      ideas: getNumber(properties[DIMENSION_KEYS.external.ideas]),
      realism: getNumber(properties[DIMENSION_KEYS.external.realism]),
      context: getNumber(properties[DIMENSION_KEYS.external.context]),
      influence: getNumber(properties[DIMENSION_KEYS.external.influence])
    }
  };
}

function collectSummaryScores(properties, dims) {
  const personalSingle =
    formulaToNumber(properties["个人单项"]) ??
    weightedSum(dims.personal, { immersion: 6, emotion: 6, resonance: 4, revisit: 4 });

  const artSingle =
    formulaToNumber(properties["艺术单项"]) ??
    weightedSum(dims.art, { narrative: 6, performance: 4, audiovisual: 6, style: 2, innovation: 2 });

  const externalSingle =
    formulaToNumber(properties["外部单项"]) ??
    weightedSum(dims.external, { ideas: 6, realism: 6, context: 6, influence: 2 });

  const personal =
    formulaToNumber(properties["个人汇总"]) ??
    mixWeights(personalSingle, artSingle, externalSingle, { personal: 0.7, art: 0.2, external: 0.1 });

  const art =
    formulaToNumber(properties["艺术汇总"]) ??
    mixWeights(personalSingle, artSingle, externalSingle, { personal: 0.3, art: 0.6, external: 0.1 });

  const external =
    formulaToNumber(properties["外部汇总"]) ??
    mixWeights(personalSingle, artSingle, externalSingle, { personal: 0.3, art: 0.2, external: 0.5 });

  const total = formulaToNumber(properties["实际总分"]) ?? Math.max(personal, art, external);

  return {
    personal: normalizePercent(personal),
    art: normalizePercent(art),
    external: normalizePercent(external),
    total: normalizePercent(total),
    personalSingle: normalizePercent(personalSingle),
    artSingle: normalizePercent(artSingle),
    externalSingle: normalizePercent(externalSingle)
  };
}

function weightedSum(scores, weights) {
  let sum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    sum += (scores[key] ?? 0) * weight;
  }
  return sum;
}

function mixWeights(personal, art, external, weights) {
  return personal * weights.personal + art * weights.art + external * weights.external;
}

function deriveDisplayRating(summaryScores, properties) {
  const total = summaryScores.total;
  if (Number.isFinite(total) && total > 0) {
    return round1(clamp(total / 10, 0, 10));
  }

  const fallback = normalizeRating(formulaToNumber(properties["实际总分"]));
  return fallback ?? 0;
}

function normalizeCoreDimension(value) {
  if (!value) {
    return "";
  }

  if (value.includes("个人")) {
    return "个人";
  }

  if (value.includes("艺术")) {
    return "艺术";
  }

  if (value.includes("外部")) {
    return "外部";
  }

  return "";
}

function inferCoreDimension(summaryScores) {
  const pairs = [
    ["个人", summaryScores.personal],
    ["艺术", summaryScores.art],
    ["外部", summaryScores.external]
  ];
  pairs.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  return pairs[0]?.[0] ?? "";
}

function normalizePercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return round1(clamp(value, 0, 100));
}

function getTitle(prop) {
  if (!prop || prop.type !== "title") {
    return "";
  }
  return prop.title.map((item) => item.plain_text || "").join("");
}

function getRichText(prop) {
  if (!prop) {
    return "";
  }

  if (prop.type === "rich_text") {
    return prop.rich_text.map((item) => item.plain_text || "").join("");
  }

  if (prop.type === "formula") {
    return formulaToString(prop.formula);
  }

  return "";
}

function getNumber(prop) {
  if (!prop || prop.type !== "number") {
    return null;
  }
  return Number.isFinite(prop.number) ? prop.number : null;
}

function getCheckbox(prop) {
  if (!prop || prop.type !== "checkbox") {
    return false;
  }
  return Boolean(prop.checkbox);
}

function getMultiSelect(prop) {
  if (!prop || prop.type !== "multi_select") {
    return [];
  }
  return prop.multi_select.map((item) => item.name).filter(Boolean);
}

function getDateStart(prop) {
  if (!prop || prop.type !== "date" || !prop.date?.start) {
    return "";
  }
  return prop.date.start;
}

function getTheatricalFlag(properties) {
  const candidateNames = ["是否院线", "院线", "院线观影", "观影场景"];

  for (const name of candidateNames) {
    const prop = properties[name];
    if (!prop) {
      continue;
    }

    const parsed = propertyToBoolean(prop);
    if (parsed !== null) {
      return parsed;
    }
  }

  return false;
}

function propertyToBoolean(prop) {
  if (!prop) {
    return null;
  }

  if (prop.type === "checkbox") {
    return Boolean(prop.checkbox);
  }

  if (prop.type === "select") {
    return textToBoolean(prop.select?.name);
  }

  if (prop.type === "status") {
    return textToBoolean(prop.status?.name);
  }

  if (prop.type === "multi_select") {
    if (!Array.isArray(prop.multi_select) || prop.multi_select.length === 0) {
      return null;
    }
    const flags = prop.multi_select.map((item) => textToBoolean(item.name)).filter((v) => v !== null);
    return flags.length ? flags[0] : null;
  }

  if (prop.type === "rich_text") {
    const text = prop.rich_text.map((item) => item.plain_text || "").join("");
    return textToBoolean(text);
  }

  if (prop.type === "formula") {
    const formula = prop.formula;
    if (!formula) {
      return null;
    }
    if (formula.type === "boolean") {
      return Boolean(formula.boolean);
    }
    if (formula.type === "number" && Number.isFinite(formula.number)) {
      return formula.number > 0;
    }
    if (formula.type === "string") {
      return textToBoolean(formula.string);
    }
    return null;
  }

  return null;
}

function textToBoolean(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const falseHints = ["非院线", "不是院线", "否", "no", "false", "home", "stream"];
  const trueHints = ["院线", "影院", "yes", "true", "cinema", "theater", "theatre"];

  if (falseHints.some((hint) => normalized.includes(hint))) {
    return false;
  }

  if (trueHints.some((hint) => normalized.includes(hint))) {
    return true;
  }

  return null;
}

function getFirstFileUrl(prop) {
  if (!prop || prop.type !== "files" || !Array.isArray(prop.files)) {
    return "";
  }

  const first = prop.files[0];
  if (!first) {
    return "";
  }

  if (first.type === "external" && first.external?.url) {
    return first.external.url;
  }

  if (first.type === "file" && first.file?.url) {
    return first.file.url;
  }

  return "";
}

function getFormulaString(prop) {
  if (!prop || prop.type !== "formula") {
    return "";
  }

  const formula = prop.formula;
  if (!formula) {
    return "";
  }

  if (formula.type === "string") {
    return formula.string ?? "";
  }

  if (formula.type === "number" && Number.isFinite(formula.number)) {
    return String(formula.number);
  }

  if (formula.type === "boolean") {
    return formula.boolean ? "true" : "false";
  }

  return "";
}

function formulaToString(formula) {
  if (!formula) {
    return "";
  }

  if (formula.type === "string") {
    return formula.string ?? "";
  }

  if (formula.type === "number" && Number.isFinite(formula.number)) {
    return String(formula.number);
  }

  if (formula.type === "boolean") {
    return formula.boolean ? "true" : "false";
  }

  return "";
}

function formulaToNumber(prop) {
  if (!prop || prop.type !== "formula") {
    return null;
  }

  const formula = prop.formula;
  if (!formula) {
    return null;
  }

  if (formula.type === "number" && Number.isFinite(formula.number)) {
    return formula.number;
  }

  if (formula.type === "string") {
    return parseNumericText(formula.string);
  }

  return null;
}

function parseNumericText(input) {
  if (!input || typeof input !== "string") {
    return null;
  }

  const match = input.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function normalizeRating(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value <= 5) {
    return round1(value * 2);
  }

  if (value <= 10) {
    return round1(value);
  }

  if (value <= 100) {
    return round1(value / 10);
  }

  return null;
}

function normalizeYear(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const year = Math.round(value);
  return year > 1800 && year < 2200 ? year : null;
}

function normalizeTags(tags) {
  const unique = Array.from(new Set(tags.filter(Boolean)));
  return unique.length ? unique : ["未分类"];
}

function makeBaseId({ title, year, pageId }) {
  const raw = slugify(title);
  const fallback = `movie-${String(pageId || "").replace(/-/g, "").slice(0, 8) || "item"}`;
  const prefix = raw || fallback;
  return year ? `${prefix}-${year}` : prefix;
}

function ensureUniqueId(base, usedIds) {
  let id = base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickPosterTone(seed) {
  const hash = hashCode(seed);
  const index = Math.abs(hash) % POSTER_TONES.length;
  return POSTER_TONES[index];
}

function hashCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadEnvFiles(files) {
  for (const filename of files) {
    const fullPath = path.resolve(process.cwd(), filename);
    const content = safeReadFile(fullPath);
    if (!content) {
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) {
        continue;
      }

      const key = match[1];
      let value = match[2];

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function safeReadFile(filePath) {
  try {
    return fsSync.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}
