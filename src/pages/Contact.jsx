import { useState } from 'react'
import { Mail, Phone, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import SEO from '../components/SEO'
import { supabase } from '../lib/supabase'

const IconInstagram = (props) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
)

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (result) setResult(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return

    setSending(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-message', {
        body: form,
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setResult({
        type: 'success',
        message: 'Thank you. Your message has been sent successfully. We’ll get back to you soon.',
      })
      setForm({ name: '', email: '', subject: '', message: '', website: '' })
    } catch (error) {
      console.error('Contact form error:', error)
      setResult({
        type: 'error',
        message: error?.message || "We couldn't send your message. Please try again or email us directly at info@aurablazecreative.com.",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-14 md:py-20">
      <SEO
        title="Contact Us"
        description="Get in touch with Aura Blaze Creative — questions about an order, sizing, or a collaboration."
        path="/contact"
      />
      <h1 className="font-display text-5xl md:text-6xl tracking-wide mb-3">Contact Us</h1>
      <p className="text-grey mb-12 max-w-md">
        Questions about an order, sizing, or a collaboration — we read everything.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-14">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              required
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              autoComplete="name"
              className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
            />
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
              className="border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
            />
          </div>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Subject"
            className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze"
          />
          <textarea
            required
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={5}
            placeholder="Message"
            className="w-full border border-hairline px-4 py-3.5 text-sm focus:outline-none focus:border-blaze resize-none"
          />

          {/* Honeypot anti-spam field. Kept invisible to normal visitors. */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              value={form.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {result && (
            <div
              role="status"
              className={`flex items-start gap-3 border px-4 py-3.5 text-sm ${
                result.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {result.type === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
              )}
              <p>{result.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="bg-void text-bone px-8 py-3.5 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </form>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Mail size={19} strokeWidth={1.5} className="mt-0.5 text-blaze" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <a href="mailto:info@aurablazecreative.com" className="text-sm text-grey hover:text-blaze">
                info@aurablazecreative.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Phone size={19} strokeWidth={1.5} className="mt-0.5 text-blaze" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-grey">+234 814 859 9680</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MessageCircle size={19} strokeWidth={1.5} className="mt-0.5 text-blaze" />
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <a href="https://wa.me/2348148599680" className="text-sm text-grey hover:text-blaze">Chat with us</a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <IconInstagram className="mt-0.5 text-blaze shrink-0" />
            <div>
              <p className="text-sm font-medium">Instagram</p>
              <p className="text-sm text-grey">@aura__blaze_creative</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
