import SEO from '../components/SEO'

export default function Terms() {
  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO title="Terms & Conditions" path="/terms" noindex />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Terms & Conditions</h1>
      <p className="text-grey mb-12">Last updated: July 2026</p>

      <div className="space-y-8 text-grey text-[15px] leading-relaxed">
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Orders</h2>
          <p>
            By placing an order, you confirm that the information provided is accurate.
            We reserve the right to cancel any order due to stock unavailability or
            pricing errors.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Pricing & Payment</h2>
          <p>
            Prices are listed in NGN and USD and are subject to change without notice.
            Payment is processed securely through Paystack at checkout.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Intellectual Property</h2>
          <p>
            All content on this site — including the Aura Blaze Creative name, logo, and
            product designs — is the property of Aura Blaze Creative and may not be
            reproduced without permission.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Limitation of Liability</h2>
          <p>
            Aura Blaze Creative is not liable for delays caused by third-party couriers or
            circumstances beyond our reasonable control.
          </p>
        </section>
      </div>
    </div>
  )
}
