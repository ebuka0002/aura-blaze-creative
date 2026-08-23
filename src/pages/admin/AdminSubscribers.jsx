import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  RefreshCw,
} from 'lucide-react'

import {
  fetchSubscribers,
  updateSubscriberStatus,
  deleteSubscriber,
} from '../../lib/adminSubcribers'

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadSubscribers = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchSubscribers()
      setSubscribers(data)
    } catch (err) {
      console.error('Failed to load subscribers:', err)
      setError(
        'Could not load subscribers. Make sure your admin account has access.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscribers()
  }, [])

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) => {
      const matchesSearch = subscriber.email
        ?.toLowerCase()
        .includes(search.toLowerCase())

      const matchesFilter =
        filter === 'all' ||
        subscriber.status === filter

      return matchesSearch && matchesFilter
    })
  }, [subscribers, search, filter])

  const subscribedCount = subscribers.filter(
    (subscriber) => subscriber.status === 'subscribed'
  ).length

  const unsubscribedCount = subscribers.filter(
    (subscriber) => subscriber.status === 'unsubscribed'
  ).length

  const handleToggleStatus = async (subscriber) => {
    const newStatus =
      subscriber.status === 'subscribed'
        ? 'unsubscribed'
        : 'subscribed'

    setUpdatingId(subscriber.id)

    try {
      const updated = await updateSubscriberStatus(
        subscriber.id,
        newStatus
      )

      setSubscribers((prev) =>
        prev.map((item) =>
          item.id === subscriber.id
            ? updated
            : item
        )
      )
    } catch (err) {
      console.error(
        'Failed to update subscriber:',
        err
      )

      alert(
        'Could not update this subscriber. Please try again.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (subscriber) => {
    const confirmed = confirm(
      `Delete ${subscriber.email} permanently? This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(subscriber.id)

    try {
      await deleteSubscriber(subscriber.id)

      setSubscribers((prev) =>
        prev.filter(
          (item) => item.id !== subscriber.id
        )
      )
    } catch (err) {
      console.error(
        'Failed to delete subscriber:',
        err
      )

      alert(
        'Could not delete this subscriber. Please try again.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-wide">
            Subscribers
          </h1>

          <p className="text-grey text-sm mt-1">
            Manage your Aura Blaze newsletter audience.
          </p>
        </div>

        <button
          onClick={loadSubscribers}
          disabled={loading}
          className="flex items-center justify-center gap-2 border border-void px-4 py-2.5 text-sm hover:bg-void hover:text-bone transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />

          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-hairline p-5">
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-blaze" />

            <div>
              <p className="text-xs text-grey uppercase tracking-wider">
                Total
              </p>

              <p className="text-2xl font-medium mt-1">
                {subscribers.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-hairline p-5">
          <div className="flex items-center gap-3">
            <UserCheck size={20} className="text-green-600" />

            <div>
              <p className="text-xs text-grey uppercase tracking-wider">
                Subscribed
              </p>

              <p className="text-2xl font-medium mt-1">
                {subscribedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-hairline p-5">
          <div className="flex items-center gap-3">
            <UserX size={20} className="text-grey" />

            <div>
              <p className="text-xs text-grey uppercase tracking-wider">
                Unsubscribed
              </p>

              <p className="text-2xl font-medium mt-1">
                {unsubscribedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-grey"
          />

          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full border border-hairline bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blaze"
          />
        </div>

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
          className="border border-hairline bg-white px-4 py-3 text-sm focus:outline-none focus:border-blaze"
        >
          <option value="all">All subscribers</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">
            Unsubscribed
          </option>
        </select>
      </div>

      {error && (
        <div className="border border-blaze/30 bg-blaze/5 text-blaze text-sm p-4 mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-grey text-sm">
          Loading subscribers…
        </p>
      ) : filteredSubscribers.length === 0 ? (
        <div className="bg-white border border-hairline p-10 text-center">
          <Mail
            size={30}
            className="mx-auto mb-4 text-grey"
          />

          <p className="text-sm font-medium">
            No subscribers found
          </p>

          <p className="text-xs text-grey mt-1">
            Try changing your search or filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-hairline rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-hairline bg-bone-dim text-left">
                <th className="px-5 py-3 font-medium text-grey">
                  Email
                </th>

                <th className="px-5 py-3 font-medium text-grey">
                  Status
                </th>

                <th className="px-5 py-3 font-medium text-grey">
                  Subscribed
                </th>

                <th className="px-5 py-3 font-medium text-grey text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredSubscribers.map(
                (subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="border-b border-hairline last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">
                      {subscriber.email}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          subscriber.status ===
                          'subscribed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-hairline text-grey'
                        }`}
                      >
                        {subscriber.status ===
                        'subscribed'
                          ? 'Subscribed'
                          : 'Unsubscribed'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-grey">
                      {subscriber.created_at
                      ? new Date(
                          subscriber.created_at
                        ).toLocaleDateString()
                      : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() =>
                            handleToggleStatus(
                              subscriber
                            )
                          }
                          disabled={
                            updatingId ===
                            subscriber.id
                          }
                          className="text-xs underline underline-offset-4 hover:text-blaze disabled:opacity-50"
                        >
                          {updatingId ===
                          subscriber.id
                            ? 'Updating…'
                            : subscriber.status ===
                              'subscribed'
                            ? 'Unsubscribe'
                            : 'Resubscribe'}
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              subscriber
                            )
                          }
                          disabled={
                            deletingId ===
                            subscriber.id
                          }
                          className="text-grey hover:text-blaze disabled:opacity-50"
                          title="Delete subscriber"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}