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
