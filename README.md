# 帧间档案（第一版）

一个个人策展式电影展示静态站，包含：
- 首页（策展入口）
- 电影列表页（海报卡片 + 标签筛选）
- 电影详情页
- About 页面

## 技术方案
- 原生 `HTML + CSS + JavaScript`
- `Vite` 仅用于本地开发预览和静态构建
- 本地 JSON 数据源：`/data/movies.json`

这套方案对新手友好：
- 文件结构直接、无框架心智负担
- 后续扩展可逐步演进到组件化框架
- 目前就能稳定输出静态站

## 本地运行

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:5173`

## 对接 Notion（Movies Plus）

项目已接入 Notion 构建前同步脚本：`/scripts/sync-notion.mjs`。

### 1) 配置环境变量

复制配置模板并填写 token：

```bash
cp .env.example .env.local
```

- `NOTION_TOKEN`: Notion integration token（需要对 `Movies Plus` 数据库有读取权限）
- `NOTION_DATABASE_ID`: 默认已填 `45324c28-0a20-8356-bdf6-81cbbdd77f76`
- `NOTION_ONLY_ONSITE`: 默认为 `true`，只同步勾选了“上站”的电影

### 2) 手动同步

```bash
npm run sync:data
```

同步后会覆盖：`/data/movies.json`。

### 3) 自动同步

- `npm run dev` 前会自动执行一次 `sync:data`
- `npm run build` 前也会自动执行一次 `sync:data`

### Notion 字段映射

- `电影名` -> `titleZh`
- `原文片名` -> `titleOriginal`
- `年份` -> `year`
- `地区` -> `country`
- `导演` -> `director`
- `类型` -> `tags`
- `一句话短评` -> `logline`
- `网站说明` -> `note`
- `首页精选` -> `featured`
- `海报` -> `poster`
- `实际总分`（或维度均分）-> `rating`

## 数据维护

电影数据在：`/data/movies.json`

单条示例结构：

```json
{
  "id": "in-the-mood-for-love",
  "titleZh": "花样年华",
  "titleOriginal": "In the Mood for Love",
  "year": 2000,
  "country": "中国香港",
  "director": "王家卫",
  "rating": 9.2,
  "tags": ["都市", "情感", "东方色彩"],
  "logline": "错过被拍成了最缓慢也最热烈的电影。",
  "note": "雨巷、走廊、旗袍与音乐一起构成了时间的纹理。",
  "posterTone": "amber",
  "featured": true
}
```

字段说明：
- `id`: 唯一标识，用于详情页 URL（`/movie.html?id=...`）
- `featured`: 是否出现在首页精选区
- `poster`: 可选。若留空，将自动生成风格化占位海报
- `posterTone`: 占位海报配色主题

## 第一版已实现
- 首页策展入口
- 电影卡片列表
- 基础标签筛选
- 点击进入详情页
- 响应式布局
- 清晰目录结构，便于继续添加内容
