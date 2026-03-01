import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

/**
 * GET /api/billing/spend-cap
 * Returns the current user's spend cap settings.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUserId = await ensureUserExists()
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }

  const supabase = createServerClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('spend_cap_enabled, spend_cap_amount_aud')
    .eq('id', supabaseUserId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    spend_cap_enabled: user?.spend_cap_enabled ?? true,
    spend_cap_amount_aud: user?.spend_cap_amount_aud ?? 5000,
  })
}

/**
 * PATCH /api/billing/spend-cap
 * Updates the user's spend cap settings.
 *
 * Body (all fields optional):
 *   spend_cap_enabled: boolean   — master on/off for cap enforcement
 *   spend_cap_amount_aud: number — the dollar cap (min $100, max $1,000,000)
 *
 * Both fields can be updated in a single request.
 * When spend_cap_enabled is false, the amount is still stored but not enforced.
 */
export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUserId = await ensureUserExists()
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
  }

  const body = await request.json()
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Validate spend_cap_enabled (binary on/off toggle)
  if (body.spend_cap_enabled !== undefined) {
    if (typeof body.spend_cap_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'spend_cap_enabled must be a boolean (true or false)' },
        { status: 400 }
      )
    }
    updateData.spend_cap_enabled = body.spend_cap_enabled
  }

  // Validate spend_cap_amount_aud (the dollar threshold)
  if (body.spend_cap_amount_aud !== undefined) {
    const amount = Number(body.spend_cap_amount_aud)
    if (isNaN(amount) || amount < 100 || amount > 1000000) {
      return NextResponse.json(
        { error: 'spend_cap_amount_aud must be between $100 and $1,000,000 AUD' },
        { status: 400 }
      )
    }
    updateData.spend_cap_amount_aud = amount
  }

  // Require at least one field to update
  if (Object.keys(updateData).length === 1) {
    return NextResponse.json(
      { error: 'No valid fields to update. Provide spend_cap_enabled and/or spend_cap_amount_aud.' },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  const { data: user, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', supabaseUserId)
    .select('spend_cap_enabled, spend_cap_amount_aud')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    spend_cap_enabled: user?.spend_cap_enabled ?? true,
    spend_cap_amount_aud: user?.spend_cap_amount_aud ?? 5000,
    message: 'Spend cap settings updated',
  })
}
