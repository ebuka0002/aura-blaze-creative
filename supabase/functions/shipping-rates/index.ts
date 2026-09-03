// Supabase Edge Function: shipping-rates
//
// Gets real-time shipping quotes from Terminal Africa.
//
// IMPORTANT:
// - Keep TERMINAL_SECRET_KEY in Supabase secrets.
// - Do NOT expose the Terminal secret key in your frontend.
// - This version uses the Terminal Africa sandbox API for testing.

const TERMINAL_SECRET_KEY = Deno.env.get("TERMINAL_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

// ---------------------------------------------------------
// PICKUP ADDRESS
// ---------------------------------------------------------

const PICKUP_ADDRESS = {
  line1: "172 Market Rd",

  // Terminal requires line2.
  // Replace this with the actual second line of your
  // pickup address if you have one.
  line2: "Aura Blaze Creative",

  city: "Aba",
  state: "Abia",
  country: "NG",
  zip: "450001",

  first_name: "Aura",
  last_name: "Blaze",

  email: "info@aurablazecreative.com",

  phone: "+2348148599680",

  is_residential: false,
};

// ---------------------------------------------------------
// COUNTRY CODE MAPPING
// ---------------------------------------------------------
//
// Checkout's "Country" field is free text, not a dropdown — a customer
// can type "Nigeria", "NG", "Canada", etc. Terminal requires a strict
// ISO 3166-1 alpha-2 code. Only mapping "Nigeria" and passing everything
// else through unchanged (the original approach here) would send literal
// words like "Canada" straight to Terminal, which it would reject.

const COUNTRY_NAME_TO_ISO2 = {
  nigeria: "NG",
  ng: "NG",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  canada: "CA",
  ca: "CA",
  ghana: "GH",
  gh: "GH",
  kenya: "KE",
  ke: "KE",
  "south africa": "ZA",
  za: "ZA",
  tanzania: "TZ",
  tz: "TZ",
  uganda: "UG",
  ug: "UG",
};

function resolveCountryCode(input) {
  if (!input) return "NG";
  const key = input.trim().toLowerCase();
  if (COUNTRY_NAME_TO_ISO2[key]) return COUNTRY_NAME_TO_ISO2[key];
  // Already looks like a 2-letter code — pass through uppercased.
  if (/^[a-zA-Z]{2}$/.test(input.trim())) return input.trim().toUpperCase();
  // Unknown country name we don't have mapped — best-effort fallback,
  // logged so it's visible and easy to add to the map above.
  console.warn(`Unrecognized country "${input}" — falling back to first-2-letters guess.`);
  return input.trim().slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------
// NIGERIA POSTAL CODE FALLBACK
// ---------------------------------------------------------
//
// Mirrors src/data/nigeriaPostalCodes.js — keep both in sync if updated.
// Terminal's rate API requires a non-empty zip (confirmed through real
// testing), but most Nigerian addresses genuinely don't use postal codes
// day-to-day. Using the state's general postal code as a stand-in is a
// real, commonly-used practice for exactly this situation — it's only
// used here to satisfy rate-calculation validation, not for actual
// delivery routing (the courier uses the real street address for that).
// Only applied for Nigeria — for other countries, a wrong zip could
// genuinely misroute a package, so it's never fabricated there.
const NIGERIA_STATE_POSTAL_CODES = {
  abia: "440001", adamawa: "640001", "akwa ibom": "520001", anambra: "420001",
  bauchi: "740001", bayelsa: "560001", benue: "970001", borno: "600001",
  "cross river": "540001", delta: "320001", ebonyi: "840001", edo: "300001",
  ekiti: "360001", enugu: "400001", fct: "900001", abuja: "900001",
  gombe: "760001", imo: "460001", jigawa: "720001", kaduna: "800001",
  kano: "700001", katsina: "820001", kebbi: "860001", kogi: "260001",
  kwara: "240001", lagos: "100001", nasarawa: "950001", niger: "920001",
  ogun: "110001", ondo: "340001", osun: "230001", oyo: "200001",
  plateau: "930001", rivers: "500001", sokoto: "840001", taraba: "660001",
  yobe: "620001", zamfara: "880001",
};
const NIGERIA_DEFAULT_POSTAL_CODE = "100001"; // Lagos — the most commonly cited generic fallback

function getNigeriaPostalCode(stateName) {
  if (!stateName) return NIGERIA_DEFAULT_POSTAL_CODE;
  const key = stateName.trim().toLowerCase();
  return NIGERIA_STATE_POSTAL_CODES[key] || NIGERIA_DEFAULT_POSTAL_CODE;
}

// ---------------------------------------------------------
// PRODUCT WEIGHTS
// ---------------------------------------------------------

const CATEGORY_WEIGHTS_KG = {
  jackets: 0.6,
  tshirts: 0.3,
  shirts: 0.35,
  headwear: 0.15,
  accessories: 0.2,
  jorts: 0.55,
  trousers: 0.55,
  'quarter-zip': 0.45,
  'up-and-down': 0.8,
  joggers: 0.5,
  'tank-tops': 0.25,
};

const DEFAULT_WEIGHT_KG = 0.3;

// ---------------------------------------------------------
// CALCULATE TOTAL WEIGHT
// ---------------------------------------------------------

function estimateParcelWeight(items) {
  const total = items.reduce((sum, item) => {
    const category =
      item.category as keyof typeof CATEGORY_WEIGHTS_KG;

    const weight =
      CATEGORY_WEIGHTS_KG[category] ??
      DEFAULT_WEIGHT_KG;

    const quantity = Number(
      item.qty ??
      item.quantity ??
      1
    );

    return sum + weight * quantity;
  }, 0);

  return Math.max(total, 0.2);
}

// ---------------------------------------------------------
// EDGE FUNCTION
// ---------------------------------------------------------

Deno.serve(async (req) => {
  // -------------------------------------------------------
  // CORS
  // -------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // -----------------------------------------------------
    // READ REQUEST BODY
    // -----------------------------------------------------

    const {
      deliveryAddress,
      items,
      currency,
    } = await req.json();

    // -----------------------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------------------

    if (!deliveryAddress) {
      return new Response(
        JSON.stringify({
          error: "Missing deliveryAddress",
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

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid items",
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

    // -----------------------------------------------------
    // CHECK SECRET KEY
    // -----------------------------------------------------

    if (!TERMINAL_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "TERMINAL_SECRET_KEY is not configured in Supabase.",
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

    // -----------------------------------------------------
    // NORMALIZE COUNTRY
    // -----------------------------------------------------

    const country = resolveCountryCode(deliveryAddress.country);

    // -----------------------------------------------------
    // DELIVERY ADDRESS
    // -----------------------------------------------------
    //
    // line2 (apartment/suite/unit) and zip/postal code are genuinely
    // optional for most Nigerian addresses — many customers don't have
    // either. Previously these were always sent as "" when blank, which
    // Terminal's API treated as an invalid/malformed value rather than
    // "not provided," producing errors like "line 2 required" even though
    // the field is meant to be optional. The fix: only include the key at
    // all when there's a real value — an absent key and an empty string
    // are not the same thing to Terminal's validation.

    // Terminal genuinely rejects requests with no zip at all (confirmed
    // through real testing — their docs don't explicitly mark it
    // required, but empty requests are rejected). For Nigeria, where
    // postal codes aren't part of daily life for most people, we derive
    // a reasonable one from the state instead of asking the customer —
    // see getNigeriaPostalCode() above for why this is safe to do. For
    // every other country, a wrong zip could genuinely misroute a real
    // package, so it's only ever included if the customer actually gave one.
    const customerProvidedZip = deliveryAddress.postalCode || deliveryAddress.zip || "";
    const deliveryZip =
      customerProvidedZip ||
      (country === "NG" ? getNigeriaPostalCode(deliveryAddress.state) : "");

    const DELIVERY_ADDRESS = {
      line1: deliveryAddress.address,

      // Terminal's pickup address (above) always has a real line2 value,
      // and their docs say persist_data:true requires every address field
      // — strong signals line2 needs to be non-empty, not just present.
      // Unlike zip, line2 doesn't affect actual delivery routing, so a
      // harmless placeholder here is safe when the customer has none.
      line2: deliveryAddress.line2 || "N/A",

      city: deliveryAddress.city,

      state: deliveryAddress.state,

      country,

      ...(deliveryZip ? { zip: deliveryZip } : {}),

      first_name:
        deliveryAddress.firstName ||
        "Customer",

      last_name:
        deliveryAddress.lastName ||
        "",

      email:
        deliveryAddress.email ||
        "noemail@aurablazecreative.com",

      phone: deliveryAddress.phone,

      is_residential: true,
    };

    // -----------------------------------------------------
    // PARCEL WEIGHT
    // -----------------------------------------------------

    const totalWeightKg =
      estimateParcelWeight(items);

    // -----------------------------------------------------
    // PARCEL ITEMS
    // -----------------------------------------------------

const parcelItems = items.map((item) => {
  const category =
    item.category as keyof typeof CATEGORY_WEIGHTS_KG;

  const itemWeight =
    CATEGORY_WEIGHTS_KG[category] ??
    DEFAULT_WEIGHT_KG;

  const quantity = Number(
    item.qty ??
    item.quantity ??
    1
  );

 const itemValue = Number(
  currency === 'NGN'
    ? item.priceNGN
    : item.priceUSD
);

  if (!Number.isFinite(itemValue) || itemValue <= 0) {
    throw new Error(
      `Invalid product value for "${item.name || item.title || "product"}". Received: ${item.price}`
    );
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      `Invalid quantity for "${item.name || item.title || "product"}".`
    );
  }

  return {
    name:
      item.name ||
      item.title ||
      item.category ||
      "Clothing",

    description:
      item.description ||
      item.name ||
      item.title ||
      "Clothing item",

    currency: currency || "NGN",

    value: itemValue,

    weight: itemWeight,

    quantity,
  };
});

    // -----------------------------------------------------
    // PARCEL
    // -----------------------------------------------------

    const PARCEL = {
      description:
        "Aura Blaze Creative clothing order",

      items: parcelItems,

      weight: totalWeightKg,

      weight_unit: "kg",

      length: 30,
      width: 25,
      height: 10,

      dimension_unit: "cm",
    };

    // -----------------------------------------------------
    // LOG REQUEST DATA
    //
    // Do NOT log the secret key.
    // -----------------------------------------------------

    console.log(
      "Terminal shipping request:",
      JSON.stringify({
        pickup_address: PICKUP_ADDRESS,
        delivery_address: DELIVERY_ADDRESS,
        parcel: PARCEL,
        currency: currency || "NGN",
      })
    );

    // -----------------------------------------------------
    // GET SHIPPING QUOTES
    // -----------------------------------------------------

    const terminalResponse = await fetch(
      "https://api.terminal.africa/v1/rates/shipment/quotes",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${TERMINAL_SECRET_KEY}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify({
          pickup_address:
            PICKUP_ADDRESS,

          delivery_address:
            DELIVERY_ADDRESS,

          parcel: PARCEL,

          currency:
            currency || "NGN",

          // REQUIRED for the returned rate_id to be usable later when
          // actually booking pickup after payment succeeds (see
          // shipping-book-pickup). Per Terminal's docs: "Set to true if
          // you want to use the response rate_id to arrange shipment/
          // delivery." Without this, a rate calculated here may not be
          // bookable later — checkout could work today but silently fail
          // at the real payment→pickup step. This also requires every
          // pickup/delivery address field to be present, which they
          // already are here.
          persist_data: true,
        }),
      }
    );

    // -----------------------------------------------------
    // READ TERMINAL RESPONSE
    // -----------------------------------------------------

    const responseText =
      await terminalResponse.text();

    console.log(
      "Terminal status:",
      terminalResponse.status
    );

    console.log(
      "Terminal response:",
      responseText
    );

    let terminalData;

    try {
      terminalData =
        JSON.parse(responseText);
    } catch {
      terminalData = {
        message: responseText,
      };
    }

    // -----------------------------------------------------
    // TERMINAL ERROR
    // -----------------------------------------------------

    if (!terminalResponse.ok) {
      console.error(
        "Terminal quote request failed:",
        terminalData
      );

      return new Response(
        JSON.stringify({
          error:
            terminalData.message ||
            terminalData.error ||
            "Terminal could not calculate shipping rates.",

          terminalStatus:
            terminalResponse.status,

          terminalResponse:
            terminalData,
        }),
        {
          status: 502,

          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    // -----------------------------------------------------
    // EXTRACT RATES
    // -----------------------------------------------------

    const rawRates =
      Array.isArray(terminalData.data)
        ? terminalData.data
        : Array.isArray(terminalData.data?.rates)
        ? terminalData.data.rates
        : Array.isArray(terminalData.rates)
        ? terminalData.rates
        : [];

    // -----------------------------------------------------
    // FORMAT RATES FOR FRONTEND
    // -----------------------------------------------------

    const rates = rawRates.map(
      (rate) => ({
        rateId:
          rate.rate_id ||
          rate.id,

        carrierName:
          rate.carrier?.name ||
          rate.carrier_name ||
          rate.carrier ||
          "Courier",

        amount:
          rate.amount,

        currency:
          rate.currency ||
          currency ||
          "NGN",

        pickupEta:
          rate.pickup_eta ||
          null,

        deliveryEta:
          rate.delivery_eta ||
          null,

        deliveryDate:
          rate.delivery_date ||
          null,

        deliveryTime:
          rate.delivery_time ||
          null,
      })
    );

    // -----------------------------------------------------
    // NO RATES
    // -----------------------------------------------------

    if (rates.length === 0) {
      console.error(
        "Terminal returned no rates:",
        terminalData
      );

      return new Response(
        JSON.stringify({
          error:
            "No shipping rates are available for this address.",

          terminalResponse:
            terminalData,
        }),
        {
          status: 502,

          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    // -----------------------------------------------------
    // SUCCESS
    // -----------------------------------------------------

    return new Response(
      JSON.stringify({
        rates,
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
    // -----------------------------------------------------
    // UNEXPECTED ERROR
    // -----------------------------------------------------

    console.error(
      "shipping-rates error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected shipping error.",
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