const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405)
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.")
    return jsonResponse({ error: "Email service is not configured." }, 500)
  }

  try {
    const body = await req.json()

    // Honeypot field: real users never see/fill this field.
    if (String(body?.website || "").trim()) {
      return jsonResponse({ success: true })
    }

    const name = cleanText(body?.name, 100)
    const email = cleanText(body?.email, 254)
    const subject = cleanText(body?.subject, 160) || "Website contact message"
    const message = cleanText(body?.message, 5000)

    if (!name || !email || !message) {
      return jsonResponse({ error: "Please fill in your name, email, and message." }, 400)
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: "Please enter a valid email address." }, 400)
    }

    if (message.length < 2) {
      return jsonResponse({ error: "Please enter a message." }, 400)
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <div style="max-width:680px;margin:30px auto;background:#ffffff;padding:35px;">
    <div style="text-align:center;margin-bottom:30px;">
      <div style="font-size:24px;font-weight:700;letter-spacing:3px;">AURA BLAZE</div>
      <div style="font-size:12px;letter-spacing:2px;color:#888888;margin-top:6px;">CONTACT MESSAGE</div>
    </div>

    <div style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:20px 0;">
      <p style="margin:0 0 10px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p style="margin:0;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    </div>

    <div style="margin-top:25px;">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888888;margin:0 0 10px;">Message</p>
      <div style="font-size:15px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>

    <div style="margin-top:35px;padding-top:20px;border-top:1px solid #eeeeee;color:#888888;font-size:12px;">
      Sent from the Aura Blaze Creative contact form.
    </div>
  </div>
</body>
</html>
`

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Aura Blaze <info@aurablazecreative.com>",
        to: ["info@aurablazecreative.com"],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error("Resend contact email failed:", resendData)
      return jsonResponse(
        { error: resendData?.message || "We couldn't send your message. Please try again." },
        500,
      )
    }

    return jsonResponse({
      success: true,
      message: "Your message has been sent successfully.",
    })
  } catch (error) {
    console.error("send-contact-message error:", error)
    return jsonResponse({ error: "We couldn't send your message. Please try again." }, 500)
  }
})

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}
