import { useState } from 'react'
import { Star } from 'lucide-react'

export default function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating.')
      return
    }
    if (!name.trim() || !text.trim()) {
      setError('Please fill in your name and review.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), rating, text: text.trim() })
      setSubmitted(true)
    } catch {
      setError('Something went wrong submitting your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="border border-hairline p-6 text-center">
        <p className="font-medium">Thanks for your review!</p>
        <p className="text-sm text-grey mt-1">It's now live below.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-hairline p-6 space-y-4">
      <h3 className="font-display text-xl tracking-wide">Write a Review</h3>

      <div>
        <label className="text-xs tracking-[0.1em] uppercase text-grey block mb-2">Your Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              <Star
                size={22}
                className={(hoverRating || rating) >= n ? 'fill-blaze text-blaze' : 'text-hairline'}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="review-name" className="text-xs tracking-[0.1em] uppercase text-grey block mb-2">
          Your Name
        </label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chidi O."
          className="w-full border border-hairline px-4 py-3 text-sm focus:outline-none focus:border-blaze"
        />
      </div>

      <div>
        <label htmlFor="review-text" className="text-xs tracking-[0.1em] uppercase text-grey block mb-2">
          Your Review
        </label>
        <textarea
          id="review-text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell other customers what you think…"
          className="w-full border border-hairline px-4 py-3 text-sm focus:outline-none focus:border-blaze resize-none"
        />
      </div>

      {error && <p className="text-xs text-blaze">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-void text-bone px-7 py-3 text-sm tracking-[0.1em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
