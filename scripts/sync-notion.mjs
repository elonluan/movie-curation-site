import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const DEFAULT_DATABASE_ID = "45324c28-0a20-8356-bdf6-81cbbdd77f76";
const NOTION_VERSION = "2022-06-28";
const OUTPUT_PATH = path.resolve(process.cwd(), "public/data/movies.json");

const DIMENSION_FIELDS = [
  "沉浸与节奏体感",
  "情绪牵引与回响",
  "共鸣与私人投射",
  "记忆度与“想再见一次”",
  "叙事设计与结构控制",
  "人物系统与表演调度",
  "视听语言与形式统一",
  "风格自洽与作者性",
  "创新与冒险",
  "思想密度与问题意识",
  "现实观察与真实性",
  "文化语境与表达边界",
  "影响力与作品地位"
];

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
const onlyOnsite = process.env.NOTION_ONLY_ONSITE !== "false";

if (!token) {
  console.warn("[sync:notion] NOTION_TOKEN 未设置，跳过同步并保留现有 public/data/movies.json。");
  process.exit(0);
}

const pages = await queryAllMovies({ token, databaseId, onlyOnsite });
const transformed = transformPages(pages);
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(transformed, null, 2)}\n`, "utf8");

console.log(
  `[sync:notion] 已同步 ${transformed.length} 条电影到 ${path.relative(process.cwd(), OUTPUT_PATH)}。`
);

async function queryAllMovies({ token: notionToken, databaseId: dbId, onlyOnsite: onlySite }) {
  const url = `https://api.notion.com/v1/databases/${dbId}/query`;
  const pages = [];
  let nextCursor = undefined;

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

function transformPages(pages) {
  const usedIds = new Set();

  const movies = pages
    .map((page) => toMovie(page, usedIds))
    .filter(Boolean)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return movies;
}

function toMovie(page, usedIds) {
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

  const baseId = makeBaseId({
    title: titleOriginal || titleZh,
    year,
    pageId: page.id
  });
  const id = ensureUniqueId(baseId, usedIds);

  const movie = {
    id,
    titleZh,
    titleOriginal: titleOriginal || titleZh,
    year: year ?? new Date().getFullYear(),
    country: countryList.join(" / ") || "未知",
    director: director || "未知",
    rating: deriveRating(p),
    tags: normalizeTags(typeTags),
    logline: getRichText(p["一句话短评"]).trim() || "",
    note: getRichText(p["网站说明"]).trim() || "",
    posterTone: pickPosterTone(id),
    featured: getCheckbox(p["首页精选"]) || false
  };

  const poster = getFirstFileUrl(p["海报"]);
  if (poster) {
    movie.poster = poster;
  }

  return movie;
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

function deriveRating(properties) {
  const total = normalizeRating(formulaToNumber(properties["实际总分"]));
  if (total !== null) {
    return total;
  }

  const scores = DIMENSION_FIELDS.map((name) => getNumber(properties[name])).filter(
    (value) => value !== null
  );

  if (!scores.length) {
    return 0;
  }

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const scaled = average <= 5 ? average * 2 : average;
  return round1(clamp(scaled, 0, 10));
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
