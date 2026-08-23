import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import SEO from '../components/SEO'

const faqs = [
  {
    q: 'How do I know what size to order?',
    a: 'Every product page has a size guide with detailed chest and length measurements. Our pieces run oversized by design — size down if you prefer a closer fit.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept card payments (Visa, Mastercard), bank transfers, USSD, and mobile money through Paystack. Prices are shown in NGN for Nigerian customers and USD for international customers.',
  },
  {
    q: 'How long does shipping take?',
    a: 'Lagos delivery: 2–3 days. Nationwide Nigeria: 3–5 days. International: 7–14 days depending on destination.',
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'Yes — unworn items with tags attached can be returned within 14 days of delivery. See our Returns & Exchange page for full details.',
  },
  {
    q: 'Do you ship internationally?',
    a: 'Yes, we ship worldwide via DHL/FedEx. International shipping costs and timelines are calculated at checkout.',
  },
  {
    q: 'How do I track my order?',
    a: 'You\'ll receive a tracking link by email once your order ships. You can also check order status from your account if you checked out with an account.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState(0)

  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO
        title="FAQ"
        description="Answers to common questions about sizing, shipping, payments, and returns at Aura Blaze Creative."
        path="/faq"
      />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">FAQ</h1>
      <p className="text-grey mb-12">Sizing, shipping, payments, returns — the quick answers.</p>

      <div className="divide-y divide-hairline">
        {faqs.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between py-5 text-left gap-4"
            >
              <span className="font-medium">{item.q}</span>
              {open === i ? <Minus size={18} className="shrink-0 text-blaze" /> : <Plus size={18} className="shrink-0" />}
            </button>
            {open === i && (
              <p className="text-grey text-sm leading-relaxed pb-5 pr-8">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
