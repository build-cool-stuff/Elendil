import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/admin/notes/[id]
 * Update an admin note.
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

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.content !== undefined) updates.content = body.content
  if (body.pinned !== undefined) updates.pinned = body.pinned

  const { data, error } = await supabase
    .from('admin_notes')
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
 * DELETE /api/admin/notes/[id]
 * Delete an admin note.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from('admin_notes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
