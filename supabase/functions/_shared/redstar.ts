// Shared Red Star Express (RedSpeed API) client for the shipping edge functions.
//
// API reference: RedSpeed Integration Document + Swagger spec
// (redspeedopenapi.redstarplc.com/swagger). Auth is an `X-API-KEY` header.
//
// The published spec does not document the *success* response bodies for
// DeliveryFee or PickupRequest, so the parsers below are deliberately
// tolerant and every raw response is logged. If Red Star's real payloads
// differ, the edge-function logs show exactly what came back.

const REDSTAR_API_KEY = Deno.env.get('REDSTAR_API_KEY')
const BASE_URL_OVERRIDE = Deno.env.get('REDSTAR_API_BASE_URL')

// Red Star's own document only lists http://, so we try https first and fall
// back to http only if the TLS connection itself fails.
const BASE_URLS = BASE_URL_OVERRIDE
  ? [BASE_URL_OVERRIDE.replace(/\/+$/, '')]
  : ['https://redspeedopenapi.redstarplc.com', 'http://redspeedopenapi.redstarplc.com']

export const REDSTAR_CARRIER_NAME = 'Red Star Express'

export const PICKUP_ADDRESS = {
  name: 'Aura Blaze Creative',
  address: '172 Market Rd, Aba, Abia',
  phone: '+2348148599680',
  city: 'Aba',
  state: 'Abia',
}

export function isRedstarConfigured() {
  return !!REDSTAR_API_KEY
}

let preferredBase = 0

export async function redstarFetch(path: string, init: { method?: string; body?: unknown } = {}) {
  if (!REDSTAR_API_KEY) throw new Error('REDSTAR_API_KEY is not configured in Supabase.')

  let lastError: unknown = null
  for (let i = preferredBase; i < BASE_URLS.length; i++) {
    try {
      const res = await fetch(`${BASE_URLS[i]}${path}`, {
        method: init.method || 'GET',
        headers: {
          'X-API-KEY': REDSTAR_API_KEY,
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      preferredBase = i
      const text = await res.text()
      let data: any
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = text
      }
      return { ok: res.ok, status: res.status, data }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not reach Red Star.')
}

// Red Star returns 400 with an array of strings for validation problems.
export function redstarErrorMessage(data: unknown, fallback: string) {
  if (Array.isArray(data) && data.length) return data.map(String).join('; ')
  if (typeof data === 'string' && data.trim()) return data.slice(0, 300)
  if (data && typeof data === 'object') {
    const d = data as any
    return d.message || d.title || d.error || d.detail || fallback
  }
  return fallback
}

const norm = (s: unknown) =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const squash = (s: unknown) => norm(s).replace(/ /g, '')

// Red Star's responses are .NET JSON: some endpoints return camelCase keys
// (id, name) and others PascalCase (PickupTypeId, Name). Lower-case every key
// so the rest of the code can read either.
function lowerKeys(v: any): any {
  if (Array.isArray(v)) return v.map(lowerKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k.toLowerCase(), lowerKeys(val)]))
  }
  return v
}

// ---------- Cities / towns ----------

type City = { id: number; abbr: string; name: string }
type Town = { id: number; cityId: number; abbr: string; name: string }

let citiesCache: { at: number; cities: City[] } | null = null
const townsCache = new Map<string, { at: number; towns: Town[] }>()
const CACHE_MS = 60 * 60 * 1000

export async function getCities(): Promise<City[]> {
  if (citiesCache && Date.now() - citiesCache.at < CACHE_MS) return citiesCache.cities
  const res = await redstarFetch('/api/Operations/Cities')
  if (!res.ok || !Array.isArray(res.data)) {
    throw new Error(redstarErrorMessage(res.data, `Could not load Red Star cities (HTTP ${res.status}).`))
  }
  const cities: City[] = lowerKeys(res.data)
  citiesCache = { at: Date.now(), cities }
  return cities
}

export async function getTowns(city: City): Promise<Town[]> {
  const code = city.abbr
  const cached = townsCache.get(code)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.towns
  const res = await redstarFetch(`/api/Operations/DeliveryTowns/${encodeURIComponent(code)}`)
  const towns: Town[] = res.ok && Array.isArray(res.data) ? lowerKeys(res.data) : []
  townsCache.set(code, { at: Date.now(), towns })
  return towns
}

// Match the customer's state/city to a Red Star city. Tries the city the
// customer picked first, then the state capital/state name.
export function matchCity(cities: City[], ...names: Array<string | undefined>): City | null {
  const wanted = names.map(norm).filter(Boolean)
  for (const w of wanted) {
    const exact = cities.find((c) => squash(c.name) === squash(w) || squash(c.abbr) === squash(w))
    if (exact) return exact
  }
  for (const w of wanted) {
    const partial = cities.find((c) => {
      const n = norm(c.name)
      return n.length > 2 && (n.includes(w) || w.includes(n))
    })
    if (partial) return partial
  }
  return null
}

export function matchTown(towns: Town[], ...names: Array<string | undefined>): Town | null {
  const wanted = names.map(norm).filter(Boolean)
  for (const w of wanted) {
    const exact = towns.find((t) => squash(t.name) === squash(w))
    if (exact) return exact
  }
  for (const w of wanted) {
    const partial = towns.find((t) => {
      const n = norm(t.name)
      return n.length > 2 && (n.includes(w) || w.includes(n))
    })
    if (partial) return partial
  }
  return null
}

export type ResolvedRoute = {
  senderCity: City
  senderTown: Town | null
  recipientCity: City
  recipientTown: Town | null
}

export async function resolveRoute(dest: { city?: string; state?: string; line2?: string }): Promise<ResolvedRoute> {
  const cities = await getCities()
  const senderCity = matchCity(cities, PICKUP_ADDRESS.city, PICKUP_ADDRESS.state)
  if (!senderCity) throw new Error('Red Star does not list our pickup city (Aba). Please contact support.')

  // FCT districts (Kubwa, Wuse...) are towns under Abuja at Red Star.
  const stateIsAbuja = ['fct', 'federal capital territory', 'abuja'].includes(norm(dest.state))
  const recipientCity = matchCity(cities, stateIsAbuja ? 'Abuja' : dest.city, dest.state, dest.city)
  if (!recipientCity) {
    throw new Error(`Red Star does not currently deliver to ${dest.city || dest.state || 'this location'}.`)
  }

  const towns = await getTowns(recipientCity)
  const recipientTown = towns.length ? matchTown(towns, dest.city, dest.line2) : null

  // A pickup from our address needs a sender town too; a missing one is a
  // likely cause of Red Star's server-side null-reference error.
  const senderTowns = await getTowns(senderCity)
  const senderTown = senderTowns.length
    ? matchTown(senderTowns, PICKUP_ADDRESS.city, PICKUP_ADDRESS.address) || senderTowns[0]
    : null
  console.log('Red Star sender towns:', JSON.stringify({ chosen: senderTown, available: senderTowns.map((t) => t.name) }))

  return { senderCity, senderTown, recipientCity, recipientTown }
}

// ---------- Pickup / payment types ----------

// Red Star's documented PickupTypes response:
//   [{ PickupTypeId: 1, PickupType: "Pickup from my Address" },
//    { PickupTypeId: 2, PickupType: "Drop-off in RSE Location" }]
// We want a courier collection from Aba, i.e. "Pickup from my Address" (1).
export async function resolvePickupType(): Promise<number> {
  const env = Deno.env.get('REDSTAR_PICKUP_TYPE')
  if (env && Number.isFinite(Number(env))) return Number(env)

  const res = await redstarFetch('/api/Operations/PickupTypes')
  const list: any[] = res.ok && Array.isArray(res.data) ? lowerKeys(res.data) : []
  const idOf = (t: any) => Number(t.pickuptypeid ?? t.id ?? t.no ?? t.code ?? t.value)
  const nameOf = (t: any) => norm(t.pickuptype ?? t.name ?? t.description ?? t.type ?? '')
  const pick =
    list.find((t) => /pick ?up/.test(nameOf(t)) && !/drop/.test(nameOf(t))) ||
    list.find((t) => !/drop/.test(nameOf(t))) ||
    list[0]
  const id = pick ? idOf(pick) : NaN
  if (!Number.isFinite(id)) {
    console.error('Red Star PickupTypes unexpected response:', JSON.stringify(res.data))
    throw new Error('Could not determine the Red Star pickup type. Set REDSTAR_PICKUP_TYPE.')
  }
  return id
}

// Red Star's documented PaymentTypes response:
//   [{ No: 1, Name: "Prepaid" }, { No: 2, Name: "Pay On Delivery" }]
// The customer has already paid us through Paystack, so Red Star must not
// collect from the recipient: use "Prepaid".
export async function resolvePaymentType(): Promise<string | null> {
  const env = Deno.env.get('REDSTAR_PAYMENT_TYPE')
  if (env) return env

  const res = await redstarFetch('/api/Operations/PaymentTypes')
  const list: any[] = res.ok && Array.isArray(res.data) ? lowerKeys(res.data) : []
  const nameOf = (t: any) => String(typeof t === 'string' ? t : t.name ?? t.description ?? t.paymenttype ?? t.type ?? '')
  const preferred = list.find((t) => /prepaid/i.test(nameOf(t))) || list.find((t) => !/delivery/i.test(nameOf(t)))
  console.log('Red Star PaymentTypes:', JSON.stringify(res.data))
  const name = preferred ? nameOf(preferred) : ''
  // Fall back to the documented value rather than sending nothing.
  return name || 'Prepaid'
}

// ---------- Response parsing ----------

const FEE_KEYS = [
  'totalamount', 'totalfee', 'total', 'deliveryfee', 'deliverycharge', 'fee',
  'amount', 'price', 'serviceprice', 'charge', 'cost',
]

export function extractFee(data: any, depth = 0): number | null {
  if (data == null || depth > 3) return null
  if (depth === 0) data = lowerKeys(data)
  if (typeof data === 'number') return Number.isFinite(data) && data >= 0 ? data : null
  if (typeof data === 'string') {
    const n = Number(data.replace(/[₦,\s]/g, ''))
    return data.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const f = extractFee(item, depth + 1)
      if (f != null) return f
    }
    return null
  }
  if (typeof data === 'object') {
    for (const key of FEE_KEYS) {
      if (key in data) {
        const f = extractFee(data[key], depth + 1)
        if (f != null) return f
      }
    }
    for (const key of ['data', 'result', 'response', 'shipmentpayment']) {
      if (key in data) {
        const f = extractFee(data[key], depth + 1)
        if (f != null) return f
      }
    }
  }
  return null
}

// Red Star answers failures with HTTP 200 and placeholder values like "N/A".
const isPlaceholder = (v: unknown) => /^(n\/?a|null|none|-+|0)?$/i.test(String(v ?? '').trim())

export function extractWaybill(data: any, depth = 0): string | null {
  if (data == null || depth > 3) return null
  if (depth === 0) data = lowerKeys(data)
  if (typeof data === 'string') {
    const m = data.match(/\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{6,}\b/i)
    return m && !isPlaceholder(m[0]) ? m[0] : null
  }
  if (typeof data === 'number') return String(data)
  if (Array.isArray(data)) {
    for (const item of data) {
      const w = extractWaybill(item, depth + 1)
      if (w) return w
    }
    return null
  }
  if (typeof data === 'object') {
    for (const key of ['waybillnumber', 'waybillno', 'waybill', 'trackingnumber', 'trackingno']) {
      if (data[key] && !isPlaceholder(data[key])) return String(data[key])
    }
    for (const key of ['data', 'result', 'response', 'shipment', 'message']) {
      if (key in data) {
        const w = extractWaybill(data[key], depth + 1)
        if (w) return w
      }
    }
  }
  return null
}

// Red Star's PickupRequest replies HTTP 200 even when it fails, e.g.
//   { TransStatus: "Unsuccessful", TransStatusDetails: "Object reference not
//     set to an instance of an object.", WaybillNumber: "N/A", ... }
// Only a reply with a real waybill and a non-failure TransStatus is a success.
export function pickupOutcome(data: any): { ok: boolean; waybill: string | null; message: string | null } {
  const d = data && typeof data === 'object' && !Array.isArray(data) ? lowerKeys(data) : null
  const status = d ? String(d.transstatus ?? '') : ''
  const details = d ? String(d.transstatusdetails ?? '').trim() : ''
  const waybill = extractWaybill(data)
  const failedStatus = /un-?success|fail|error|reject/i.test(status)
  if (failedStatus || !waybill) {
    return {
      ok: false,
      waybill: null,
      message: `Red Star did not create the shipment${status ? ` (${status})` : ''}${details ? `: ${details}` : '.'}`,
    }
  }
  return { ok: true, waybill, message: null }
}

// Red Star phone fields: send the local Nigerian format without spaces
// (+234 904 532 0048 -> 09045320048).
export function normalizePhone(v: unknown): string {
  const digits = String(v ?? '').replace(/[^\d+]/g, '')
  if (/^\+?234\d{10}$/.test(digits)) return '0' + digits.replace(/^\+?234/, '')
  return digits.replace(/^\+/, '')
}

// Estimated parcel weight by product category (kg).
export const CATEGORY_WEIGHTS_KG: Record<string, number> = {
  jackets: 0.6,
  tshirts: 0.3,
  shirts: 0.35,
  headwear: 0.15,
  accessories: 0.2,
  jorts: 0.55,
  trousers: 0.55,
  'quarter-zip': 0.45,
  'up-and-down': 0.8,
  joggers: 0.5,
  'tank-tops': 0.25,
}
export const DEFAULT_WEIGHT_KG = 0.3

export function estimateParcelWeight(items: Array<{ category?: string; qty?: number; quantity?: number }>) {
  const total = items.reduce((sum, item) => {
    const w = CATEGORY_WEIGHTS_KG[item.category || ''] ?? DEFAULT_WEIGHT_KG
    return sum + w * Number(item.qty ?? item.quantity ?? 1)
  }, 0)
  return Math.max(Math.round(total * 100) / 100, 0.5)
}
