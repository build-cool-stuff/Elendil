import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/notes
 * Returns all admin notes, pinned first.
 */
export async function GET() {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()

  const { data: notes, error } = await supabase
    .from('admin_notes')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: notes || [] })
}

/**
 * POST /api/admin/notes
 * Create a new admin note.
 */
export async function POST(request: NextRequest) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('admin_notes')
    .insert({
      title: body.title?.trim() || '',
      content: body.content?.trim() || '',
      pinned: body.pinned || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
