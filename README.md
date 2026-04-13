# FinGlobe（金融事件可视化地球仪）

个人使用的宏观经济与地缘政治事件 3D 可视化追踪看板，右侧提供全球宏观金融实时看板，并支持点击指标弹出价格波动图。

## 本地开发

```bash
npm install
npm run dev
```

## 部署到 Vercel（上线 + 可收录）

本仓库已包含 [vercel.json](file:///d:/Trae/Financial_Earth/vercel.json)，支持静态站点部署 + Serverless API。

1. 将代码推到 GitHub
2. Vercel → Add New → Project → Import GitHub Repo
3. Build Command：`npm run build`
4. Output Directory：`dist`
5. 设置环境变量（Project Settings → Environment Variables）
   - `TWELVE_DATA_API_KEY`：Twelve Data API Key（用于右侧宏观指标与 K 线/波动图）
   - `SUPABASE_URL`：Supabase 项目 URL
   - `SUPABASE_SERVICE_ROLE_KEY`：Supabase Service Role Key（用于服务端读写 events 表）
   - `INGEST_SECRET`（可选）：调用 `/api/cron/ingest-events` 的鉴权密钥
6. 部署成功后，把域名填入：
   - [robots.txt](file:///d:/Trae/Financial_Earth/public/robots.txt) 的 `Sitemap` 地址
   - [sitemap.xml](file:///d:/Trae/Financial_Earth/public/sitemap.xml) 的 `loc`
7. 去 Google Search Console / Bing Webmaster Tools 提交站点与 sitemap

## Supabase（事件数据库）

1. 在 Supabase 创建项目
2. 打开 SQL Editor，运行 [schema.sql](file:///d:/Trae/Financial_Earth/supabase/schema.sql)
3. 在 Vercel 环境变量中配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`
4. API 读取事件：
   - `GET /api/events?days=7&limit=100`

## 指标实时数据（Twelve Data）

右侧“全球宏观金融实时看板”会从：
- `GET /api/indicators` 拉取最新价与涨跌幅（默认 15 秒刷新）
- 弹窗会从 `GET /api/ohlc?symbol=<id>&range=<1D|1W|1M|3M|1Y>` 拉取 OHLC 数据用于绘图

如 Twelve Data 对某些指数/商品代码不兼容，可在 [api/indicators.ts](file:///d:/Trae/Financial_Earth/api/indicators.ts) 与 [api/ohlc.ts](file:///d:/Trae/Financial_Earth/api/ohlc.ts) 中调整 symbol 映射。
