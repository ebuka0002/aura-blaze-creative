import SEO from '../components/SEO'

const rows = [
  ['Nigeria: GIG Logistics (recommended)', '3–5 working days', 'Calculated at checkout'],
  ['Nigeria: Red Star Express', '3–7 working days', 'Calculated at checkout'],
  ['International', '7–14 business days', 'From ₦35,000 / $45'],
]

export default function Shipping() {
  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO
        title="Shipping Policy"
        description="Delivery timelines and costs from Aura Blaze Creative — nationwide Nigeria and international shipping."
        path="/shipping"
      />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Shipping Policy</h1>
      <p className="text-grey mb-12 leading-relaxed">
        We ship across Nigeria and internationally. Shipping costs are calculated based on your delivery destination and selected shipping method.
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

      <div className="border-l-2 border-blaze/40 pl-4 mb-8 text-grey text-sm leading-relaxed">
        <p className="font-medium text-void mb-1">A note on Red Star tracking</p>
        <p>
          Red Star Express's online tracker is still settling in, so updates for your parcel
          may take a while to appear, or may not show right away. Your order is booked and
          on its way, and the tracker is simply catching up. If you'd like a status check at
          any time, message us and we'll happily confirm it for you.
        </p>
      </div>

      <div className="space-y-6 text-grey text-[15px] leading-relaxed">
        <p>
          Orders within Nigeria are delivered by GIG Logistics or Red Star Express, and you
          choose your courier at checkout. Once your order is booked, you'll see your waybill
          number and a Track button on your order confirmation and in your order history.
        </p>
        <p>
          Delivery times are estimates and may vary due to customs processing on
          international orders.
        </p>
      </div>
    </div>
  )
}
