// Supabase Edge Function: shipping-rates
//
// Creates a Terminal Africa draft shipment, then retrieves live carrier
// rates for that shipment. The draft shipment id is returned to checkout
// and stored with the order. The shipment is NOT booked until Paystack
// payment has been verified by verify-payment.

const TERMINAL_SECRET_KEY = Deno.env.get("TERMINAL_SECRET_KEY");
const TERMINAL_API_BASE_URL =
  Deno.env.get("TERMINAL_API_BASE_URL") || "https://api.terminal.africa/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PICKUP_ADDRESS = {
  line1: "172 Market Rd",
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

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
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

function resolveCountryCode(input: string | undefined) {
  if (!input) return "NG";
  const key = input.trim().toLowerCase();
  if (COUNTRY_NAME_TO_ISO2[key]) return COUNTRY_NAME_TO_ISO2[key];
  if (/^[a-zA-Z]{2}$/.test(input.trim())) return input.trim().toUpperCase();
  throw new Error(`Unsupported country: ${input}`);
}

const NIGERIA_STATE_POSTAL_CODES: Record<string, string> = {
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

function getNigeriaPostalCode(stateName: string | undefined) {
  if (!stateName) return "100001";
  return NIGERIA_STATE_POSTAL_CODES[stateName.trim().toLowerCase()] || "100001";
}

const NIGERIA_CITY_ALIASES: Record<string, { city: string; postalCode?: string; locality?: string }> = {
  // Abuja/FCT districts and suburbs. Terminal expects the service city as Abuja;
  // keep the selected district as a locality in line2 for delivery context.
  kubwa: { city: "Abuja", postalCode: "901101", locality: "Kubwa" },
  "dutse alhaji": { city: "Abuja", postalCode: "901101", locality: "Dutse Alhaji" },
  gwarinpa: { city: "Abuja", postalCode: "900108", locality: "Gwarinpa" },
  jabi: { city: "Abuja", postalCode: "900108", locality: "Jabi" },
  wuse: { city: "Abuja", postalCode: "900281", locality: "Wuse" },
  maitama: { city: "Abuja", postalCode: "900271", locality: "Maitama" },
  asokoro: { city: "Abuja", postalCode: "900231", locality: "Asokoro" },
  garki: { city: "Abuja", postalCode: "900231", locality: "Garki" },
  lugbe: { city: "Abuja", postalCode: "900107", locality: "Lugbe" },
  utako: { city: "Abuja", postalCode: "900211", locality: "Utako" },
  nyanya: { city: "Abuja", postalCode: "900103", locality: "Nyanya" },
  karu: { city: "Abuja", postalCode: "900110", locality: "Karu" },
  bwari: { city: "Abuja", postalCode: "901101", locality: "Bwari" },
  kuje: { city: "Abuja", postalCode: "903101", locality: "Kuje" },
  abuja: { city: "Abuja", postalCode: "900001" },
};

const NIGERIA_CITY_SPELLING_ALIASES: Record<string, string> = {
  "benin": "Benin",
  "benin city": "Benin",
  "portharcourt": "Port Harcourt",
  "port harcourt": "Port Harcourt",
  "port-harcourt": "Port Harcourt",
  "ph": "Port Harcourt",
  "onitsha": "Onitsha",
  "aba": "Aba",
  "owerri": "Owerri",
  "ibadan": "Ibadan",
  "ikeja": "Ikeja",
  "lagos": "Lagos",
  "kano": "Kano",
  "kaduna": "Kaduna",
  "enugu": "Enugu",
  "asaba": "Asaba",
  "akure": "Akure",
  "jos": "Jos",
  "ilorin": "Ilorin",
  "minna": "Minna",
  "yola": "Yola",
  "calabar": "Calabar",
  "uyo": "Uyo",
  "makurdi": "Makurdi",
  "sokoto": "Sokoto",
  "gombe": "Gombe",
  "jalingo": "Jalingo",
  "damaturu": "Damaturu",
  "gusau": "Gusau",
  "lokoja": "Lokoja",
  "lafia": "Lafia",
  "abeokuta": "Abeokuta",
  "benin city": "Benin",
};

function canonicalizeNigeriaCity(city: string, state: string) {
  const key = String(city || "").trim().toLowerCase().replace(/\s+/g, " ");
  const stateKey = String(state || "").trim().toLowerCase();
  if (["fct", "federal capital territory", "abuja"].includes(stateKey)) {
    if (NIGERIA_CITY_ALIASES[key]) return NIGERIA_CITY_ALIASES[key].city;
    if (NIGERIA_CITY_SPELLING_ALIASES[key]) return NIGERIA_CITY_SPELLING_ALIASES[key];
    return city.trim();
  }
  return NIGERIA_CITY_SPELLING_ALIASES[key] || city.trim();
}

function normalizeNigeriaDeliveryAddress(address: any) {
  if (resolveCountryCode(address.country) !== "NG") return address;

  const stateKey = String(address.state || "").trim().toLowerCase();
  const cityKey = String(address.city || "").trim().toLowerCase().replace(/\s+/g, " ");
  const stateIsAbuja = ["fct", "federal capital territory", "abuja"].includes(stateKey);
  const alias = stateIsAbuja ? NIGERIA_CITY_ALIASES[cityKey] : null;
  const canonicalCity = canonicalizeNigeriaCity(address.city, address.state);

  if (!alias && canonicalCity === String(address.city || '').trim()) return address;

  return {
    ...address,
    city: alias?.city || canonicalCity,
    state: stateIsAbuja ? "Abuja" : address.state,
    postalCode: address.postalCode || alias?.postalCode || getNigeriaPostalCode(stateIsAbuja ? "Abuja" : address.state),
    line2: address.line2 || alias?.locality || "",
  };
}

const CATEGORY_WEIGHTS_KG: Record<string, number> = {
  jackets: 0.6,
  tshirts: 0.3,
  shirts: 0.35,
  headwear: 0.15,
  accessories: 0.2,
  jorts: 0.55,
  trousers: 0.55,
  "quarter-zip": 0.45,
  "up-and-down": 0.8,
  joggers: 0.5,
  "tank-tops": 0.25,
};
const DEFAULT_WEIGHT_KG = 0.3;

function estimateParcelWeight(items: any[]) {
  const total = items.reduce((sum, item) => {
    const weight = CATEGORY_WEIGHTS_KG[item.category] ?? DEFAULT_WEIGHT_KG;
    const quantity = Number(item.qty ?? item.quantity ?? 1);
    return sum + weight * quantity;
  }, 0);
  return Math.max(total, 0.2);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!TERMINAL_SECRET_KEY) {
      return jsonResponse({ error: "TERMINAL_SECRET_KEY is not configured in Supabase." }, 500);
    }

    const { deliveryAddress, items, currency = "NGN" } = await req.json();

    if (!deliveryAddress) return jsonResponse({ error: "Missing deliveryAddress" }, 400);
    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: "Missing or invalid items" }, 400);
    }
    if (currency !== "NGN") {
      return jsonResponse({ error: "Terminal shipping is currently configured for NGN checkout only." }, 400);
    }

    const country = resolveCountryCode(deliveryAddress.country);
    const normalizedDeliveryAddress =
      country === "NG" ? normalizeNigeriaDeliveryAddress(deliveryAddress) : deliveryAddress;

    const deliveryZip =
      normalizedDeliveryAddress.postalCode ||
      normalizedDeliveryAddress.zip ||
      (country === "NG" ? getNigeriaPostalCode(normalizedDeliveryAddress.state) : "");

    if (!normalizedDeliveryAddress.address || !normalizedDeliveryAddress.city || !normalizedDeliveryAddress.state || !normalizedDeliveryAddress.phone) {
      return jsonResponse({ error: "A complete delivery address is required." }, 400);
    }
    if (!deliveryZip) {
      return jsonResponse({ error: "Postal/ZIP code is required for this destination." }, 400);
    }

    const delivery = {
      line1: normalizedDeliveryAddress.address,
      line2: normalizedDeliveryAddress.line2 || "",
      city: normalizedDeliveryAddress.city,
      state: normalizedDeliveryAddress.state,
      country,
      zip: deliveryZip,
      first_name: deliveryAddress.firstName || "Customer",
      last_name: deliveryAddress.lastName || "",
      email: deliveryAddress.email || "noemail@aurablazecreative.com",
      phone: deliveryAddress.phone,
      is_residential: true,
    };

    const totalWeightKg = estimateParcelWeight(items);
    const parcelItems = items.map((item) => {
      const weight = CATEGORY_WEIGHTS_KG[item.category] ?? DEFAULT_WEIGHT_KG;
      const quantity = Number(item.qty ?? item.quantity ?? 1);
      const value = Number(item.priceNGN);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid product value for "${item.name || "product"}".`);
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for "${item.name || "product"}".`);
      }
      return {
        name: item.name || "Clothing",
        description: item.description || item.name || "Clothing item",
        currency: "NGN",
        value,
        weight,
        quantity,
      };
    });

    const parcel = {
      description: "Aura Blaze Creative clothing order",
      items: parcelItems,
      weight: totalWeightKg,
      weight_unit: "kg",
      length: 30,
      width: 25,
      height: 10,
      dimension_unit: "cm",
    };

    // Terminal's documented flow is:
    // 1) create a draft shipment
    // 2) retrieve rates for that shipment
    // 3) after payment, arrange pickup using shipment_id + rate_id.
    const createShipmentRes = await fetch(`${TERMINAL_API_BASE_URL}/shipments/quick`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TERMINAL_SECRET_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        pickup_address: PICKUP_ADDRESS,
        delivery_address: delivery,
        shipment_purpose: "commercial",
        parcel,
        metadata: {
          source: "aura-blaze-web-checkout",
        },
      }),
    });

    const shipmentData = await readJson(createShipmentRes);
    if (!createShipmentRes.ok || !shipmentData.status) {
      console.error("Terminal quick shipment creation failed:", shipmentData);
      return jsonResponse({
        error: shipmentData.message || "Terminal could not create the shipping draft.",
      }, 502);
    }

    const shipment = shipmentData.data;
    const shipmentId = shipment?.shipment_id || shipment?.id;
    if (!shipmentId) {
      console.error("Terminal quick shipment response has no shipment id:", shipmentData);
      return jsonResponse({ error: "Terminal created a shipment but did not return its shipment ID." }, 502);
    }

    // Get rates for the actual draft shipment. This guarantees the rate is
    // tied to the exact parcel and addresses that will later be booked.
    const ratesUrl = new URL(`${TERMINAL_API_BASE_URL}/rates/shipment`);
    ratesUrl.searchParams.set("shipment_id", shipmentId);
    ratesUrl.searchParams.set("currency", "NGN");

    const ratesRes = await fetch(ratesUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TERMINAL_SECRET_KEY}`,
        Accept: "application/json",
      },
    });

    const ratesData = await readJson(ratesRes);
    if (!ratesRes.ok || !ratesData.status) {
      console.error("Terminal rate lookup failed:", ratesData);
      return jsonResponse({
        error: ratesData.message || "Terminal could not calculate shipping rates.",
      }, 502);
    }

    const rawRates = Array.isArray(ratesData.data) ? ratesData.data : [];
    const rates = rawRates
      .map((rate: any) => ({
        rateId: rate.rate_id || rate.id,
        carrierName: rate.carrier_name || rate.carrier?.name || rate.carrier || "Courier",
        amount: Number(rate.amount),
        currency: rate.currency || "NGN",
        pickupEta: rate.pickup_eta ?? null,
        pickupTime: rate.pickup_time ?? null,
        deliveryEta: rate.delivery_eta ?? null,
        deliveryTime: rate.delivery_time ?? null,
        deliveryDate: rate.delivery_date ?? null,
      }))
      .filter((rate: any) => rate.rateId && Number.isFinite(rate.amount) && rate.amount >= 0);

    if (rates.length === 0) {
      return jsonResponse({ error: "No shipping rates are available for this address." }, 502);
    }

    return jsonResponse({
      shipmentId,
      rates,
    });
  } catch (error) {
    console.error("shipping-rates error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unexpected shipping error.",
    }, 500);
  }
});
