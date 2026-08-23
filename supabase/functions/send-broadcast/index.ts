import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Your future production website
const WEBSITE_URL =
  Deno.env.get("WEBSITE_URL") ||
  "https://aurablazecreative.com";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

Deno.serve(async (req) => {
  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  // --------------------------------------------------
  // ONLY POST
  // --------------------------------------------------

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // --------------------------------------------------
    // CHECK RESEND
    // --------------------------------------------------

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing.");

      return new Response(
        JSON.stringify({
          error:
            "Newsletter service is not configured.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------
    // READ REQUEST
    // --------------------------------------------------

    const body = await req.json();

    const subject = body.subject;
    const message = body.message;

    // NEW: optional broadcast image
    const imageUrl =
      typeof body.imageUrl === "string" &&
      body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (
      !subject ||
      typeof subject !== "string" ||
      !subject.trim()
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Please provide an email subject.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: "Please provide a message.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------
    // GET ACTIVE SUBSCRIBERS
    // --------------------------------------------------

    const {
      data: subscribers,
      error: subscriberError,
    } = await supabase
      .from("subscribers")
      .select(
        "id, email, unsubscribe_token"
      )
      .eq("status", "subscribed");

    if (subscriberError) {
      console.error(
        "Failed to load subscribers:",
        subscriberError
      );

      return new Response(
        JSON.stringify({
          error: "Could not load subscribers.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (
      !subscribers ||
      subscribers.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            "There are no active subscribers to send to.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------
    // SEND EMAILS
    // --------------------------------------------------

    let sent = 0;
    let failed = 0;

    const results = [];

    for (const subscriber of subscribers) {
      // Make sure every subscriber has a token
      if (!subscriber.unsubscribe_token) {
        console.error(
          `Subscriber ${subscriber.email} has no unsubscribe token.`
        );

        failed++;

        results.push({
          email: subscriber.email,
          success: false,
          error:
            "Missing unsubscribe token.",
        });

        continue;
      }

      const unsubscribeUrl =
        `${WEBSITE_URL}/unsubscribe?token=` +
        encodeURIComponent(
          subscriber.unsubscribe_token
        );

      // ------------------------------------------------
      // OPTIONAL IMAGE
      // ------------------------------------------------

      const broadcastImageHtml = imageUrl
        ? `
          <div
            style="
              margin: 0 0 30px;
              text-align: center;
            "
          >
            <img
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(subject)}"
              style="
                display: block;
                width: 100%;
                max-width: 540px;
                height: auto;
                margin: 0 auto;
                border-radius: 4px;
              "
            />
          </div>
        `
        : "";

      // ------------------------------------------------
      // EMAIL HTML
      // ------------------------------------------------

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${escapeHtml(subject)}</title>
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

      <!-- LOGO / BRAND -->

      <div
        style="
          text-align: center;
          margin-bottom: 35px;
        "
      >

        <!-- Aura Blaze logo -->

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

      <!-- SUBJECT -->

      <h1
        style="
          margin: 0 0 25px;
          font-size: 28px;
          line-height: 1.3;
          letter-spacing: 1px;
        "
      >
        ${escapeHtml(subject)}
      </h1>

      <!-- BROADCAST IMAGE -->

      ${broadcastImageHtml}

      <!-- MESSAGE -->

      <div
        style="
          font-size: 15px;
          line-height: 1.8;
          color: #444444;
        "
      >
        ${formatMessage(message)}
      </div>

      <!-- BRAND SIGNATURE -->

      <div
        style="
          margin-top: 40px;
          padding-top: 25px;
          border-top: 1px solid #eeeeee;
          font-size: 13px;
          color: #888888;
        "
      >
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

      <p style="margin: 0 0 10px;">
        You're receiving this email because
        you subscribed to Aura Blaze.
      </p>

      <a
        href="${unsubscribeUrl}"
        style="
          color: #111111;
          text-decoration: underline;
        "
      >
        Unsubscribe
      </a>

    </div>

  </div>

</body>
</html>
`;

      // ------------------------------------------------
      // SEND THROUGH RESEND
      // ------------------------------------------------

      try {
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

              to: [subscriber.email],

              subject: subject.trim(),

              html,
            }),
          }
        );

        const resendData =
          await resendResponse.json();

        if (!resendResponse.ok) {
          console.error(
            `Resend failed for ${subscriber.email}:`,
            resendData
          );

          failed++;

          results.push({
            email: subscriber.email,
            success: false,
            error:
              resendData.message ||
              "Resend failed.",
          });

          continue;
        }

        sent++;

        results.push({
          email: subscriber.email,
          success: true,
        });

      } catch (sendError) {
        console.error(
          `Email error for ${subscriber.email}:`,
          sendError
        );

        failed++;

        results.push({
          email: subscriber.email,
          success: false,
          error:
            "Email sending failed.",
        });
      }
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,

        message:
          "Broadcast completed.",

        total:
          subscribers.length,

        sent,

        failed,

        results,
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {
    console.error(
      "send-broadcast error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});

// --------------------------------------------------
// ESCAPE HTML
// --------------------------------------------------

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --------------------------------------------------
// FORMAT ADMIN MESSAGE
// --------------------------------------------------

function formatMessage(value: string) {
  return escapeHtml(value)
    .replace(/\n\n/g, "<br /><br />")
    .replace(/\n/g, "<br />");
}