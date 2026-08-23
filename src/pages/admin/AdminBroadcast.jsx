import { useEffect, useState } from 'react'
import {
  Send,
  Users,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminBroadcast() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  // Broadcast image
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [subscriberCount, setSubscriberCount] = useState(0)
  const [loadingSubscribers, setLoadingSubscribers] = useState(true)

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // --------------------------------------------------
  // LOAD ACTIVE SUBSCRIBER COUNT
  // --------------------------------------------------

  const loadSubscriberCount = async () => {
    setLoadingSubscribers(true)

    try {
      const { count, error } = await supabase
        .from('subscribers')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'subscribed')

      if (error) {
        throw error
      }

      setSubscriberCount(count || 0)
    } catch (err) {
      console.error(
        'Failed to load subscriber count:',
        err
      )

      setSubscriberCount(0)
    } finally {
      setLoadingSubscribers(false)
    }
  }

  useEffect(() => {
    loadSubscriberCount()
  }, [])

  // --------------------------------------------------
  // IMAGE SELECT
  // --------------------------------------------------

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) return

    setError('')

    // Only allow images
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      e.target.value = ''
      return
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.')
      e.target.value = ''
      return
    }

    setImageFile(file)

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  // --------------------------------------------------
  // REMOVE IMAGE
  // --------------------------------------------------

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }

    setImageFile(null)
    setImagePreview('')

    const input = document.getElementById(
      'broadcast-image'
    )

    if (input) {
      input.value = ''
    }
  }

  // --------------------------------------------------
  // UPLOAD IMAGE
  // --------------------------------------------------

  const uploadBroadcastImage = async () => {
    if (!imageFile) {
      return null
    }

    setUploadingImage(true)

    try {
      const extension =
        imageFile.name.split('.').pop()?.toLowerCase() ||
        'jpg'

      const fileName = `broadcast-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}.${extension}`

      const filePath = `broadcasts/${fileName}`

      const { error: uploadError } =
        await supabase.storage
          .from('broadcast-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type,
          })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('broadcast-images')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        throw new Error(
          'Could not create a public image URL.'
        )
      }

      return publicUrlData.publicUrl
    } finally {
      setUploadingImage(false)
    }
  }

  // --------------------------------------------------
  // SEND BROADCAST
  // --------------------------------------------------

  const handleSend = async (e) => {
    e.preventDefault()

    setError('')
    setResult(null)

    if (!subject.trim()) {
      setError('Please enter an email subject.')
      return
    }

    if (!message.trim()) {
      setError('Please enter a message.')
      return
    }

    if (subscriberCount === 0) {
      setError(
        'There are no active subscribers to send to.'
      )
      return
    }

    const confirmed = window.confirm(
      `Send this broadcast to ${subscriberCount} active subscriber${
        subscriberCount === 1 ? '' : 's'
      }?`
    )

    if (!confirmed) return

    setSending(true)

    try {
      // Upload image first if one was selected
      const imageUrl =
        await uploadBroadcastImage()

      const { data, error } =
        await supabase.functions.invoke(
          'send-broadcast',
          {
            body: {
              subject: subject.trim(),
              message: message.trim(),
              imageUrl,
            },
          }
        )

      if (error) {
        console.error(
          'Broadcast function error:',
          error
        )

        throw new Error(
          error.message ||
            'Could not send broadcast.'
        )
      }

      if (!data) {
        throw new Error(
          'No response was received from the broadcast service.'
        )
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setResult({
        sent: data.sent || 0,
        failed: data.failed || 0,
        total: data.total || 0,
      })

      // Clear form after successful send
      setSubject('')
      setMessage('')
      removeImage()

      await loadSubscriberCount()
    } catch (err) {
      console.error(
        'Failed to send broadcast:',
        err
      )

      setError(
        err.message ||
          'Something went wrong while sending the broadcast.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px]">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-wide">
          Broadcast
        </h1>

        <p className="text-grey text-sm mt-1">
          Send an email to your Aura Blaze newsletter
          subscribers.
        </p>
      </div>

      {/* SUBSCRIBER COUNT */}
      <div className="bg-white border border-hairline p-5 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users
              size={21}
              className="text-blaze"
            />

            <div>
              <p className="text-xs text-grey uppercase tracking-wider">
                Active subscribers
              </p>

              <p className="text-2xl font-medium mt-1">
                {loadingSubscribers
                  ? '—'
                  : subscriberCount}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSubscriberCount}
            disabled={loadingSubscribers}
            className="flex items-center gap-2 border border-hairline px-3 py-2 text-xs hover:border-void transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={
                loadingSubscribers
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {/* SUCCESS */}
      {result && (
        <div className="border border-green-200 bg-green-50 text-green-800 p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-medium text-sm">
                Broadcast completed
              </p>

              <p className="text-sm mt-1">
                {result.sent} of {result.total}{' '}
                email
                {result.total === 1 ? '' : 's'} sent
                successfully.
              </p>

              {result.failed > 0 && (
                <p className="text-sm mt-1">
                  {result.failed} email
                  {result.failed === 1
                    ? ''
                    : 's'} failed.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="border border-blaze/30 bg-blaze/5 text-blaze p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* FORM */}
      <form
        onSubmit={handleSend}
        className="bg-white border border-hairline"
      >
        <div className="p-5 md:p-7">
          {/* SUBJECT */}
          <div className="mb-6">
            <label
              htmlFor="broadcast-subject"
              className="block text-sm font-medium mb-2"
            >
              Email subject
            </label>

            <input
              id="broadcast-subject"
              type="text"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
              placeholder="New drop is here..."
              disabled={sending}
              maxLength={150}
              className="w-full border border-hairline bg-white px-4 py-3 text-sm focus:outline-none focus:border-blaze disabled:opacity-60"
            />

            <p className="text-xs text-grey mt-2">
              This is the subject subscribers will
              see in their inbox.
            </p>
          </div>

          {/* IMAGE */}
          <div className="mb-6">
            <label
              htmlFor="broadcast-image"
              className="block text-sm font-medium mb-2"
            >
              Broadcast image
            </label>

            {!imagePreview ? (
              <label
                htmlFor="broadcast-image"
                className="flex flex-col items-center justify-center border border-dashed border-hairline bg-bone-dim px-6 py-10 cursor-pointer hover:border-blaze transition-colors"
              >
                <ImageIcon
                  size={28}
                  className="text-grey mb-3"
                />

                <p className="text-sm font-medium">
                  Choose an image
                </p>

                <p className="text-xs text-grey mt-1">
                  JPG, PNG, WEBP — maximum 5MB
                </p>

                <input
                  id="broadcast-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={sending}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative border border-hairline bg-bone-dim p-3">
                <img
                  src={imagePreview}
                  alt="Broadcast preview"
                  className="w-full max-h-[350px] object-cover"
                />

                <button
                  type="button"
                  onClick={removeImage}
                  disabled={sending}
                  className="absolute top-5 right-5 w-9 h-9 bg-void text-bone rounded-full flex items-center justify-center hover:bg-blaze transition-colors disabled:opacity-50"
                  title="Remove image"
                >
                  <X size={17} />
                </button>

                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {imageFile?.name}
                    </p>

                    <p className="text-xs text-grey mt-1">
                      {imageFile
                        ? `${(
                            imageFile.size /
                            1024 /
                            1024
                          ).toFixed(2)} MB`
                        : ''}
                    </p>
                  </div>

                  <label
                    htmlFor="broadcast-image"
                    className="text-xs underline cursor-pointer hover:text-blaze shrink-0"
                  >
                    Change image
                  </label>

                  <input
                    id="broadcast-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={sending}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-grey mt-2">
              This image will appear in the broadcast
              email above your message.
            </p>
          </div>

          {/* MESSAGE */}
          <div className="mb-6">
            <label
              htmlFor="broadcast-message"
              className="block text-sm font-medium mb-2"
            >
              Message
            </label>

            <textarea
              id="broadcast-message"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder={`Something new just dropped.

Discover the latest Aura Blaze pieces now.

Shop the collection at aurablazecreative.com`}
              disabled={sending}
              rows={14}
              className="w-full border border-hairline bg-white px-4 py-3 text-sm leading-6 resize-y focus:outline-none focus:border-blaze disabled:opacity-60"
            />

            <p className="text-xs text-grey mt-2">
              You can use paragraphs and line breaks.
              They will be preserved in the email.
            </p>
          </div>

          {/* EMAIL PREVIEW */}
          <div className="border border-hairline bg-bone-dim p-5 mb-6">
            <p className="text-xs uppercase tracking-wider text-grey mb-4">
              Preview
            </p>

            <div className="bg-white border border-hairline p-6 max-w-[600px]">
              <div className="text-center mb-6">
                <div className="text-xl font-bold tracking-[0.2em]">
                  AURA BLAZE
                </div>
              </div>

              <h2 className="font-display text-2xl mb-5">
                {subject || 'Your email subject'}
              </h2>

              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Broadcast"
                  className="w-full max-h-[320px] object-cover mb-6"
                />
              )}

              <div className="text-sm text-grey leading-7 whitespace-pre-wrap">
                {message ||
                  'Your message will appear here.'}
              </div>

              <div className="mt-8 pt-5 border-t border-hairline text-xs text-grey text-center">
                Distinct. Iconic. Timeless.
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-hairline px-5 md:px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-grey">
              This will be sent to{' '}
              <strong className="text-void">
                {subscriberCount}
              </strong>{' '}
              active subscriber
              {subscriberCount === 1
                ? ''
                : 's'}.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              sending ||
              loadingSubscribers ||
              uploadingImage ||
              subscriberCount === 0
            }
            className="flex items-center justify-center gap-2 bg-void text-bone px-6 py-3 text-sm tracking-[0.08em] uppercase font-medium hover:bg-blaze transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending || uploadingImage ? (
              <>
                <RefreshCw
                  size={16}
                  className="animate-spin"
                />
                {uploadingImage
                  ? 'Uploading Image...'
                  : 'Sending...'}
              </>
            ) : (
              <>
                <Send size={16} />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}