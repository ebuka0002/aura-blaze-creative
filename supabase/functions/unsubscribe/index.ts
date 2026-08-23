const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------------------------
    // GET TOKEN
    // --------------------------------------------------

    const url = new URL(req.url);

    let token = url.searchParams.get("token");

    // Also allow POST requests
    if (!token && req.method === "POST") {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // Ignore invalid JSON
      }
    }

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Missing unsubscribe token.",
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
    // UPDATE SUBSCRIBER
    // --------------------------------------------------

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}`,
      {
        method: "PATCH",

        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },

        body: JSON.stringify({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Unsubscribe update failed:", data);

      return new Response(
        JSON.stringify({
          error: "Could not unsubscribe.",
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
    // INVALID TOKEN
    // --------------------------------------------------

    if (!Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired unsubscribe link.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
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
        message: "You have been unsubscribed successfully.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("unsubscribe error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
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
});