import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Aura Blaze Creative'
const DEFAULT_DESCRIPTION =
  '…embrace luxury with ease. Premium, minimalist streetwear from Aura Blaze Creative — timeless, distinct, iconic. Shop jackets, shirts, and headwear, shipping across Nigeria and internationally.'
// TODO: replace with a real, dedicated 1200x630 social-share image once
// Ebuka has one — using the logo as a placeholder works but a proper
// branded OG image (product shot + wordmark) will look far better when
// links are shared on WhatsApp/Twitter/Facebook.
const DEFAULT_OG_IMAGE = '/apple-touch-icon.png'
const SITE_URL = 'https://aurablazecreative.com'

/**
 * Drop this into any page to set that page's browser tab title, meta
 * description, and Open Graph / Twitter Card tags (what shows up when a
 * link to this page is shared on WhatsApp, Twitter, Facebook, etc).
 *
 * Only `title` is required — everything else falls back to sensible
 * site-wide defaults.
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  path = '',
  type = 'website',
  noindex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Timeless. Distinct. Iconic.`
  const url = `${SITE_URL}${path}`
  const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />

      {/* Open Graph — WhatsApp, Facebook, LinkedIn link previews */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  )
}
