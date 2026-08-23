import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --------------------------------------------------
// ENVIRONMENT
// --------------------------------------------------

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
)!;

// --------------------------------------------------
// WEBSITE URL
// --------------------------------------------------
//
// LOCAL DEVELOPMENT:
// http://localhost:5173
//
// AFTER YOU HOST AURA BLAZE:
// https://aurablazecreative.com
//
// Only change this one value when the website is hosted.
// --------------------------------------------------

const SITE_URL = "https://aurablazecreative.com";

// --------------------------------------------------
// SUPABASE ADMIN CLIENT
// --------------------------------------------------

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// --------------------------------------------------
// EDGE FUNCTION
// --------------------------------------------------

Deno.serve(async (req) => {
  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------------------------
    // METHOD CHECK
    // --------------------------------------------------

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
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

    // --------------------------------------------------
    // CHECK RESEND
    // --------------------------------------------------

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing");

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

    const { email } = await req.json();

    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({
          error:
            "Please provide a valid email address.",
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

    const normalizedEmail =
      email.trim().toLowerCase();

    // --------------------------------------------------
    // BASIC EMAIL VALIDATION
    // --------------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({
          error:
            "Please enter a valid email address.",
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
    // SAVE SUBSCRIBER
    // --------------------------------------------------
    //
    // IMPORTANT:
    // We select unsubscribe_token after inserting so
    // the welcome email can create the frontend link.
    // --------------------------------------------------

    const {
      data: subscriber,
      error: insertError,
    } = await supabase
      .from("subscribers")
      .insert({
        email: normalizedEmail,
      })
      .select("unsubscribe_token")
      .single();

    // --------------------------------------------------
    // DUPLICATE EMAIL
    // --------------------------------------------------

    if (insertError) {
      // PostgreSQL unique violation
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            success: true,
            alreadySubscribed: true,
            message:
              "You're already subscribed.",
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
      }

      console.error(
        "Failed to save subscriber:",
        insertError
      );

      return new Response(
        JSON.stringify({
          error:
            "Could not save your subscription.",
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

    // --------------------------------------------------
    // MAKE SURE TOKEN EXISTS
    // --------------------------------------------------

    if (
      !subscriber ||
      !subscriber.unsubscribe_token
    ) {
      console.error(
        "Subscriber was created but no unsubscribe token was returned."
      );

      return new Response(
        JSON.stringify({
          error:
            "Subscription was saved, but we could not create your unsubscribe link.",
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

    // --------------------------------------------------
    // FRONTEND UNSUBSCRIBE URL
    // --------------------------------------------------
    //
    // This points to React's /unsubscribe page.
    //
    // Unsubscribe.jsx will then call the Supabase
    // unsubscribe Edge Function.
    // --------------------------------------------------

    const unsubscribeUrl =
      `${SITE_URL}/unsubscribe?token=${encodeURIComponent(
        subscriber.unsubscribe_token
      )}`;

    console.log(
      "Generated unsubscribe URL:",
      unsubscribeUrl
    );

    // --------------------------------------------------
    // SEND WELCOME EMAIL THROUGH RESEND
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

          to: [normalizedEmail],

          subject:
            "Welcome to Aura Blaze",

          html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>Welcome to Aura Blaze</title>
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
        padding: 50px 20px;
      "
    >

      <div
        style="
          background: #ffffff;
          padding: 45px 30px;
          text-align: center;
        "
      >

        <!-- LOGO -->

        <div
          style="
            margin-bottom: 25px;
            text-align: center;
          "
        >

          <!--
            REPLACE THIS PLACEHOLDER WITH YOUR
            ACTUAL PUBLIC LOGO URL LATER.

            Example:
            https://aurablazecreative.com/images/logo.png
          -->

          <img
            src="https://cpabvhvyhpdkutefntbh.supabase.co/storage/v1/object/public/email-assets/logo-transparent.png"
            alt="Aura Blaze logo"
            width="100"
            style="
              display: block;
              width: 100px;
              max-width: 100%;
              height: auto;
              margin: 0 auto;
              border: 0;
            "
          />

        </div>

        <!-- BRAND NAME -->

        <div
          style="
            margin-bottom: 25px;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 3px;
          "
        >
          AURA BLAZE
        </div>

        <!-- WELCOME -->

        <p
          style="
            font-size: 18px;
            line-height: 1.6;
            margin: 0 0 20px;
          "
        >
          Welcome to Aura Blaze.
        </p>

        <p
          style="
            color: #666666;
            font-size: 15px;
            line-height: 1.7;
            margin: 0;
          "
        >
          You're officially on the list.
          We'll keep you updated with new
          releases, exclusive pieces and
          everything happening at Aura Blaze.
        </p>

        <!-- TAGLINE -->

        <div
          style="
            margin-top: 35px;
            font-size: 13px;
            color: #888888;
            letter-spacing: 1px;
          "
        >
          Distinct. Iconic. Timeless.
        </div>

        <!-- DIVIDER -->

        <div
          style="
            height: 1px;
            background: #eeeeee;
            margin: 35px 0 25px;
          "
        ></div>

        <!-- UNSUBSCRIBE -->

        <p
          style="
            margin: 0;
            font-size: 12px;
            line-height: 1.6;
            color: #999999;
          "
        >
          You are receiving this email because
          you subscribed to Aura Blaze.
        </p>

        <p
          style="
            margin: 12px 0 0;
          "
        >

          <a
            href="${unsubscribeUrl}"
            style="
              color: #666666;
              font-size: 12px;
              text-decoration: underline;
            "
          >
            Unsubscribe
          </a>

        </p>

      </div>

    </div>

  </body>
</html>
          `,
        }),
      }
    );

    // --------------------------------------------------
    // READ RESEND RESPONSE
    // --------------------------------------------------

    const resendData =
      await resendResponse.json();

    // --------------------------------------------------
    // RESEND FAILED
    // --------------------------------------------------

    if (!resendResponse.ok) {
      console.error(
        "Resend failed:",
        resendData
      );

      // Subscriber was already saved,
      // so don't tell them their subscription failed.

      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message:
            "You're subscribed to Aura Blaze.",
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
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: true,
        message:
          "You're subscribed to Aura Blaze.",
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
    // --------------------------------------------------
    // UNEXPECTED ERROR
    // --------------------------------------------------

    console.error(
      "newsletter-subscribe error:",
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