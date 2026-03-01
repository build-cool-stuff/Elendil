import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/tasks
 * Returns all admin dev tasks.
 */
export async function GET() {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()

  const { data: tasks, error } = await supabase
    .from('admin_tasks')
    .select('*')
    .order('status', { ascending: true }) // todo first, then in_progress, then done
    .order('priority', { ascending: true }) // high first
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: tasks || [] })
}

/**
 * POST /api/admin/tasks
 * Create a new dev task.
 */
export async function POST(request: NextRequest) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('admin_tasks')
    .insert({
      title: body.title.trim(),
      description: body.description?.trim() || '',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
