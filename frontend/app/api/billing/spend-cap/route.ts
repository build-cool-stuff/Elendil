import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { ensureUserExists } from '@/lib/supabase/ensure-user'

const spendCapSchema = z.object({
  spend_cap_enabled: z.boolean().optional(),
  spend_cap_amount_aud: z.number().min(100).max(1000000).optional(),
}).refine(
  (data) => data.spend_cap_enabled !== undefined || data.spend_cap_amount_aud !== undefined,
  { message: 'Provide spend_cap_enabled and/or spend_cap_amount_aud' }
)

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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = spendCapSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.spend_cap_enabled !== undefined) {
    updateData.spend_cap_enabled = parsed.data.spend_cap_enabled
  }
  if (parsed.data.spend_cap_amount_aud !== undefined) {
    updateData.spend_cap_amount_aud = parsed.data.spend_cap_amount_aud
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
