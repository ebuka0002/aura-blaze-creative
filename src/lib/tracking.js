// Courier details shared by checkout, order pages and emails.
// Neither courier's public tracker accepts the waybill in the link, so the
// customer opens the tracker and pastes the waybill number (see TrackShipment).

export const COURIERS = {
  gigl: {
    key: 'gigl',
    name: 'GIG Logistics',
    eta: '3–5 working days',
    trackUrl: 'https://giglogistics.com/track-shipment/',
    recommended: true,
  },
  redstar: {
    key: 'redstar',
    name: 'Red Star Express',
    eta: '3–7 working days',
    trackUrl: 'https://redstarplc.com/tracker/',
    recommended: false,
  },
}

// Works with an order row ({ shipping_rate_id, courier_name }) or a checkout
// rate ({ rateId, carrierName }).
export function getCourier(source) {
  if (!source) return null
  const rateId = String(source.shipping_rate_id || source.rateId || '')
  const name = String(source.courier_name || source.carrierName || '')
  if (rateId.startsWith('gigl:') || /gig/i.test(name)) return COURIERS.gigl
  if (rateId.startsWith('redstar:') || /red\s*star/i.test(name)) return COURIERS.redstar
  return null
}

// Real waybills only (Red Star can store placeholders such as "N/A").
export function realWaybill(value) {
  const v = String(value ?? '').trim()
  return v && !/^(n\/?a|null|none|-+|0)$/i.test(v) ? v : null
}
