import { supabase } from './supabase'

// Converts a plain decimal amount (e.g. 33000, matching what the cart uses)
// into the smallest currency unit (kobo for NGN, cents for USD) for storage,
// matching the money-as-integers convention used throughout the database.
function toMinorUnits(amount) {
  return Math.round(amount * 100)
}

function generateOrderNumber() {
  // Human-friendly, sortable-ish, hard to guess consecutively.
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `AB${Date.now().toString().slice(-6)}${rand}`
}

// Creates a real order + its line items in Supabase, and decrements stock
// for each purchased variant. Returns the created order's number.
//
// NOTE: status is always created as 'pending' here — this function does NOT
// process payment. Payment (Paystack) happens in a separate step; only once
// payment is confirmed should an order's status move to 'paid'. Writing the
// order before payment lets us have a real order record to attach the
// Paystack transaction reference to.
export async function createOrder({
  items,
  currency,
  subtotal,
  shippingCost,
  shippingMethod,
  shippingRateId = null,
  shippingShipmentId = null,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  userId = null,
  discountCode = null,
  discountAmount = 0,
}) {
  const orderNumber = generateOrderNumber()
  // This is the real, final charge amount — it MUST reflect the discount,
  // since this is what gets stored and later read by initialize-payment to
  // decide how much to actually charge via Paystack. Silently forgetting
  // discountAmount here would mean a discount looks applied in the UI but
  // never actually reduces what the customer is charged.
  const total = subtotal - discountAmount + shippingCost

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      shipping_rate_id: shippingRateId,
      shipping_shipment_id: shippingShipmentId,
      currency,
      subtotal: toMinorUnits(subtotal),
      shipping_cost: toMinorUnits(shippingCost),
      discount_code: discountCode,
      discount_amount: toMinorUnits(discountAmount),
      total: toMinorUnits(total),
      status: 'pending',
      user_id: userId,
    })
    .select('id')
    .single()

  if (orderError) throw orderError

  const priceField = currency === 'NGN' ? 'priceNGN' : 'priceUSD'

  const orderItemsPayload = items.map((item) => ({
    order_id: order.id,
    product_id: item.dbId || null,
    product_name: item.name,
    color_name: item.color,
    size: item.size,
    unit_price: toMinorUnits(item[priceField]),
    quantity: item.qty,
    image_url: item.image,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload)

  if (itemsError) {
    // Order row exists but items failed — surface this clearly rather than
    // silently leaving a broken/empty order behind.
    throw new Error(
      `Order ${orderNumber} was created but its items failed to save: ${itemsError.message}`
    )
  }

  // Decrement stock for each purchased variant. Done as best-effort, separate
  // calls per item — if one fails we don't roll back the order (the order is
  // real and paid for eventually; a stock mismatch is a lesser problem than
  // an order silently vanishing), but we do surface a warning.
  const stockErrors = []
  for (const item of items) {
    if (!item.dbId) continue
    const { error } = await supabase.rpc('decrement_variant_stock', {
      p_product_id: item.dbId,
      p_color_name: item.color,
      p_size: item.size,
      p_quantity: item.qty,
    })
    if (error) stockErrors.push({ item: item.name, error: error.message })
  }

  if (stockErrors.length > 0) {
    console.warn('Some stock quantities failed to update after order creation:', stockErrors)
  }

  return { orderNumber, orderId: order.id }
}
