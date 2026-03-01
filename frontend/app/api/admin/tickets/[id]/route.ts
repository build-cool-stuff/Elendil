import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/tickets/[id]
 * Returns a single ticket with all replies.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServerClient()

  // Get ticket with user info
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*, users!inner(email, full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Get replies
  const { data: replies } = await supabase
    .from('ticket_replies')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    ticket,
    replies: replies || [],
  })
}

/**
 * PATCH /api/admin/tickets/[id]
 * Update ticket status or priority.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const supabase = createServerClient()

  const updates: Record<string, string> = {}
  if (body.status) updates.status = body.status
  if (body.priority) updates.priority = body.priority

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/admin/tickets/[id]
 * Add an admin reply to a ticket.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('ticket_replies')
    .insert({
      ticket_id: id,
      author_type: 'admin',
      author_id: null,
      message: body.message.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
