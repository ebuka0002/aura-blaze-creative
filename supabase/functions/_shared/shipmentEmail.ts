// Sends the "Your shipment is booked" email. Never throws: a failed email
// must not turn a successful booking into a failure.
import { buildShipmentBookedEmail } from './emailTemplate.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ORDER_EMAIL_FROM = Deno.env.get('ORDER_EMAIL_FROM') || 'Aura Blaze Creative <orders@aurablazecreative.com>'

export async function sendShipmentBookedEmail(args: {
  order: { order_number: string; customer_name: string; customer_email: string; shipping_address: any }
  waybill: string
  rateId?: string | null
  courierName?: string | null
}) {
  if (!RESEND_API_KEY || !args.order.customer_email) return
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: ORDER_EMAIL_FROM,
        to: args.order.customer_email,
        subject: `Your shipment is booked — #${args.order.order_number}`,
        html: buildShipmentBookedEmail({
          order: args.order,
          waybill: args.waybill,
          rateId: args.rateId,
          courierName: args.courierName,
        }),
      }),
    })
    if (!res.ok) console.error('Shipment-booked email failed:', res.status, await res.text())
  } catch (err) {
    console.error('Shipment-booked email error:', err)
  }
}
