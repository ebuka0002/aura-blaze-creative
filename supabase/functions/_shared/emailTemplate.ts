// Shared HTML email template for order confirmations. Kept as a plain
// function (not a framework component) since Edge Functions run on Deno,
// not Node — no React Email renderer available here, so this builds the
// HTML string directly. Simple, table-based layout for maximum email
// client compatibility (many clients, especially Outlook, render modern
// CSS poorly — tables remain the most reliable approach for email).

function formatMoney(minorUnits, currency) {
  const amount = minorUnits / 100
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function buildOrderConfirmationEmail({ order, items }) {
  const itemRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #EAE6DD;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${
              item.image_url
                ? `<td style="padding-right: 14px; vertical-align: top;">
                    <img src="${item.image_url}" width="56" height="68" style="object-fit: cover; display: block;" alt="" />
                  </td>`
                : ''
            }
            <td style="vertical-align: top;">
              <div style="font-size: 14px; font-weight: 600; color: #0B0B0C;">${escapeHtml(item.product_name)}</div>
              <div style="font-size: 12px; color: #8A8578; margin-top: 2px;">${escapeHtml(item.color_name || '')} / ${escapeHtml(item.size || '')} × ${item.quantity}</div>
            </td>
          </tr>
        </table>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #EAE6DD; text-align: right; font-size: 14px; color: #0B0B0C; vertical-align: top;">
        ${formatMoney(item.unit_price * item.quantity, order.currency)}
      </td>
    </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F3EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F3EF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff;">

          <tr>
            <td style="background-color: #0B0B0C; padding: 32px 32px; text-align: center;">
              <div style="font-size: 22px; letter-spacing: 2px; color: #F5F3EF; font-weight: bold;">AURA BLAZE</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px 8px;">
              <div style="font-size: 22px; font-weight: 700; color: #0B0B0C;">Order Confirmed</div>
              <p style="font-size: 14px; color: #8A8578; margin-top: 8px; line-height: 1.6;">
                Thank you, ${escapeHtml(order.customer_name)}. Your order <strong style="color:#0B0B0C;">#${escapeHtml(order.order_number)}</strong> has been received and paid.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 8px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemRows}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #8A8578;">Subtotal</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #0B0B0C; text-align: right;">${formatMoney(order.subtotal, order.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #8A8578;">Shipping</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #0B0B0C; text-align: right;">${formatMoney(order.shipping_cost, order.currency)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 0; font-size: 15px; font-weight: 700; color: #0B0B0C; border-top: 1px solid #0B0B0C; padding-top: 10px;">Total</td>
                  <td style="padding: 10px 0 0; font-size: 15px; font-weight: 700; color: #0B0B0C; text-align: right; border-top: 1px solid #0B0B0C; padding-top: 10px;">${formatMoney(order.total, order.currency)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #EAE6DD; padding: 16px; font-size: 13px; color: #0B0B0C; line-height: 1.6;">
                <strong>Shipping to:</strong><br />
                ${escapeHtml(order.shipping_address?.address || '')}<br />
                ${escapeHtml(order.shipping_address?.city || '')}, ${escapeHtml(order.shipping_address?.state || '')}<br />
                ${escapeHtml(order.shipping_address?.country || '')}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px; background-color: #0B0B0C; text-align: center;">
              <div style="font-size: 11px; letter-spacing: 1px; color: #8A8578;">TIMELESS. DISTINCT. ICONIC.</div>
              <div style="font-size: 11px; color: #8A8578; margin-top: 8px;">
                Questions about your order? Reply to this email or reach us on WhatsApp.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
