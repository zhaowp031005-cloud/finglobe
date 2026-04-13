type RequestLike = {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y"

const DEFAULT_TWELVE_SYMBOLS: Record<string, string> = {
  shcomp: "000001.SH",
  ixic: "IXIC",
  n225: "N225",
  xauusd: "XAU/USD",
  brentoil: "BRENT",
  us10y: "US10Y",
  dxy: "DXY",
  vix: "VIX",
}

function asString(value: string | string[] | undefined) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function getParams(range: TimeRange) {
  if (range === "1D") return { interval: "15min", outputsize: "96" }
  if (range === "1W") return { interval: "1h", outputsize: "168" }
  if (range === "1M") return { interval: "1day", outputsize: "30" }
  if (range === "3M") return { interval: "1day", outputsize: "90" }
  return { interval: "1day", outputsize: "260" }
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" })
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120")

  const updatedAt = new Date().toISOString()
  const apiKey = process.env.TWELVE_DATA_API_KEY

  const symbolParam = asString(req.query?.symbol)
  const rangeParam = (asString(req.query?.range) as TimeRange | undefined) ?? "1W"

  if (!symbolParam) {
    return res.status(400).json({ error: "Missing symbol" })
  }

  const range: TimeRange = ["1D", "1W", "1M", "3M", "1Y"].includes(rangeParam) ? rangeParam : "1W"
  const params = getParams(range)

  if (!apiKey) {
    return res.status(200).json({
      updatedAt,
      source: "mock",
      symbol: symbolParam,
      range,
      values: [],
      warning: "Missing TWELVE_DATA_API_KEY",
    })
  }

  const normalizedSymbol = DEFAULT_TWELVE_SYMBOLS[symbolParam] ?? symbolParam
  const url = new URL("https://api.twelvedata.com/time_series")
  url.searchParams.set("symbol", normalizedSymbol)
  url.searchParams.set("interval", params.interval)
  url.searchParams.set("outputsize", params.outputsize)
  url.searchParams.set("format", "JSON")
  url.searchParams.set("apikey", apiKey)

  const resp = await fetch(url.toString())
  const data = (await resp.json()) as unknown
  const parsed = data as {
    status?: string
    message?: string
    values?: Array<{
      datetime: string
      open: string
      high: string
      low: string
      close: string
    }>
  }

  if (parsed.status === "error") {
    return res.status(200).json({
      updatedAt,
      source: "twelvedata",
      symbol: symbolParam,
      range,
      values: [],
      warning: parsed.message ?? "Unknown error",
    })
  }

  const values = (parsed.values ?? [])
    .slice()
    .reverse()
    .map((v) => ({
      t: v.datetime,
      o: Number(v.open),
      h: Number(v.high),
      l: Number(v.low),
      c: Number(v.close),
    }))
    .filter((v) => Number.isFinite(v.o) && Number.isFinite(v.h) && Number.isFinite(v.l) && Number.isFinite(v.c))

  return res.status(200).json({
    updatedAt,
    source: "twelvedata",
    symbol: symbolParam,
    range,
    values,
  })
}

