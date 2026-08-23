// Live USD/NGN exchange rate, sourced from Frankfurter (frankfurter.dev),
// a free, no-API-key currency API backed by real central bank data,
// including the Nigerian Naira.
//
// Rates are cached in memory + sessionStorage for a few hours so we don't
// hammer the API on every page load, and so the site still works (using the
// last known rate) if the API is briefly unreachable.

const CACHE_KEY = 'aura_blaze_usd_ngn_rate'
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours

// Fallback used only if we have never successfully fetched a rate before
// AND the live API call fails (e.g. no internet, API down). This number
// will go stale over time — it exists purely so the site doesn't break.
const FALLBACK_RATE = 1370

let memoryCache = null

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > CACHE_DURATION_MS) return null
    return parsed.rate
  } catch {
    return null
  }
}

function writeCache(rate) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() }))
  } catch {
    // sessionStorage unavailable — fine, memory cache still works for this session
  }
}

// Returns the current USD→NGN rate (i.e. how many Naira for $1).
export async function getUsdToNgnRate() {
  if (memoryCache) return memoryCache

  const cached = readCache()
  if (cached) {
    memoryCache = cached
    return cached
  }

  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=NGN')
    if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`)
    const data = await res.json()
    const rate = data?.rates?.NGN
    if (!rate || typeof rate !== 'number') throw new Error('NGN rate missing from response')

    memoryCache = rate
    writeCache(rate)
    return rate
  } catch (err) {
    console.warn('Live exchange rate fetch failed, using fallback rate:', err)
    return FALLBACK_RATE
  }
}

// Converts a NGN amount to USD using the live rate.
export async function ngnToUsd(ngnAmount) {
  const rate = await getUsdToNgnRate()
  return ngnAmount / rate
}
