// Countries offered in checkout's country dropdown, with their calling
// codes for auto-filling the phone field. Kept in sync with the backend's
// COUNTRY_NAME_TO_ISO2 map in supabase/functions/shipping-rates/index.ts —
// if you add a country here, add it there too (and vice versa), so the
// checkout form and the actual shipping-rate request agree on what's
// supported.
export const COUNTRIES = [
  { name: 'Nigeria', code: 'NG', callingCode: '+234' },
  { name: 'United States', code: 'US', callingCode: '+1' },
  { name: 'United Kingdom', code: 'GB', callingCode: '+44' },
  { name: 'Canada', code: 'CA', callingCode: '+1' },
  { name: 'Ghana', code: 'GH', callingCode: '+233' },
  { name: 'Kenya', code: 'KE', callingCode: '+254' },
  { name: 'South Africa', code: 'ZA', callingCode: '+27' },
]

export function getCallingCode(countryName) {
  return COUNTRIES.find((c) => c.name === countryName)?.callingCode || ''
}
