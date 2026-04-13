type RequestLike = {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type ResponseLike = {
  status: (code: number) => ResponseLike
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

function asString(value: string | string[] | undefined) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function asInt(value: string | undefined, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : fallback
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" })
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120")

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({
      events: [],
      warning: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    })
  }

  const days = asInt(asString(req.query?.days), 7)
  const limit = Math.min(asInt(asString(req.query?.limit), 100), 500)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/events`)
  url.searchParams.set("select", "id,title,summary,latest_updates,category,lat,lng,impact,occurred_at,updated_at")
  url.searchParams.set("order", "occurred_at.desc")
  url.searchParams.set("limit", String(limit))
  url.searchParams.append("occurred_at", `gte.${since}`)

  const resp = await fetch(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  if (!resp.ok) {
    const text = await resp.text()
    return res.status(200).json({ events: [], warning: text })
  }

  const events = (await resp.json()) as unknown
  return res.status(200).json({ events })
}

