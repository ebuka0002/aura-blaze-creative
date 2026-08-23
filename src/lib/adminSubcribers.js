import { supabase } from './supabase'

// Get all subscribers
export async function fetchSubscribers() {
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchSubscribers Supabase error:', error)
    throw error
  }

  return data || []
}

// Update subscriber status
export async function updateSubscriberStatus(id, status) {
  const updateData = {
    status,
  }

  if (status === 'unsubscribed') {
    updateData.unsubscribed_at = new Date().toISOString()
  } else {
    updateData.unsubscribed_at = null
  }

  const { data, error } = await supabase
    .from('subscribers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(
      'updateSubscriberStatus Supabase error:',
      error
    )
    throw error
  }

  return data
}

// Delete subscriber
export async function deleteSubscriber(id) {
  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(
      'deleteSubscriber Supabase error:',
      error
    )
    throw error
  }
}