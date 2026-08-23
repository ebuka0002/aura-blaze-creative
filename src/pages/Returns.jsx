import SEO from '../components/SEO'

export default function Returns() {
  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO
        title="Returns & Exchanges"
        description="Aura Blaze Creative's return and exchange policy — return window, conditions, and refund process."
        path="/returns"
      />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Returns & Exchanges</h1>
      <p className="text-grey mb-12">We want you to love what you ordered. Here's how returns work.</p>

      <div className="space-y-10">
        <section>
          <h2 className="font-display text-2xl tracking-wide mb-3">Return Window</h2>
          <p className="text-grey text-[15px] leading-relaxed">
            You have 14 days from the date of delivery to request a return or exchange.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl tracking-wide mb-3">Conditions</h2>
          <ul className="text-grey text-[15px] leading-relaxed space-y-2 list-disc pl-5">
            <li>Items must be unworn, unwashed, and undamaged</li>
            <li>Original tags must still be attached</li>
            <li>Items must be in their original packaging</li>
            <li>Sale items are final sale and not eligible for return</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl tracking-wide mb-3">Exchange Process</h2>
          <p className="text-grey text-[15px] leading-relaxed">
            To request an exchange, contact us via WhatsApp or email with your order number
            and the item you'd like to exchange. We'll confirm availability and share
            instructions for sending the original piece back.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl tracking-wide mb-3">Refund Timeline & Method</h2>
          <p className="text-grey text-[15px] leading-relaxed">
            Once we receive and inspect your return, refunds are processed within 5–7
            business days back to your original payment method via Paystack.
          </p>
        </section>
      </div>
    </div>
  )
}
