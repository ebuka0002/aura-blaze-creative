// Shared GIG Logistics (GIGL Third Party API) client.
//
// Reference: "Third Party API - Reference" (Notion) + GIG THIRD PARTY API (OAS).
//  - Login:   POST /login {email,password} -> token in the response
//  - Auth:    every other call sends the JWT in an `access-token` header
//  - Quote:   POST /price/v3
//  - Book:    POST /capture/preshipment  (debits the GIG wallet automatically)
//  - Cancel:  POST /cancel/preshipment   (no fee)
//  - Every reply is { message, apiId, status, data } and `status` equals the
//    HTTP status, so business failures arrive as 4xx.
//
// SAFETY: GIGL is only enabled when GIGL_ENV is explicitly "staging" or
// "production" AND credentials are set. Staging books fake shipments, so it
// is clearly labelled TEST MODE in the carrier name.

import { CATEGORY_WEIGHTS_KG, DEFAULT_WEIGHT_KG, PICKUP_ADDRESS, normalizePhone } from './redstar.ts'

// Trimmed: a stray space/newline pasted into a secret is a common cause of login failures.
const GIGL_EMAIL = Deno.env.get('GIGL_EMAIL')?.trim()
const GIGL_PASSWORD = Deno.env.get('GIGL_PASSWORD')?.trim()
// Optional: set GIGL_PASSWORD_ENCODING=base64 if GIG's live login expects a Base-64 password.
const GIGL_PASSWORD_ENCODING = (Deno.env.get('GIGL_PASSWORD_ENCODING') || '').trim().toLowerCase()
const GIGL_ENV = (Deno.env.get('GIGL_ENV') || '').trim().toLowerCase()

export const GIGL_IS_TEST = GIGL_ENV !== 'production'
const BASE_URL = GIGL_IS_TEST
  ? 'https://dev-thirdpartynode.theagilitysystems.com'
  : 'https://thirdpartynode.theagilitysystems.com'

export const GIGL_CARRIER_NAME = GIGL_IS_TEST ? 'GIG Logistics (TEST MODE)' : 'GIG Logistics'
export const GIGL_RATE_PREFIX = 'gigl:'

export function isGiglEnabled() {
  return !!GIGL_EMAIL && !!GIGL_PASSWORD && (GIGL_ENV === 'staging' || GIGL_ENV === 'production')
}

// Enums from the GIGL reference.
// VehicleType: Car 0, Bike 1, Van 2, Truck 3. PickUpOptions: 0 or 1 (see docs/GIGL_SETUP.md).
const envInt = (name: string, fallback: number) => {
  const v = Deno.env.get(name)
  return v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback
}
export const giglVehicleType = () => envInt('GIGL_VEHICLE_TYPE', 1)
export const giglPickUpOption = () => envInt('GIGL_PICKUP_OPTION', 0)
const SHIPMENT_TYPE_REGULAR = 1
const PRICING_STRATEGY = 3 // must match the quote (per GIGL docs)

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const squash = (s: unknown) => norm(s).replace(/ /g, '')

function lowerKeys(v: any): any {
  if (Array.isArray(v)) return v.map(lowerKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k.toLowerCase(), lowerKeys(val)]))
  }
  return v
}

// ---------- Auth ----------

let tokenCache: { value: string; expiresAt: number } | null = null

function jwtExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Number(payload.exp) * 1000
  } catch {
    return 0
  }
}

function findToken(o: any, depth = 0): string | null {
  if (!o || typeof o !== 'object' || depth > 4) return null
  for (const [k, v] of Object.entries(o)) {
    if (/^(access-?token|accesstoken|token)$/i.test(k) && typeof v === 'string' && v.split('.').length === 3) return v
  }
  for (const v of Object.values(o)) {
    const t = findToken(v, depth + 1)
    if (t) return t
  }
  return null
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: GIGL_EMAIL,
      password: GIGL_PASSWORD_ENCODING === 'base64'
        ? btoa(String.fromCharCode(...new TextEncoder().encode(GIGL_PASSWORD || '')))
        : GIGL_PASSWORD,
    }),
  })
  const text = await res.text()
  let body: any = null
  try {
    body = JSON.parse(text)
  } catch { /* handled below */ }
  const token = body ? findToken(body) : null
  if (!res.ok || !token) {
    console.error('GIGL login failed:', res.status, JSON.stringify(body ?? text).slice(0, 300))
    throw new Error(`GIG Logistics login failed: ${body?.message || `HTTP ${res.status}`}`)
  }
  const exp = jwtExpiry(token)
  tokenCache = { value: token, expiresAt: exp || Date.now() + 60 * 60 * 1000 }
  return token
}

async function getToken(): Promise<string> {
  // Refresh an hour before expiry.
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60 * 60 * 1000) return tokenCache.value
  return await login()
}

export type GiglResult = { ok: boolean; status: number; message: string; data: any; raw: any }

export async function giglFetch(path: string, init: { method?: string; body?: unknown } = {}): Promise<GiglResult> {
  if (!isGiglEnabled()) throw new Error('GIG Logistics is not configured.')

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}${path}`, {
      method: init.method || 'GET',
      headers: {
        'access-token': token,
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    const text = await res.text()
    let raw: any
    try {
      raw = text ? JSON.parse(text) : null
    } catch {
      raw = { message: text }
    }
    const status = Number(raw?.status ?? res.status)
    const message = String(raw?.message ?? '')

    // A rejected/expired token: log in again once. (Business failures such as
    // "already delivered" also use 401, so only retry for auth-looking messages.)
    if ((res.status === 401 || status === 401) && attempt === 0 && /authenticat|credential|token|jwt|expired|unauthor/i.test(message)) {
      tokenCache = null
      continue
    }
    return { ok: res.ok && status === 200, status, message, data: raw?.data, raw }
  }
  throw new Error('GIG Logistics rejected our login.')
}

// ---------- Stations ----------

type Station = { stationid: number; stationname: string; statename: string; stationcode: string }
let stationsCache: { at: number; stations: Station[] } | null = null

export async function getStations(): Promise<Station[]> {
  if (stationsCache && Date.now() - stationsCache.at < 60 * 60 * 1000) return stationsCache.stations
  const res = await giglFetch('/localstations/get')
  if (!res.ok || !Array.isArray(res.data)) {
    throw new Error(`Could not load GIG stations: ${res.message || `HTTP ${res.status}`}`)
  }
  const stations: Station[] = lowerKeys(res.data)
  stationsCache = { at: Date.now(), stations }
  return stations
}

function matchStation(stations: Station[], city?: string, state?: string): Station | null {
  const stateIsAbuja = ['fct', 'federal capital territory', 'abuja'].includes(norm(state))
  const cityNames = stateIsAbuja ? ['Abuja', 'FCT'] : [city, state]
  const names = cityNames.map(squash).filter(Boolean)
  const stateKey = stateIsAbuja ? ['abuja', 'fct', 'federalcapitalterritory'] : [squash(state)]

  for (const n of names) {
    const hit = stations.find((s) => squash(s.stationname) === n)
    if (hit) return hit
  }
  // Prefer the station named after the state when a state has several.
  const inState = stations.filter((s) => stateKey.includes(squash(s.statename)))
  if (inState.length) return inState.find((s) => stateKey.includes(squash(s.stationname))) || inState[0]
  for (const n of names) {
    const hit = stations.find((s) => n.length > 2 && (squash(s.stationname).includes(n) || n.includes(squash(s.stationname))))
    if (hit) return hit
  }
  return null
}

// ---------- Locations (GIG requires latitude / longitude) ----------

// Approximate state-capital coordinates, used only if address geocoding fails.
const STATE_CAPITALS: Record<string, [number, number]> = {
  abia: [5.525, 7.4944], adamawa: [9.2035, 12.4954], 'akwa ibom': [5.0377, 7.9128], anambra: [6.21, 7.07],
  bauchi: [10.3158, 9.8442], bayelsa: [4.9267, 6.2676], benue: [7.7337, 8.5214], borno: [11.8333, 13.15],
  'cross river': [4.9757, 8.3417], delta: [6.198, 6.7338], ebonyi: [6.3249, 8.1137], edo: [6.335, 5.6037],
  ekiti: [7.6211, 5.2214], enugu: [6.4584, 7.5464], fct: [9.0765, 7.3986], abuja: [9.0765, 7.3986],
  'federal capital territory': [9.0765, 7.3986], gombe: [10.2897, 11.1673], imo: [5.4836, 7.0333],
  jigawa: [11.7561, 9.3389], kaduna: [10.5222, 7.4383], kano: [12.0022, 8.592], katsina: [12.9908, 7.6018],
  kebbi: [12.4539, 4.1975], kogi: [7.8023, 6.7333], kwara: [8.4966, 4.5421], lagos: [6.5244, 3.3792],
  nasarawa: [8.4939, 8.5153], niger: [9.6139, 6.5569], ogun: [7.1475, 3.3619], ondo: [7.2571, 5.2058],
  osun: [7.7827, 4.5418], oyo: [7.3775, 3.947], plateau: [9.8965, 8.8583], rivers: [4.8156, 7.0498],
  sokoto: [13.0059, 5.2476], taraba: [8.8833, 11.3667], yobe: [11.7469, 11.9608], zamfara: [12.1704, 6.6641],
}

const SENDER_LAT = Number(Deno.env.get('GIGL_SENDER_LAT')) || 5.1167 // Aba
const SENDER_LNG = Number(Deno.env.get('GIGL_SENDER_LNG')) || 7.3667

const geoCache = new Map<string, { lat: number; lng: number } | null>()

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AuraBlazeCreative-Checkout/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) {
    console.warn('GIGL geocode (nominatim) HTTP', res.status, 'for', query)
    return null
  }
  const hit = (await res.json())?.[0]
  return hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lon))
    ? { lat: Number(hit.lat), lng: Number(hit.lon) }
    : null
}

// City-level fallback geocoder (no key needed).
async function openMeteo(city: string, state?: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json&countryCode=NG`
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) {
    console.warn('GIGL geocode (open-meteo) HTTP', res.status, 'for', city)
    return null
  }
  const results: any[] = (await res.json())?.results || []
  const st = squash(state)
  const hit = results.find((r) => st && squash(r.admin1).includes(st.replace('state', ''))) || results[0]
  return hit && Number.isFinite(Number(hit.latitude)) && Number.isFinite(Number(hit.longitude))
    ? { lat: Number(hit.latitude), lng: Number(hit.longitude) }
    : null
}

async function geocode(key: string, fn: () => Promise<{ lat: number; lng: number } | null>) {
  if (geoCache.has(key)) return geoCache.get(key)!
  let result: { lat: number; lng: number } | null = null
  try {
    result = await fn()
  } catch (err) {
    console.warn('GIGL geocode failed:', err instanceof Error ? err.message : err)
  }
  if (result) geoCache.set(key, result) // never cache failures
  return result
}

export async function locateReceiver(dest: { address?: string; city?: string; state?: string; line2?: string }) {
  const full = [dest.address, dest.line2, dest.city, dest.state, 'Nigeria'].map((p) => String(p || '').trim()).filter(Boolean).join(', ')
  const cityQ = [dest.city, dest.state, 'Nigeria'].map((p) => String(p || '').trim()).filter(Boolean).join(', ')

  let hit = await geocode(`n:${full}`, () => nominatim(full))
  if (hit) return { lat: hit.lat, lng: hit.lng, precise: true }

  // Same city as the shop: the shop's own coordinates are a far better guess
  // than any state-level fallback.
  if (squash(dest.city) && squash(dest.city) === squash(PICKUP_ADDRESS.city) && squash(dest.state) === squash(PICKUP_ADDRESS.state)) {
    return { lat: SENDER_LAT, lng: SENDER_LNG, precise: false }
  }

  hit = await geocode(`n:${cityQ}`, () => nominatim(cityQ))
  if (hit) return { lat: hit.lat, lng: hit.lng, precise: false }
  if (dest.city) {
    hit = await geocode(`m:${cityQ}`, () => openMeteo(String(dest.city), dest.state))
    if (hit) return { lat: hit.lat, lng: hit.lng, precise: false }
  }

  const cap = STATE_CAPITALS[norm(dest.state)]
  if (cap) {
    console.warn('GIGL: using state-capital coordinates as a last resort for', cityQ)
    return { lat: cap[0], lng: cap[1], precise: false }
  }
  throw new Error(`Could not locate ${dest.city || dest.state || 'the delivery address'} for GIG Logistics.`)
}

export type GiglParties = {
  senderStationId: number | null
  receiverStationId: number | null
  senderLat: number
  senderLng: number
  receiverLat: number
  receiverLng: number
}

export async function resolveGiglParties(dest: { address?: string; city?: string; state?: string; line2?: string }): Promise<GiglParties> {
  const [stations, loc] = await Promise.all([getStations(), locateReceiver(dest)])
  const sender = matchStation(stations, PICKUP_ADDRESS.city, PICKUP_ADDRESS.state)
  const receiver = matchStation(stations, dest.city, dest.state)
  // Station ids are optional (GIG resolves the nearest from coordinates), but
  // passing them avoids the latency and "station not found" failures.
  console.log('GIGL parties:', JSON.stringify({ sender: sender?.stationname, receiver: receiver?.stationname, receiverPrecise: loc.precise }))
  return {
    senderStationId: sender?.stationid ?? null,
    receiverStationId: receiver?.stationid ?? null,
    senderLat: SENDER_LAT,
    senderLng: SENDER_LNG,
    receiverLat: loc.lat,
    receiverLng: loc.lng,
  }
}

// ---------- Items ----------

export type GiglItem = { name: string; category?: string; quantity: number; valueNGN: number }

function buildItems(items: GiglItem[]) {
  return items.map((i) => ({
    ItemName: String(i.name || 'Clothing').slice(0, 100),
    Description: String(i.name || 'Clothing item').slice(0, 200),
    ShipmentType: SHIPMENT_TYPE_REGULAR,
    Quantity: Math.max(1, Number(i.quantity || 1)),
    Weight: CATEGORY_WEIGHTS_KG[i.category || ''] ?? DEFAULT_WEIGHT_KG, // per unit
    IsVolumetric: false,
    Value: Math.max(0, Math.round(Number(i.valueNGN || 0))),
  }))
}

// ---------- Quote ----------

export async function giglQuote(parties: GiglParties, items: GiglItem[]) {
  const vehicle = giglVehicleType()
  const pickUp = giglPickUpOption()
  const body = {
    ...(parties.senderStationId != null ? { SenderStationId: parties.senderStationId } : {}),
    ...(parties.receiverStationId != null ? { ReceiverStationId: parties.receiverStationId } : {}),
    VehicleType: vehicle,
    PickUpOptions: pickUp,
    IsPriorityShipment: false,
    SenderLocation: { Latitude: parties.senderLat, Longitude: parties.senderLng },
    ReceiverLocation: { Latitude: parties.receiverLat, Longitude: parties.receiverLng },
    ShipmentItems: buildItems(items),
  }
  const res = await giglFetch('/price/v3', { method: 'POST', body })
  console.log('GIGL price/v3:', JSON.stringify({ request: body, status: res.status, response: res.raw }))
  if (!res.ok) throw new Error(res.message || `GIG Logistics could not price this delivery (HTTP ${res.status}).`)

  const d = lowerKeys(res.data || {})
  const amount = Number(d.grandtotal)
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('GIG Logistics returned a price we could not read.')
  return { amount, rateId: `${GIGL_RATE_PREFIX}${vehicle}:${pickUp}` }
}

// ---------- Booking ----------

export function parseGiglRateId(rateId: string) {
  const [, vehicle, pickUp] = String(rateId).split(':')
  return {
    vehicle: Number.isFinite(Number(vehicle)) ? Number(vehicle) : giglVehicleType(),
    pickUp: Number.isFinite(Number(pickUp)) ? Number(pickUp) : giglPickUpOption(),
  }
}

// GIG wants international-style numbers, e.g. +2349045320048.
export function giglPhone(v: unknown): string {
  const local = normalizePhone(v) // 0XXXXXXXXXX
  return /^0\d{10}$/.test(local) ? `+234${local.slice(1)}` : String(v ?? '').replace(/[^\d+]/g, '')
}

export async function giglCapture(args: {
  parties: GiglParties
  items: GiglItem[]
  vehicle: number
  pickUp: number
  receiver: { name: string; phone: string; address: string }
}) {
  const { parties, receiver } = args
  const senderAddress = PICKUP_ADDRESS.address
  const body = {
    SenderDetails: {
      SenderName: PICKUP_ADDRESS.name,
      SenderPhoneNumber: giglPhone(PICKUP_ADDRESS.phone),
      ...(parties.senderStationId != null ? { SenderStationId: parties.senderStationId } : {}),
      SenderAddress: senderAddress,
      InputtedSenderAddress: senderAddress,
      SenderLocality: PICKUP_ADDRESS.city,
      SenderLocation: { Latitude: String(parties.senderLat), Longitude: String(parties.senderLng), FormattedAddress: '', Name: '', LGA: '' },
    },
    ReceiverDetails: {
      ...(parties.receiverStationId != null ? { ReceiverStationId: parties.receiverStationId } : {}),
      ReceiverName: receiver.name,
      ReceiverPhoneNumber: giglPhone(receiver.phone),
      ReceiverAddress: receiver.address,
      InputtedReceiverAddress: receiver.address,
      ReceiverLocation: { Latitude: String(parties.receiverLat), Longitude: String(parties.receiverLng), FormattedAddress: '', Name: '', LGA: '' },
    },
    ShipmentDetails: {
      VehicleType: args.vehicle,
      PickUpOptions: args.pickUp,
      PricingStrategy: PRICING_STRATEGY,
      IsCashOnDelivery: false,
    },
    ShipmentItems: buildItems(args.items),
  }
  const res = await giglFetch('/capture/preshipment', { method: 'POST', body })
  console.log('GIGL capture/preshipment:', JSON.stringify({ status: res.status, response: res.raw }))
  const waybill = res.ok ? String(lowerKeys(res.data || {}).waybill || '') : ''
  return { ok: res.ok && !!waybill, waybill: waybill || null, message: res.message, raw: res.raw, status: res.status }
}

// Best effort: final charged amount and the printable waybill label.
export async function giglShipmentExtras(waybill: string) {
  const extras: { charged?: number; labelUrl?: string } = {}
  try {
    const g = await giglFetch(`/get/preshipment?Waybill=${encodeURIComponent(waybill)}`)
    const row = Array.isArray(g.data) ? lowerKeys(g.data[0] || {}) : {}
    if (Number.isFinite(Number(row.grandtotal))) extras.charged = Number(row.grandtotal)
  } catch (e) { console.warn('GIGL get/preshipment failed:', e) }
  try {
    const t = await giglFetch(`/track/mobileShipment?Waybill=${encodeURIComponent(waybill)}`)
    const row = Array.isArray(t.data) ? lowerKeys(t.data[0] || {}) : {}
    if (typeof row.waybilllabel === 'string' && /^https?:/.test(row.waybilllabel)) extras.labelUrl = row.waybilllabel
  } catch (e) { console.warn('GIGL track failed:', e) }
  return extras
}

// ---------- Cancel ----------

export async function giglCancel(waybill: string, reason = 'Cancelled by merchant') {
  const res = await giglFetch('/cancel/preshipment', {
    method: 'POST',
    body: { Waybill: waybill, CancelReason: reason.slice(0, 300) },
  })
  console.log('GIGL cancel/preshipment:', JSON.stringify({ waybill, status: res.status, response: res.raw }))
  // A retry of an already-cancelled shipment reports "already cancelled":
  // per GIGL, that confirms the first request worked.
  const alreadyCancelled = !res.ok && /already (been )?cancel/i.test(res.message)
  return {
    ok: res.ok || alreadyCancelled,
    message: res.message,
    returnWaybill: lowerKeys(res.data || {}).returnwaybill || null,
    raw: res.raw,
  }
}
