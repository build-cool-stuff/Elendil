import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * PATCH /api/admin/tasks/[id]
 * Update a dev task.
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
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) updates.status = body.status
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.due_date !== undefined) updates.due_date = body.due_date

  const { data, error } = await supabase
    .from('admin_tasks')
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
 * DELETE /api/admin/tasks/[id]
 * Delete a dev task.
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
    .from('admin_tasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
