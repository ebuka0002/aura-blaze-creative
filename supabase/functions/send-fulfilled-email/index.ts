import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
)!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

Deno.serve(async (req) => {
  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    // --------------------------------------------------
    // GET ORDER ID
    // --------------------------------------------------

    const body = await req.json()
    const orderId = body?.orderId

    if (!orderId) {
      return jsonResponse(
        { error: "Order ID is required." },
        400
      )
    }

    // --------------------------------------------------
    // GET ORDER
    // --------------------------------------------------

    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()

    if (orderError || !order) {
      console.error("Order lookup failed:", orderError)

      return jsonResponse(
        {
          error:
            orderError?.message ||
            "Order could not be found.",
        },
        404
      )
    }

    // --------------------------------------------------
    // ONLY SEND FOR FULFILLED ORDERS
    // --------------------------------------------------

    if (order.status !== "fulfilled") {
      return jsonResponse({
        success: false,
        message:
          "Order is not fulfilled. No email was sent.",
      })
    }

    // --------------------------------------------------
    // PREVENT DUPLICATE EMAILS
    // --------------------------------------------------

    if (order.fulfilled_email_sent_at) {
      return jsonResponse({
        success: true,
        alreadySent: true,
        message:
          "Fulfilled email has already been sent.",
      })
    }

    // --------------------------------------------------
    // CUSTOMER EMAIL CHECK
    // --------------------------------------------------

    if (!order.customer_email) {
      return jsonResponse(
        {
          error:
            "This order does not have a customer email address.",
        },
        400
      )
    }

    // --------------------------------------------------
    // GET ORDER ITEMS
    // --------------------------------------------------

    const { data: items, error: itemsError } =
      await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)

    if (itemsError) {
      console.error(
        "Order items lookup failed:",
        itemsError
      )

      return jsonResponse(
        {
          error:
            "Could not load the items for this order.",
        },
        500
      )
    }

    // --------------------------------------------------
    // FORMAT CUSTOMER NAME
    // --------------------------------------------------

    const customerName =
      order.customer_name?.trim() || "Customer"

    // --------------------------------------------------
    // FORMAT ITEMS
    // --------------------------------------------------

    const itemRows = (items || [])
      .map((item) => {
        const quantity = Number(item.quantity || 0)
        const unitPrice = Number(item.unit_price || 0)
        const lineTotal = unitPrice * quantity

        return `
          <tr>
            <td
              style="
                padding: 14px 0;
                border-bottom: 1px solid #eeeeee;
                font-size: 14px;
              "
            >
              <strong>
                ${escapeHtml(item.product_name || "Product")}
              </strong>

              ${
                item.color_name || item.size
                  ? `
                    <div
                      style="
                        color: #888888;
                        font-size: 12px;
                        margin-top: 4px;
                      "
                    >
                      ${escapeHtml(
                        item.color_name || ""
                      )}
                      ${
                        item.color_name && item.size
                          ? " / "
                          : ""
                      }
                      ${escapeHtml(item.size || "")}
                    </div>
                  `
                  : ""
              }
            </td>

            <td
              style="
                padding: 14px 8px;
                border-bottom: 1px solid #eeeeee;
                font-size: 14px;
                text-align: center;
              "
            >
              ${quantity}
            </td>

            <td
              style="
                padding: 14px 0;
                border-bottom: 1px solid #eeeeee;
                font-size: 14px;
                text-align: right;
              "
            >
              ${formatMoney(
                lineTotal,
                order.currency
              )}
            </td>
          </tr>
        `
      })
      .join("")

    // --------------------------------------------------
    // SHIPPING ADDRESS
    // --------------------------------------------------

    const address = order.shipping_address || {}

    const shippingAddress = `
      ${escapeHtml(address.address || "")}<br />
      ${escapeHtml(address.city || "")}
      ${
        address.state
          ? `, ${escapeHtml(address.state)}`
          : ""
      }<br />
      ${escapeHtml(address.country || "")}
    `

    // --------------------------------------------------
    // EMAIL HTML
    // --------------------------------------------------

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Your Aura Blaze order has been delivered</title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background: #f5f2ec;
    font-family: Arial, Helvetica, sans-serif;
    color: #111111;
  "
>
  <div
    style="
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    "
  >

    <div
      style="
        background: #ffffff;
        padding: 40px 30px;
      "
    >

      <!-- LOGO -->

      <div
        style="
          text-align: center;
          margin-bottom: 35px;
        "
      >
        <img
          src="https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/email-assets/logo-transparent.png"
          alt="Aura Blaze"
          width="60"
          height="60"
          style="
            display: block;
            margin: 0 auto 12px;
            border-radius: 8px;
          "
        />

        <div
          style="
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 3px;
          "
        >
          AURA BLAZE
        </div>
      </div>

      <!-- HEADING -->

      <h1
        style="
          margin: 0 0 18px;
          font-size: 28px;
          line-height: 1.3;
          letter-spacing: 1px;
        "
      >
        Your order has arrived.
      </h1>

      <!-- MESSAGE -->

      <p
        style="
          font-size: 15px;
          line-height: 1.8;
          color: #444444;
          margin: 0 0 20px;
        "
      >
        Hi ${escapeHtml(customerName)},
      </p>

      <p
        style="
          font-size: 15px;
          line-height: 1.8;
          color: #444444;
          margin: 0 0 25px;
        "
      >
        Your Aura Blaze order
        <strong>#${escapeHtml(
          order.order_number || ""
        )}</strong>
        has been fulfilled and delivered.
      </p>

      <!-- SUCCESS BOX -->

      <div
        style="
          background: #f5f2ec;
          padding: 20px;
          margin-bottom: 30px;
          text-align: center;
        "
      >
        <div
          style="
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #888888;
            margin-bottom: 8px;
          "
        >
          Delivery complete
        </div>

        <div
          style="
            font-size: 18px;
            font-weight: 600;
          "
        >
          Order #${escapeHtml(
            order.order_number || ""
          )}
        </div>
      </div>

      <!-- ITEMS -->

      ${
        items && items.length
          ? `
            <h2
              style="
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin: 0 0 12px;
              "
            >
              Your order
            </h2>

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse: collapse;
                margin-bottom: 25px;
              "
            >
              <thead>
                <tr>
                  <th
                    style="
                      text-align: left;
                      font-size: 11px;
                      color: #888888;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      padding-bottom: 8px;
                    "
                  >
                    Item
                  </th>

                  <th
                    style="
                      text-align: center;
                      font-size: 11px;
                      color: #888888;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      padding-bottom: 8px;
                    "
                  >
                    Qty
                  </th>

                  <th
                    style="
                      text-align: right;
                      font-size: 11px;
                      color: #888888;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      padding-bottom: 8px;
                    "
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>
          `
          : ""
      }

      <!-- TOTAL -->

      <div
        style="
          border-top: 1px solid #eeeeee;
          padding-top: 18px;
          margin-top: 10px;
        "
      >
        <div
          style="
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 600;
          "
        >
          <span>Total</span>

          <span>
            ${formatMoney(
              order.total,
              order.currency
            )}
          </span>
        </div>
      </div>

      <!-- SHIPPING -->

      <div
        style="
          margin-top: 30px;
          padding-top: 25px;
          border-top: 1px solid #eeeeee;
        "
      >
        <h2
          style="
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin: 0 0 12px;
          "
        >
          Delivered to
        </h2>

        <p
          style="
            font-size: 14px;
            line-height: 1.7;
            color: #555555;
            margin: 0;
          "
        >
          ${shippingAddress}
        </p>
      </div>

      <!-- CLOSING -->

      <div
        style="
          margin-top: 40px;
          padding-top: 25px;
          border-top: 1px solid #eeeeee;
          font-size: 13px;
          line-height: 1.7;
          color: #888888;
        "
      >
        Thank you for choosing Aura Blaze.

        <br /><br />

        Distinct. Iconic. Timeless.
      </div>

    </div>

    <!-- FOOTER -->

    <div
      style="
        text-align: center;
        padding: 25px 15px;
        font-size: 12px;
        line-height: 1.6;
        color: #888888;
      "
    >
      <p style="margin: 0;">
        Aura Blaze Creative
      </p>

      <p style="margin: 6px 0 0;">
        aurablazecreative.com
      </p>
    </div>

  </div>
</body>
</html>
`

    // --------------------------------------------------
    // SEND THROUGH RESEND
    // --------------------------------------------------

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${RESEND_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from:
            "Aura Blaze <info@aurablazecreative.com>",

          to: [order.customer_email],

          subject:
            `Your Aura Blaze order #${order.order_number} has been delivered`,

          html,
        }),
      }
    )

    const resendData =
      await resendResponse.json()

    if (!resendResponse.ok) {
      console.error(
        "Resend failed:",
        resendData
      )

      return jsonResponse(
        {
          error:
            resendData.message ||
            "Resend failed to send the email.",
        },
        500
      )
    }

    // --------------------------------------------------
    // MARK EMAIL AS SENT
    // --------------------------------------------------

    const { error: updateError } =
      await supabaseAdmin
        .from("orders")
        .update({
          fulfilled_email_sent_at:
            new Date().toISOString(),
        })
        .eq("id", orderId)

    if (updateError) {
      console.error(
        "Email was sent but failed to mark it as sent:",
        updateError
      )

      return jsonResponse({
        success: true,
        emailSent: true,
        warning:
          "Email was sent, but the sent timestamp could not be saved.",
      })
    }

    return jsonResponse({
      success: true,
      emailSent: true,
      message:
        "Fulfilled delivery email sent successfully.",
    })
  } catch (error) {
    console.error(
      "send-fulfilled-email error:",
      error
    )

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      500
    )
  }
})

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function jsonResponse(
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  )
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatMoney(
  minorUnits: number,
  currency: string
) {
  const amount = Number(minorUnits || 0) / 100

  return new Intl.NumberFormat(
    currency === "NGN"
      ? "en-NG"
      : "en-US",
    {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }
  ).format(amount)
}