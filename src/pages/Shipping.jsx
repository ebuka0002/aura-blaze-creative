import SEO from '../components/SEO'

const rows = [
  ['Lagos Delivery', '2–3 business days', 'From ₦2,500'],
  ['Nationwide (Nigeria)', '3–5 business days', 'From ₦4,500'],
  ['International', '7–14 business days', 'From ₦35,000 / $45'],
]

export default function Shipping() {
  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO
        title="Shipping Policy"
        description="Delivery timelines and costs from Aura Blaze Creative — Lagos, nationwide Nigeria, and international shipping."
        path="/shipping"
      />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Shipping Policy</h1>
      <p className="text-grey mb-12 leading-relaxed">
        We ship across Nigeria and internationally. Orders above ₦50,000 (or $65) qualify
        for free standard delivery within Nigeria.
      </p>

      <table className="w-full text-sm mb-12">
        <thead>
          <tr className="border-b border-hairline text-left text-grey">
            <th className="pb-3 font-medium">Destination</th>
            <th className="pb-3 font-medium">Delivery Time</th>
            <th className="pb-3 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-hairline/50">
              <td className="py-4 font-medium">{row[0]}</td>
              <td className="py-4 text-grey">{row[1]}</td>
              <td className="py-4 text-grey">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-6 text-grey text-[15px] leading-relaxed">
        <p>
          Local Lagos orders are delivered via our courier partners. Nationwide and
          international orders are fulfilled through GIG Logistics and DHL respectively.
          You'll receive a tracking link by email as soon as your order ships.
        </p>
        <p>
          Delivery times are estimates and may vary due to customs processing on
          international orders.
        </p>
      </div>
    </div>
  )
}
