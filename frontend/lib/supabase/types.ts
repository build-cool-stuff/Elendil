export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Campaign status type
export type CampaignStatus = 'active' | 'paused' | 'archived'

// Cookie duration options
export type CookieDuration = 30 | 60 | 90

// Device types
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Conversion types
export type ConversionType = 'view' | 'click' | 'lead' | 'purchase'

// Meta integration status
export type MetaIntegrationStatus = 'active' | 'expired' | 'revoked'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          meta_pixel_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          meta_pixel_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          meta_pixel_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          user_id: string
          contact_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          status?: string
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          contact_id: string | null
          type: string
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_id?: string | null
          type: string
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string | null
          type?: string
          description?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          destination_url: string
          tracking_code: string
          slug: string | null
          cookie_duration_days: CookieDuration
          bridge_enabled: boolean
          bridge_duration_ms: number
          custom_domain: string | null
          qr_code_svg: string | null
          qr_code_data_url: string | null
          status: CampaignStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          destination_url: string
          tracking_code: string
          slug?: string | null
          cookie_duration_days?: CookieDuration
          bridge_enabled?: boolean
          bridge_duration_ms?: number
          custom_domain?: string | null
          qr_code_svg?: string | null
          qr_code_data_url?: string | null
          status?: CampaignStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          destination_url?: string
          tracking_code?: string
          slug?: string | null
          cookie_duration_days?: CookieDuration
          bridge_enabled?: boolean
          bridge_duration_ms?: number
          custom_domain?: string | null
          qr_code_svg?: string | null
          qr_code_data_url?: string | null
          status?: CampaignStatus
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          campaign_id: string
          visitor_id: string
          ip_address_hash: string | null
          latitude: number | null
          longitude: number | null
          suburb: string | null
          postcode: string | null
          state: string | null
          country: string
          user_agent: string | null
          device_type: DeviceType | null
          browser: string | null
          os: string | null
          referrer: string | null
          scanned_at: string
          cookie_expires_at: string | null
          is_first_scan: boolean
          meta_event_id: string | null
          // BigDataCloud precision geo fields
          locality_name: string | null
          city: string | null
          state_code: string | null
          country_code: string | null
          confidence_radius_km: number | null
          geo_source: 'bigdatacloud' | 'vercel' | 'fallback' | null
          isp_name: string | null
          network_type: string | null
          connection_type: string | null
          is_vpn: boolean
          is_proxy: boolean
          is_tor: boolean
        }
        Insert: {
          id?: string
          campaign_id: string
          visitor_id: string
          ip_address_hash?: string | null
          latitude?: number | null
          longitude?: number | null
          suburb?: string | null
          postcode?: string | null
          state?: string | null
          country?: string
          user_agent?: string | null
          device_type?: DeviceType | null
          browser?: string | null
          os?: string | null
          referrer?: string | null
          scanned_at?: string
          cookie_expires_at?: string | null
          is_first_scan?: boolean
          meta_event_id?: string | null
          // BigDataCloud precision geo fields
          locality_name?: string | null
          city?: string | null
          state_code?: string | null
          country_code?: string | null
          confidence_radius_km?: number | null
          geo_source?: 'bigdatacloud' | 'vercel' | 'fallback' | null
          isp_name?: string | null
          network_type?: string | null
          connection_type?: string | null
          is_vpn?: boolean
          is_proxy?: boolean
          is_tor?: boolean
        }
        Update: {
          id?: string
          campaign_id?: string
          visitor_id?: string
          ip_address_hash?: string | null
          latitude?: number | null
          longitude?: number | null
          suburb?: string | null
          postcode?: string | null
          state?: string | null
          country?: string
          user_agent?: string | null
          device_type?: DeviceType | null
          browser?: string | null
          os?: string | null
          referrer?: string | null
          scanned_at?: string
          cookie_expires_at?: string | null
          is_first_scan?: boolean
          meta_event_id?: string | null
          // BigDataCloud precision geo fields
          locality_name?: string | null
          city?: string | null
          state_code?: string | null
          country_code?: string | null
          confidence_radius_km?: number | null
          geo_source?: 'bigdatacloud' | 'vercel' | 'fallback' | null
          isp_name?: string | null
          network_type?: string | null
          connection_type?: string | null
          is_vpn?: boolean
          is_proxy?: boolean
          is_tor?: boolean
        }
      }
      suburbs: {
        Row: {
          id: string
          name: string
          postcode: string
          state: string
          latitude: number
          longitude: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          postcode: string
          state: string
          latitude: number
          longitude: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          postcode?: string
          state?: string
          latitude?: number
          longitude?: number
          created_at?: string
        }
      }
      meta_integrations: {
        Row: {
          id: string
          user_id: string
          meta_user_id: string | null
          access_token: string
          encrypted_access_token: string | null
          encryption_iv: string | null
          encryption_version: number | null
          token_expires_at: string | null
          ad_account_id: string | null
          pixel_id: string | null
          business_id: string | null
          permissions: Json | null
          status: MetaIntegrationStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meta_user_id?: string | null
          access_token: string
          encrypted_access_token?: string | null
          encryption_iv?: string | null
          encryption_version?: number | null
          token_expires_at?: string | null
          ad_account_id?: string | null
          pixel_id?: string | null
          business_id?: string | null
          permissions?: Json | null
          status?: MetaIntegrationStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          meta_user_id?: string | null
          access_token?: string
          encrypted_access_token?: string | null
          encryption_iv?: string | null
          encryption_version?: number | null
          token_expires_at?: string | null
          ad_account_id?: string | null
          pixel_id?: string | null
          business_id?: string | null
          permissions?: Json | null
          status?: MetaIntegrationStatus
          created_at?: string
          updated_at?: string
        }
      }
      meta_campaigns: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          meta_campaign_id: string
          meta_campaign_name: string | null
          meta_adset_id: string | null
          meta_ad_id: string | null
          objective: string | null
          status: string | null
          spend: number | null
          impressions: number | null
          clicks: number | null
          reach: number | null
          date_start: string | null
          date_stop: string | null
          synced_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          meta_campaign_id: string
          meta_campaign_name?: string | null
          meta_adset_id?: string | null
          meta_ad_id?: string | null
          objective?: string | null
          status?: string | null
          spend?: number | null
          impressions?: number | null
          clicks?: number | null
          reach?: number | null
          date_start?: string | null
          date_stop?: string | null
          synced_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          meta_campaign_id?: string
          meta_campaign_name?: string | null
          meta_adset_id?: string | null
          meta_ad_id?: string | null
          objective?: string | null
          status?: string | null
          spend?: number | null
          impressions?: number | null
          clicks?: number | null
          reach?: number | null
          date_start?: string | null
          date_stop?: string | null
          synced_at?: string
          created_at?: string
        }
      }
      conversions: {
        Row: {
          id: string
          user_id: string
          scan_id: string | null
          campaign_id: string | null
          meta_campaign_id: string | null
          conversion_type: ConversionType
          conversion_value: number | null
          currency: string
          attribution_window_days: number | null
          days_to_conversion: number | null
          converted_at: string
          scan_at: string | null
          meta_event_id: string | null
          meta_event_name: string | null
        }
        Insert: {
          id?: string
          user_id: string
          scan_id?: string | null
          campaign_id?: string | null
          meta_campaign_id?: string | null
          conversion_type: ConversionType
          conversion_value?: number | null
          currency?: string
          attribution_window_days?: number | null
          days_to_conversion?: number | null
          converted_at?: string
          scan_at?: string | null
          meta_event_id?: string | null
          meta_event_name?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          scan_id?: string | null
          campaign_id?: string | null
          meta_campaign_id?: string | null
          conversion_type?: ConversionType
          conversion_value?: number | null
          currency?: string
          attribution_window_days?: number | null
          days_to_conversion?: number | null
          converted_at?: string
          scan_at?: string | null
          meta_event_id?: string | null
          meta_event_name?: string | null
        }
      }
      scan_aggregates: {
        Row: {
          id: string
          campaign_id: string
          date: string
          hour: number | null
          suburb: string | null
          postcode: string | null
          state: string | null
          total_scans: number
          unique_visitors: number
          mobile_scans: number
          desktop_scans: number
          tablet_scans: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          date: string
          hour?: number | null
          suburb?: string | null
          postcode?: string | null
          state?: string | null
          total_scans?: number
          unique_visitors?: number
          mobile_scans?: number
          desktop_scans?: number
          tablet_scans?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          date?: string
          hour?: number | null
          suburb?: string | null
          postcode?: string | null
          state?: string | null
          total_scans?: number
          unique_visitors?: number
          mobile_scans?: number
          desktop_scans?: number
          tablet_scans?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Convenience type aliases
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
export type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

export type Scan = Database['public']['Tables']['scans']['Row']
export type ScanInsert = Database['public']['Tables']['scans']['Insert']

export type Suburb = Database['public']['Tables']['suburbs']['Row']

export type MetaIntegration = Database['public']['Tables']['meta_integrations']['Row']
export type MetaCampaign = Database['public']['Tables']['meta_campaigns']['Row']
export type Conversion = Database['public']['Tables']['conversions']['Row']
export type ScanAggregate = Database['public']['Tables']['scan_aggregates']['Row']
