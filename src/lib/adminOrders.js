import { supabase } from './supabase'

// Fetch all orders for the admin view.
export async function fetchAllOrdersAdmin() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data
}

export async function fetchOrderItemsAdmin(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)

  if (error) throw error

  return data
}

export async function updateOrderStatus(orderId, status) {
  // --------------------------------------------------
  // UPDATE ORDER STATUS
  // --------------------------------------------------

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) throw error

  // --------------------------------------------------
  // SEND FULFILLED EMAIL
  // --------------------------------------------------

  if (status === 'fulfilled') {
    try {
      const { data, error: functionError } =
        await supabase.functions.invoke(
          'send-fulfilled-email',
          {
            body: {
              orderId,
            },
          }
        )

      if (functionError) {
        console.error(
          'Fulfilled email function failed:',
          functionError
        )

        return {
          statusUpdated: true,
          emailSent: false,
          emailError:
            functionError.message ||
            'Could not send fulfilled email.',
        }
      }

      if (data?.error) {
        console.error(
          'Fulfilled email error:',
          data.error
        )

        return {
          statusUpdated: true,
          emailSent: false,
          emailError: data.error,
        }
      }

      return {
        statusUpdated: true,
        emailSent: data?.emailSent === true,
        alreadySent:
          data?.alreadySent === true,
      }
    } catch (err) {
      console.error(
        'Failed to send fulfilled email:',
        err
      )

      return {
        statusUpdated: true,
        emailSent: false,
        emailError:
          err.message ||
          'Could not send fulfilled email.',
      }
    }
  }

  return {
    statusUpdated: true,
    emailSent: false,
  }
}