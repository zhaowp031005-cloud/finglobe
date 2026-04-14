import { macroFinancialIndicators } from "../src/data/macroFinancialData.js"
import type { FinancialIndicator } from "../src/data/macroFinancialData.js"

type RequestLike = {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const CODE_VERSION = "2026-04-15.1"

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

type TwelveQuote = {
  status?: string
  message?: string
  close?: string
  change?: string
  percent_change?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  if (Array.isArray(value)) return null
  return value as Record<string, unknown>
}

async function fetchQuotesBatch(symbols: string[], apiKey: string) {
  const url = new URL("https://api.twelvedata.com/quote")
  url.searchParams.set("symbol", symbols.join(","))
  url.searchParams.set("apikey", apiKey)
  const res = await fetch(url.toString())
  const data = (await res.json()) as unknown
  const record = asRecord(data)
  if (!record) {
    throw new Error("Twelve Data API Error")
  }
  if (record["status"] === "error") {
    throw new Error((typeof record["message"] === "string" ? record["message"] : "") || "Twelve Data API Error")
  }
  return record as Record<string, TwelveQuote>
}

function toNumber(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed", codeVersion: CODE_VERSION, serverTime: new Date().toISOString() })
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
      codeVersion: CODE_VERSION,
      serverTime: new Date().toISOString(),
    })
  }

  const indicators: FinancialIndicator[] = []
  const errors: Array<{ id: string; error: string }> = []

  try {
    const symbols = macroFinancialIndicators.map(i => DEFAULT_TWELVE_SYMBOLS[i.id] ?? i.code)
    const quotes = await fetchQuotesBatch(symbols, apiKey)

    for (const indicator of macroFinancialIndicators) {
      const symbol = DEFAULT_TWELVE_SYMBOLS[indicator.id] ?? indicator.code
      const quote = quotes[symbol] || {}

      if (quote.status === "error") {
        indicators.push(indicator)
        errors.push({ id: indicator.id, error: quote.message || "Unknown error" })
        continue
      }

      const value = toNumber(quote.close)
      const change = toNumber(quote.change)
      const changePercent = toNumber(quote.percent_change)

      indicators.push({
        ...indicator,
        value: value ?? indicator.value,
        change: change ?? indicator.change,
        changePercent: changePercent ?? indicator.changePercent,
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return res.status(200).json({
      updatedAt,
      source: "mock",
      indicators: macroFinancialIndicators,
      warning: msg,
      codeVersion: CODE_VERSION,
      serverTime: new Date().toISOString(),
    })
  }

  return res.status(200).json({
    updatedAt,
    source: "twelvedata",
    indicators,
    errors: errors.length ? errors : undefined,
    codeVersion: CODE_VERSION,
    serverTime: new Date().toISOString(),
  })
}
