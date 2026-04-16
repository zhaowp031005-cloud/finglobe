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

const CODE_VERSION = "2026-04-16.1"

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
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const m = value.match(/-?\d+(?:\.\d+)?/)
    if (m) {
      const n = Number(m[0])
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  const n = Number(value)
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

async function fetchNewsArticles(newsApiKey: string, hoursBack: number): Promise<{
  articles: NewsApiArticle[]
  debug: { endpoint: "everything" | "top-headlines"; totalResults?: number }
}> {
  const from = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

  const q = ["market", "economy", "geopolitics", "conflict", "sanctions", "central bank", "inflation", "oil"].join(" OR ")

  const urlEverything = new URL("https://newsapi.org/v2/everything")
  urlEverything.searchParams.set("q", q)
  urlEverything.searchParams.set("language", "en")
  urlEverything.searchParams.set("sortBy", "publishedAt")
  urlEverything.searchParams.set("pageSize", "100")
  urlEverything.searchParams.set("from", from)

  const respEverything = await fetch(urlEverything.toString(), {
    headers: { "X-Api-Key": newsApiKey },
  })

  if (!respEverything.ok) {
    const text = await respEverything.text()
    throw new Error(text)
  }

  const dataEverything = (await respEverything.json()) as unknown
  const parsedEverything = dataEverything as {
    status?: string
    articles?: NewsApiArticle[]
    message?: string
    totalResults?: number
  }
  if (parsedEverything.status !== "ok" || !Array.isArray(parsedEverything.articles)) {
    throw new Error(parsedEverything.message ?? "NewsAPI error")
  }

  if (parsedEverything.articles.length > 0) {
    return {
      articles: parsedEverything.articles,
      debug: { endpoint: "everything", totalResults: parsedEverything.totalResults },
    }
  }

  const urlTop = new URL("https://newsapi.org/v2/top-headlines")
  urlTop.searchParams.set("category", "business")
  urlTop.searchParams.set("language", "en")
  urlTop.searchParams.set("q", q)
  urlTop.searchParams.set("pageSize", "100")

  const respTop = await fetch(urlTop.toString(), {
    headers: { "X-Api-Key": newsApiKey },
  })

  if (!respTop.ok) {
    const text = await respTop.text()
    throw new Error(text)
  }

  const dataTop = (await respTop.json()) as unknown
  const parsedTop = dataTop as { status?: string; articles?: NewsApiArticle[]; message?: string; totalResults?: number }
  if (parsedTop.status !== "ok" || !Array.isArray(parsedTop.articles)) {
    throw new Error(parsedTop.message ?? "NewsAPI error")
  }

  if (parsedTop.articles.length === 0) {
    const urlTopGeneral = new URL("https://newsapi.org/v2/top-headlines")
    urlTopGeneral.searchParams.set("category", "general")
    urlTopGeneral.searchParams.set("language", "en")
    urlTopGeneral.searchParams.set("q", q)
    urlTopGeneral.searchParams.set("pageSize", "100")

    const respTopGeneral = await fetch(urlTopGeneral.toString(), {
      headers: { "X-Api-Key": newsApiKey },
    })

    if (!respTopGeneral.ok) {
      const text = await respTopGeneral.text()
      throw new Error(text)
    }

    const dataTopGeneral = (await respTopGeneral.json()) as unknown
    const parsedTopGeneral = dataTopGeneral as {
      status?: string
      articles?: NewsApiArticle[]
      message?: string
      totalResults?: number
    }
    if (parsedTopGeneral.status !== "ok" || !Array.isArray(parsedTopGeneral.articles)) {
      throw new Error(parsedTopGeneral.message ?? "NewsAPI error")
    }

    return {
      articles: parsedTopGeneral.articles,
      debug: { endpoint: "top-headlines", totalResults: parsedTopGeneral.totalResults },
    }
  }

  return {
    articles: parsedTop.articles,
    debug: { endpoint: "top-headlines", totalResults: parsedTop.totalResults },
  }
}

function buildDeepSeekPrompt(articles: NewsApiArticle[]) {
  const compact = articles
    .slice(0, 100)
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
    "语言要求：title / summary / latest_updates / impact.sectors / impact.positiveCompanies / impact.negativeCompanies 必须使用简体中文输出（不要英文句子）。公司/机构如无法确定中文名，可保留英文简称或股票代码。",
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
    "- 每条事件都必须包含可解析的 lat/lng（不要留空，不要 null）。",
    "- sectors / companies 要给出金融含义上的推断（可为空数组，但字段必须存在）。",
    "- sources 至少包含 1 条来源。",
    "- 必须输出 30 条；如果独立新闻不足，请在不引入新闻列表之外事实的前提下，对同一新闻按国家/城市/行业影响拆分成多个事件条目。",
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

async function deepSeekChat(apiKey: string, messages: Array<{ role: "system" | "user"; content: string }>) {
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
      temperature: 0,
      messages,
    }),
  })

  const data = (await resp.json()) as unknown
  const parsed = data as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }

  if (!resp.ok) {
    throw new Error(parsed.error?.message ?? "DeepSeek API error")
  }

  const content = parsed.choices?.[0]?.message?.content
  if (!content) throw new Error("DeepSeek empty response")
  return content
}

async function deepSeekRepairJsonArray(apiKey: string, text: string) {
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
      temperature: 0,
      messages: [
        { role: "system", content: "你是一个 JSON 修复器。只输出严格 JSON 数组，不要 markdown，不要解释，不要多余文字。" },
        {
          role: "user",
          content: [
            "请把下面文本转换为严格 JSON 数组（必须能被 JSON.parse 解析）。",
            "如果不是数组，请提取并输出其中的数组部分。",
            "要求：所有字符串中不得包含未转义的换行符；如需换行，请使用 \\n。",
            "",
            text,
          ].join("\n"),
        },
      ],
    }),
  })

  const data = (await resp.json()) as unknown
  const parsed = data as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
  if (!resp.ok) throw new Error(parsed.error?.message ?? "DeepSeek repair error")
  const content = parsed.choices?.[0]?.message?.content
  if (!content) throw new Error("DeepSeek repair empty response")
  return content
}

function normalizeJsonText(text: string) {
  let t = text
  t = t.replace(/\uFEFF/g, "")
  t = t.replace(/[“”]/g, "\"").replace(/[‘’]/g, "'")
  let cleaned = ""
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i)
    cleaned += code < 32 || code === 127 ? " " : t[i]
  }
  t = cleaned
  t = t.replace(/,\s*([}\]])/g, "$1")
  return t
}

function tryParseJsonArray(text: string) {
  const normalized = normalizeJsonText(text)
  const firstBracket = normalized.indexOf("[")
  const lastBracket = normalized.lastIndexOf("]")
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const sliced = normalized.slice(firstBracket, lastBracket + 1)
    return JSON.parse(sliced) as unknown
  }
  return JSON.parse(normalized) as unknown
}

async function parseJsonArrayWithRepair(apiKey: string, content: string) {
  try {
    return { parsed: tryParseJsonArray(content) as unknown, stage: "direct" as const }
  } catch {
    const repaired1 = await deepSeekRepairJsonArray(apiKey, content)
    try {
      return { parsed: tryParseJsonArray(repaired1) as unknown, stage: "repair1" as const }
    } catch (error2) {
      const errText = error2 instanceof Error ? error2.message : String(error2)
      const repaired2 = await deepSeekRepairJsonArray(apiKey, [repaired1, "", "上一次修复后的解析错误：", errText].join("\n"))
      return { parsed: tryParseJsonArray(repaired2) as unknown, stage: "repair2" as const }
    }
  }
}

function eventKey(e: ExtractedEvent) {
  return `${e.title}|${e.category}|${e.lat.toFixed(3)},${e.lng.toFixed(3)}`
}

async function deepSeekTranslateEventsToZh(apiKey: string, events: ExtractedEvent[]) {
  const payload = events.map((e) => ({
    title: e.title,
    summary: e.summary,
    latest_updates: e.latest_updates,
    category: e.category,
    lat: e.lat,
    lng: e.lng,
    occurred_at: e.occurred_at ?? null,
    impact: e.impact,
    sources: e.sources ?? null,
  }))

  const text = await deepSeekChat(apiKey, [
    {
      role: "system",
      content: "你是一个中英翻译与规范化系统。只输出严格 JSON 数组，不要 markdown，不要解释，不要多余文字。",
    },
    {
      role: "user",
      content: [
        "请把输入 JSON 数组中的所有文本字段翻译为简体中文：title/summary/latest_updates，以及 impact.sectors/positiveCompanies/negativeCompanies。",
        "要求：",
        "- category/lat/lng/occurred_at/sources.url/sources.publishedAt/sources.source 保持原样。",
        "- sources.title 可以翻译成中文。",
        "- 输出数组长度与顺序必须与输入一致。",
        "",
        JSON.stringify(payload),
      ].join("\n"),
    },
  ])

  const parsedResult = await parseJsonArrayWithRepair(apiKey, text)
  const raw = extractRawEvents(parsedResult.parsed)
  const translatedRecords = raw.map(asRecord)

  const merged: ExtractedEvent[] = events.map((e, idx) => {
    const tr = translatedRecords[idx]
    if (!tr) return e
    const title = toString(tr["title"]) || e.title
    const summary = toString(tr["summary"]) || e.summary
    const latest_updates =
      toString(tr["latest_updates"] ?? tr["latestUpdates"] ?? tr["latest_update"] ?? tr["latestUpdate"]) || e.latest_updates

    const impact = asRecord(tr["impact"])
    const sectors = Array.isArray(impact?.["sectors"]) ? (impact?.["sectors"] as unknown[]).map(toString).filter(Boolean) : e.impact.sectors
    const positiveCompanies = Array.isArray(impact?.["positiveCompanies"])
      ? (impact?.["positiveCompanies"] as unknown[]).map(toString).filter(Boolean)
      : e.impact.positiveCompanies
    const negativeCompanies = Array.isArray(impact?.["negativeCompanies"])
      ? (impact?.["negativeCompanies"] as unknown[]).map(toString).filter(Boolean)
      : e.impact.negativeCompanies

    return {
      ...e,
      title,
      summary,
      latest_updates,
      impact: { sectors, positiveCompanies, negativeCompanies },
    }
  })

  return merged
}

async function deepSeekSupplementEvents(apiKey: string, articles: NewsApiArticle[], existing: ExtractedEvent[], need: number) {
  const compact = articles
    .slice(0, 100)
    .map((a) => ({
      title: a.title ?? "",
      description: a.description ?? "",
      url: a.url ?? "",
      publishedAt: a.publishedAt ?? "",
      source: a.source?.name ?? "",
    }))

  const used = existing.map((e) => ({ title: e.title, category: e.category, lat: e.lat, lng: e.lng }))

  const prompt = [
    "你是一个信息抽取系统。",
    `请基于新闻列表，补充输出额外 ${need} 条事件（只输出 JSON 数组）。`,
    "要求：",
    "- 必须使用简体中文输出 title/summary/latest_updates。",
    "- 每条必须包含可解析的 lat/lng（不要留空，不要 null）。",
    "- 不要与已存在事件重复（避免相同标题/同一地点同一类别的重复）。",
    "- category 只能是 war/politics/economy/disaster。",
    "- sources 至少 1 条。",
    "",
    "已存在事件（用于去重）：",
    JSON.stringify(used),
    "",
    "新闻列表：",
    JSON.stringify(compact),
  ].join("\n")

  const content = await deepSeekExtract(apiKey, prompt)
  const parsedResult = await parseJsonArrayWithRepair(apiKey, content)
  const raw = extractRawEvents(parsedResult.parsed)
  return raw.map(coerceEvent).filter(Boolean) as ExtractedEvent[]
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
    const news = await fetchNewsArticles(newsApiKey, 24)
    const articles = news.articles
    if (articles.length === 0) {
      return res.status(200).json({
        ok: false,
        warning: "NewsAPI returned 0 articles",
        codeVersion: CODE_VERSION,
        serverTime: new Date().toISOString(),
        newsDebug: news.debug,
      })
    }
    const prompt = buildDeepSeekPrompt(articles)
    const content = await deepSeekExtract(deepSeekKey, prompt)
    let parsed: unknown
    let parseStage: "direct" | "repair1" | "repair2" = "direct"
    try {
      const parsedResult = await parseJsonArrayWithRepair(deepSeekKey, content)
      parsed = parsedResult.parsed
      parseStage = parsedResult.stage
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return res.status(200).json({
        ok: false,
        warning: message,
        codeVersion: CODE_VERSION,
        serverTime: new Date().toISOString(),
        newsDebug: news.debug,
        parseDebug: { stage: parseStage },
      })
    }
    const rawEvents = extractRawEvents(parsed)
    let events = rawEvents.map(coerceEvent).filter(Boolean) as ExtractedEvent[]

    if (events.length) {
      const deduped = new Map<string, ExtractedEvent>()
      for (const e of events) deduped.set(eventKey(e), e)
      events = Array.from(deduped.values())
    }

    const maxSupplementRounds = 3
    const supplementAdded: number[] = []
    for (let i = 0; i < maxSupplementRounds && events.length < 30; i++) {
      const need = 30 - events.length
      const extra = await deepSeekSupplementEvents(deepSeekKey, articles, events, need)
      supplementAdded.push(extra.length)
      if (!extra.length) break
      const merged = new Map<string, ExtractedEvent>()
      for (const e of events) merged.set(eventKey(e), e)
      for (const e of extra) merged.set(eventKey(e), e)
      events = Array.from(merged.values()).slice(0, 30)
    }

    if (events.length) {
      events = await deepSeekTranslateEventsToZh(deepSeekKey, events)
    }

    if (!events.length) {
      const parsedObj = asRecord(parsed)
      return res.status(200).json({
        ok: false,
        warning: "No events extracted",
        extracted: 0,
        codeVersion: CODE_VERSION,
        serverTime: new Date().toISOString(),
        newsDebug: news.debug,
        debug: {
          articles: articles.length,
          llmChars: content.length,
          parseStage,
          parsedType: Array.isArray(parsed) ? "array" : parsedObj ? "object" : typeof parsed,
          parsedKeys: parsedObj ? Object.keys(parsedObj).slice(0, 10) : undefined,
          rawEvents: rawEvents.length,
        },
      })
    }

    await upsertEventsToSupabase({ supabaseUrl, serviceKey, events })

    return res.status(200).json({
      ok: true,
      ingested: events.length,
      codeVersion: CODE_VERSION,
      serverTime: new Date().toISOString(),
      newsDebug: news.debug,
      supplement: { rounds: supplementAdded.length, added: supplementAdded },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return res.status(200).json({ ok: false, warning: message, codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
  }
}
