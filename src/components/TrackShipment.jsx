import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { COURIERS, getCourier, realWaybill } from '../lib/tracking'

// Waybill number + "Track shipment" button for a booked order.
// `order` can be an order row or { courier_name, shipping_rate_id, ... };
// pass `courierName` / `waybill` / `rateId` directly when you only have those.
export default function TrackShipment({ courierName, rateId, waybill, compact = false }) {
  const [copied, setCopied] = useState(false)
  const courier = getCourier({ courier_name: courierName, shipping_rate_id: rateId })
  const number = realWaybill(waybill)
  if (!number) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable: the number is shown on screen anyway */ }
  }

  const trackUrl = courier?.trackUrl
  const isRedStar = courier?.key === COURIERS.redstar.key

  return (
    <div>
      <p className="text-sm text-grey">
        {courier?.name || courierName || 'Courier'}
        {courier?.eta && <> · Delivery in {courier.eta}</>}
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <p className="text-sm">
          Waybill: <span className="font-medium text-void tracking-wide">{number}</span>
        </p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-xs text-grey hover:text-blaze transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {trackUrl && (
        <a
          href={trackUrl}
          target="_blank"
          rel="noreferrer"
          onClick={copy}
          className="mt-4 inline-flex items-center gap-2 bg-void text-bone px-5 py-2.5 text-xs tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors"
        >
          Track shipment <ExternalLink size={13} />
        </a>
      )}
      {trackUrl && !compact && (
        <p className="text-xs text-grey mt-2">
          Your waybill is copied when you tap Track. Just paste it into the tracker.
        </p>
      )}

      {isRedStar && <RedStarTrackingNote className="mt-4" />}
    </div>
  )
}

export function RedStarTrackingNote({ className = '' }) {
  return (
    <p className={`text-xs text-grey leading-relaxed border-l-2 border-blaze/40 pl-3 ${className}`}>
      A little note on Red Star tracking: their online tracker is still settling in, so your
      parcel's updates may take a while to appear, or may not show right away. Rest easy, your
      order is booked and on its way, and the tracker is just catching up. If you'd like a
      status check at any time, message us and we'll happily confirm it for you.
    </p>
  )
}
