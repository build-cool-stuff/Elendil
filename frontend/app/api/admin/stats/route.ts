import { NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

const PRICE_PER_SCAN_AUD = 20

/**
 * GET /api/admin/stats
 * Returns business overview stats for admin dashboard.
 */
export async function GET() {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Run queries in parallel
  const [
    usersResult,
    recentUsersResult,
    campaignsResult,
    activeCampaignsResult,
    totalScansResult,
    scans30dResult,
    scans7dResult,
    firstScans30dResult,
    billingActiveResult,
    openTicketsResult,
    pendingTasksResult,
  ] = await Promise.all([
    // Total users
    supabase.from('users').select('*', { count: 'exact', head: true }),
    // Users joined in last 30 days
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    // Total campaigns
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    // Active campaigns
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // Total scans all time
    supabase.from('scans').select('*', { count: 'exact', head: true }),
    // Scans in last 30 days
    supabase.from('scans').select('*', { count: 'exact', head: true }).gte('scanned_at', thirtyDaysAgo),
    // Scans in last 7 days
    supabase.from('scans').select('*', { count: 'exact', head: true }).gte('scanned_at', sevenDaysAgo),
    // Billable scans in last 30 days (first scans only)
    supabase.from('scans').select('*', { count: 'exact', head: true }).gte('scanned_at', thirtyDaysAgo).eq('is_first_scan', true),
    // Users with active billing
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('billing_active', true),
    // Open support tickets
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    // Pending dev tasks
    supabase.from('admin_tasks').select('*', { count: 'exact', head: true }).in('status', ['todo', 'in_progress']),
  ])

  const billableScans30d = firstScans30dResult.count || 0
  const revenue30d = billableScans30d * PRICE_PER_SCAN_AUD

  return NextResponse.json({
    users: {
      total: usersResult.count || 0,
      new_30d: recentUsersResult.count || 0,
    },
    campaigns: {
      total: campaignsResult.count || 0,
      active: activeCampaignsResult.count || 0,
    },
    scans: {
      total: totalScansResult.count || 0,
      last_30d: scans30dResult.count || 0,
      last_7d: scans7dResult.count || 0,
      billable_30d: billableScans30d,
    },
    revenue: {
      last_30d_aud: revenue30d,
      price_per_scan_aud: PRICE_PER_SCAN_AUD,
    },
    billing: {
      active_subscribers: billingActiveResult.count || 0,
    },
    support: {
      open_tickets: openTicketsResult.count || 0,
    },
    tasks: {
      pending: pendingTasksResult.count || 0,
    },
  })
}
