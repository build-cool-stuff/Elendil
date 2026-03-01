import { NextRequest, NextResponse } from 'next/server'
import { checkAdminApi } from '@/lib/admin/auth'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users
 * Returns all SaaS user accounts with their stats.
 */
export async function GET(request: NextRequest) {
  const adminId = await checkAdminApi()
  if (!adminId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  const supabase = createServerClient()

  // Get users with pagination and optional search
  let query = supabase
    .from('users')
    .select('id, clerk_id, email, full_name, avatar_url, billing_active, stripe_customer_id, grace_period_end, degraded_since, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data: users, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For each user, get campaign count and scan count
  const userIds = (users || []).map(u => u.id)

  let userStats: Record<string, { campaign_count: number; scan_count: number; last_scan: string | null }> = {}

  if (userIds.length > 0) {
    // Get campaign counts per user
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('user_id, id')
      .in('user_id', userIds)

    // Group campaigns by user
    const campaignsByUser: Record<string, string[]> = {}
    for (const c of campaigns || []) {
      if (!campaignsByUser[c.user_id]) campaignsByUser[c.user_id] = []
      campaignsByUser[c.user_id].push(c.id)
    }

    // Get scan counts per campaign
    const allCampaignIds = (campaigns || []).map(c => c.id)
    let scansByUser: Record<string, { count: number; last_scan: string | null }> = {}

    if (allCampaignIds.length > 0) {
      const { data: scanData } = await supabase
        .from('scans')
        .select('campaign_id, scanned_at')
        .in('campaign_id', allCampaignIds)
        .order('scanned_at', { ascending: false })

      // Aggregate scans by user
      for (const scan of scanData || []) {
        // Find which user owns this campaign
        for (const [userId, campaignIds] of Object.entries(campaignsByUser)) {
          if (campaignIds.includes(scan.campaign_id)) {
            if (!scansByUser[userId]) scansByUser[userId] = { count: 0, last_scan: null }
            scansByUser[userId].count++
            if (!scansByUser[userId].last_scan) {
              scansByUser[userId].last_scan = scan.scanned_at
            }
            break
          }
        }
      }
    }

    // Build stats map
    for (const userId of userIds) {
      userStats[userId] = {
        campaign_count: (campaignsByUser[userId] || []).length,
        scan_count: scansByUser[userId]?.count || 0,
        last_scan: scansByUser[userId]?.last_scan || null,
      }
    }
  }

  // Merge stats with user data
  const usersWithStats = (users || []).map(user => ({
    ...user,
    stats: userStats[user.id] || { campaign_count: 0, scan_count: 0, last_scan: null },
  }))

  return NextResponse.json({
    users: usersWithStats,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
}
