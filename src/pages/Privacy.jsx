import SEO from '../components/SEO'

export default function Privacy() {
  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO title="Privacy Policy" path="/privacy" noindex />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Privacy Policy</h1>
      <p className="text-grey mb-12">Last updated: July 2026</p>

      <div className="space-y-8 text-grey text-[15px] leading-relaxed">
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Information We Collect</h2>
          <p>
            We collect information you provide directly — name, email, shipping address,
            and phone number — when you place an order, create an account, or sign up for
            our newsletter.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">How We Use It</h2>
          <p>
            We use your information to process orders, communicate order updates, respond
            to inquiries, and, with your consent, send marketing emails about new drops and
            promotions.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Payment Information</h2>
          <p>
            Payments are processed securely by Paystack. We do not store your card details
            on our servers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl tracking-wide text-void mb-2">Your Rights</h2>
          <p>
            Under NDPR, you may request access to, correction of, or deletion of your
            personal data at any time by contacting info@aurablazecreative.com.
          </p>
        </section>
      </div>
    </div>
  )
}
