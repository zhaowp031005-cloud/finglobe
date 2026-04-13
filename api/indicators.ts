import { macroFinancialIndicators } from "../src/data/macroFinancialData"
import type { FinancialIndicator } from "../src/data/macroFinancialData"

type RequestLike = {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

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

async function fetchQuote(symbol: string, apiKey: string) {
  const url = new URL("https://api.twelvedata.com/quote")
  url.searchParams.set("symbol", symbol)
  url.searchParams.set("apikey", apiKey)
  const res = await fetch(url.toString())
  const data = (await res.json()) as unknown
  return data as {
    status?: string
    message?: string
    close?: string
    change?: string
    percent_change?: string
  }
}

function toNumber(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" })
  }

  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30")

  const apiKey = process.env.TWELVE_DATA_API_KEY
  const updatedAt = new Date().toISOString()

  if (!apiKey) {
    return res.status(200).json({
      updatedAt,
      source: "mock",
      indicators: macroFinancialIndicators,
      warning: "Missing TWELVE_DATA_API_KEY",
    })
  }

  const results = await Promise.allSettled(
    macroFinancialIndicators.map(async (indicator) => {
      const symbol = DEFAULT_TWELVE_SYMBOLS[indicator.id] ?? indicator.code
      const quote = await fetchQuote(symbol, apiKey)
      const value = toNumber(quote.close)
      const change = toNumber(quote.change)
      const changePercent = toNumber(quote.percent_change)

      const updated: FinancialIndicator = {
        ...indicator,
        value: value ?? indicator.value,
        change: change ?? indicator.change,
        changePercent: changePercent ?? indicator.changePercent,
      }

      return { id: indicator.id, ok: true as const, indicator: updated }
    })
  )

  const indicators: FinancialIndicator[] = []
  const errors: Array<{ id: string; error: string }> = []

  for (let i = 0; i < results.length; i++) {
    const base = macroFinancialIndicators[i]
    const r = results[i]
    if (r.status === "fulfilled") {
      indicators.push(r.value.indicator)
    } else {
      indicators.push(base)
      errors.push({ id: base.id, error: r.reason instanceof Error ? r.reason.message : String(r.reason) })
    }
  }

  return res.status(200).json({
    updatedAt,
    source: "twelvedata",
    indicators,
    errors: errors.length ? errors : undefined,
  })
}

