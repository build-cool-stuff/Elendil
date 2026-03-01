import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/tickets
 * Returns all support tickets with user info.
 */
export async function GET(request: NextRequest) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') // 'open', 'in_progress', 'resolved', 'closed', or null for all
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const supabase = createServerClient()

  let query = supabase
    .from('support_tickets')
    .select('*, users!inner(email, full_name, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: tickets, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tickets: tickets || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
}
