type RequestLike = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
}

type NewsApiArticle = {
  title?: string
  description?: string
  content?: string
  url?: string
  publishedAt?: string
  source?: { name?: string }
}

type ExtractedEvent = {
  title: string
  summary: string
  latest_updates: string
  category: string
  lat: number
  lng: number
  occurred_at?: string
  impact: {
    sectors: string[]
    positiveCompanies: string[]
    negativeCompanies: string[]
  }
  sources?: Array<{ url?: string; title?: string; publishedAt?: string; source?: string }>
}

type SourceItem = { url?: string; title?: string; publishedAt?: string; source?: string }

const CODE_VERSION = "2026-04-15.1"

function headerValue(headers: Record<string, string | string[] | undefined> | undefined, key: string) {
  if (!headers) return undefined
  const v = headers[key] ?? headers[key.toLowerCase()]
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

function queryValue(query: Record<string, string | string[] | undefined> | undefined, key: string) {
  if (!query) return undefined
  const v = query[key]
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v[0]
  return undefined
}

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function optionalString(value: string): string | undefined {
  const v = value.trim()
  return v ? v : undefined
}

function clampLatLng(lat: number, lng: number) {
  const clampedLat = Math.max(-85, Math.min(85, lat))
  let clampedLng = lng
  while (clampedLng > 180) clampedLng -= 360
  while (clampedLng < -180) clampedLng += 360
  return { lat: clampedLat, lng: clampedLng }
}

async function sha256Hex(input: string) {
  const { createHash } = await import("crypto")
  return createHash("sha256").update(input).digest("hex")
}

async function fetchNewsArticles(newsApiKey: string, hoursBack: number) {
  const from = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
  const url = new URL("https://newsapi.org/v2/everything")
  url.searchParams.set(
    "q",
    [
      "geopolitics",
      "conflict",
      "economy",
      "finance",
      "disaster",
      "market"
    ].join(" OR ")
  )
  url.searchParams.set("language", "en")
  url.searchParams.set("sortBy", "publishedAt")
  url.searchParams.set("pageSize", "100")
  url.searchParams.set("from", from)

  const resp = await fetch(url.toString(), {
    headers: { "X-Api-Key": newsApiKey },
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(text)
  }

  const data = (await resp.json()) as unknown
  const parsed = data as { status?: string; articles?: NewsApiArticle[]; message?: string }
  if (parsed.status !== "ok" || !Array.isArray(parsed.articles)) {
    throw new Error(parsed.message ?? "NewsAPI error")
  }
  return parsed.articles
}

function buildDeepSeekPrompt(articles: NewsApiArticle[]) {
  const compact = articles
    .slice(0, 40)
    .map((a) => ({
      title: a.title ?? "",
      description: a.description ?? "",
      url: a.url ?? "",
      publishedAt: a.publishedAt ?? "",
      source: a.source?.name ?? "",
    }))

  return [
    "你是一个信息抽取系统。",
    "请从给定的新闻列表中，抽取过去 24 小时内最重要的 30 条全球宏观经济/地缘政治/自然灾害事件，并输出严格 JSON（不要 markdown，不要解释）。",
    "输出必须是 JSON 数组，每个元素结构如下：",
    "{",
    '  "title": string,',
    '  "summary": string,',
    '  "latest_updates": string,',
    '  "category": "war" | "politics" | "economy" | "disaster",',
    '  "lat": number,',
    '  "lng": number,',
    '  "occurred_at": string (ISO8601，可选),',
    '  "impact": { "sectors": string[], "positiveCompanies": string[], "negativeCompanies": string[] },',
    '  "sources": [{ "url": string, "title": string, "publishedAt": string, "source": string }]',
    "}",
    "要求：",
    "- lat/lng 请给出事件发生地的合理近似坐标（国家/城市级即可）。",
    "- sectors / companies 要给出金融含义上的推断（可为空数组，但字段必须存在）。",
    "- sources 至少包含 1 条来源。",
    "- 必须输出 30 条；如果可用新闻不足，请尽可能多输出，但不要杜撰。",
    "",
    "示例（仅用于格式参考，内容不要照抄）：",
    '[{"title":"例：日本央行释放政策信号","summary":"央行暗示未来可能调整利率路径。","latest_updates":"市场关注下次会议声明措辞变化。","category":"economy","lat":35.6895,"lng":139.6917,"occurred_at":"2026-04-14T08:00:00Z","impact":{"sectors":["银行","外汇"],"positiveCompanies":[],"negativeCompanies":[]},"sources":[{"url":"https://example.com/a","title":"BoJ signal","publishedAt":"2026-04-14T08:10:00Z","source":"Reuters"}]}]',
    "",
    "新闻列表：",
    JSON.stringify(compact),
  ].join("\n")
}

async function deepSeekExtract(apiKey: string, prompt: string) {
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
  const url = new URL("/v1/chat/completions", baseUrl)

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      temperature: 0.2,
      messages: [
        { role: "system", content: "只输出严格 JSON，不要包含多余文本。" },
        { role: "user", content: prompt },
      ],
    }),
  })

  const data = (await resp.json()) as unknown
  const parsed = data as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }

  if (!resp.ok) {
    throw new Error(parsed.error?.message ?? "DeepSeek API error")
  }

  const content = parsed.choices?.[0]?.message?.content
  if (!content) throw new Error("DeepSeek empty response")
  return content
}

function tryParseJsonArray(text: string) {
  const firstBracket = text.indexOf("[")
  const lastBracket = text.lastIndexOf("]")
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const sliced = text.slice(firstBracket, lastBracket + 1)
    return JSON.parse(sliced) as unknown
  }
  return JSON.parse(text) as unknown
}

function normalizeCategory(value: string) {
  if (value === "war" || value === "politics" || value === "economy" || value === "disaster") return value
  return "economy"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  if (Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractRawEvents(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed
  const obj = asRecord(parsed)
  if (!obj) return []
  const maybeEvents = obj["events"]
  if (Array.isArray(maybeEvents)) return maybeEvents
  const maybeData = obj["data"]
  if (Array.isArray(maybeData)) return maybeData
  return []
}

function coerceEvent(raw: unknown): ExtractedEvent | null {
  const obj = asRecord(raw)
  if (!obj) return null

  const title = toString(obj["title"] ?? obj["headline"] ?? obj["name"])
  const summary = toString(obj["summary"] ?? obj["description"]) || title
  const latest_updates =
    toString(obj["latest_updates"] ?? obj["latestUpdates"] ?? obj["latest_update"] ?? obj["latestUpdate"]) || summary
  const category = normalizeCategory(toString(obj["category"]))
  const location = asRecord(obj["location"]) ?? asRecord(obj["geo"]) ?? null
  const lat = toNumber(obj["lat"] ?? obj["latitude"] ?? location?.["lat"] ?? location?.["latitude"])
  const lng = toNumber(obj["lng"] ?? obj["lon"] ?? obj["longitude"] ?? location?.["lng"] ?? location?.["lon"] ?? location?.["longitude"])
  const occurred_at = toString(obj["occurred_at"] ?? obj["occurredAt"])

  const impact = asRecord(obj["impact"]) ?? {}
  const sectors = Array.isArray(impact["sectors"]) ? (impact["sectors"] as unknown[]).map(toString).filter(Boolean) : []
  const positiveCompanies = Array.isArray(impact["positiveCompanies"])
    ? (impact["positiveCompanies"] as unknown[]).map(toString).filter(Boolean)
    : []
  const negativeCompanies = Array.isArray(impact["negativeCompanies"])
    ? (impact["negativeCompanies"] as unknown[]).map(toString).filter(Boolean)
    : []

  const sourcesValue = obj["sources"]
  const sources = Array.isArray(sourcesValue) ? (sourcesValue as unknown[]) : []

  if (!title || !summary || !latest_updates || lat === null || lng === null) return null

  const { lat: clampedLat, lng: clampedLng } = clampLatLng(lat, lng)

  return {
    title,
    summary,
    latest_updates,
    category,
    lat: clampedLat,
    lng: clampedLng,
    occurred_at: occurred_at || undefined,
    impact: { sectors, positiveCompanies, negativeCompanies },
    sources: sources
      .map((s): SourceItem | null => {
        const sr = asRecord(s)
        if (!sr) return null
        return {
          url: optionalString(toString(sr["url"])),
          title: optionalString(toString(sr["title"])),
          publishedAt: optionalString(toString(sr["publishedAt"])),
          source: optionalString(toString(sr["source"])),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => Boolean(item.url || item.title)),
  }
}

async function upsertEventsToSupabase(params: {
  supabaseUrl: string
  serviceKey: string
  events: ExtractedEvent[]
}) {
  const { supabaseUrl, serviceKey, events } = params
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/events`)
  url.searchParams.set("on_conflict", "fingerprint")

  const rows = await Promise.all(
    events.map(async (e) => {
      const fingerprint = await sha256Hex(`${e.title}|${e.category}|${e.lat.toFixed(3)},${e.lng.toFixed(3)}`)
      const occurredAt = e.occurred_at ? new Date(e.occurred_at).toISOString() : new Date().toISOString()
      return {
        fingerprint,
        title: e.title,
        summary: e.summary,
        latest_updates: e.latest_updates,
        category: e.category,
        lat: e.lat,
        lng: e.lng,
        impact: e.impact,
        sources: e.sources ?? null,
        occurred_at: occurredAt,
        updated_at: new Date().toISOString(),
      }
    })
  )

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(text)
  }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }

  const ingestSecret = process.env.INGEST_SECRET
  const auth = headerValue(req.headers, "authorization")
  const isCron = headerValue(req.headers, "x-vercel-cron") === "1"
  const secretFromQuery = queryValue(req.query, "secret")
  if (ingestSecret && !isCron && auth !== `Bearer ${ingestSecret}` && secretFromQuery !== ingestSecret) {
    return res.status(401).json({ error: "Unauthorized", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res
      .status(200)
      .json({ ok: false, warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }

  const newsApiKey = process.env.NEWSAPI_KEY
  const deepSeekKey = process.env.DEEPSEEK_API_KEY

  if (!newsApiKey) {
    return res.status(200).json({ ok: false, warning: "Missing NEWSAPI_KEY", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }
  if (!deepSeekKey) {
    return res.status(200).json({ ok: false, warning: "Missing DEEPSEEK_API_KEY", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }

  try {
    const articles = await fetchNewsArticles(newsApiKey, 24)
    if (articles.length === 0) {
      return res
        .status(200)
        .json({ ok: false, warning: "NewsAPI returned 0 articles", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
    }
    const prompt = buildDeepSeekPrompt(articles)
    const content = await deepSeekExtract(deepSeekKey, prompt)
    const parsed = tryParseJsonArray(content)
    const rawEvents = extractRawEvents(parsed)
    const events = rawEvents.map(coerceEvent).filter(Boolean) as ExtractedEvent[]

    if (!events.length) {
      const parsedObj = asRecord(parsed)
      return res.status(200).json({
        ok: false,
        warning: "No events extracted",
        extracted: 0,
        codeVersion: CODE_VERSION,
        serverTime: new Date().toISOString(),
        debug: {
          articles: articles.length,
          llmChars: content.length,
          parsedType: Array.isArray(parsed) ? "array" : parsedObj ? "object" : typeof parsed,
          parsedKeys: parsedObj ? Object.keys(parsedObj).slice(0, 10) : undefined,
          rawEvents: rawEvents.length,
        },
      })
    }

    await upsertEventsToSupabase({ supabaseUrl, serviceKey, events })

    return res.status(200).json({ ok: true, ingested: events.length, codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return res.status(200).json({ ok: false, warning: message, codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }
}
