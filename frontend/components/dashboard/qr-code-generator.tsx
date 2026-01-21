"use client"

import { useState, useEffect } from "react"
import { Card, Button, Input, Badge } from "shared-components"
import { Plus, Download, Copy, ExternalLink, Trash2, QrCode, Eye, Pause, Play } from "lucide-react"
import type { Campaign, CampaignStatus } from "@/lib/supabase/types"

interface CampaignWithStats extends Campaign {
  stats?: {
    total_scans: number
    unique_visitors: number
  }
}

export function QRCodeGenerator() {
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithStats | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    destination_url: "",
    cookie_duration_days: 30 as 30 | 60 | 90,
  })

  // Fetch campaigns
  useEffect(() => {
    fetchCampaigns()
  }, [])

  async function fetchCampaigns() {
    try {
      const response = await fetch("/api/campaigns")
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setCampaigns([data.campaign, ...campaigns])
        setShowCreateForm(false)
        setFormData({
          name: "",
          description: "",
          destination_url: "",
          cookie_duration_days: 30,
        })
        setSelectedCampaign(data.campaign)
      } else {
        // Handle error response - might be empty or invalid JSON
        let errorMessage = "Failed to create campaign"
        try {
          const errorBody = await response.text()
          if (errorBody) {
            const error = JSON.parse(errorBody)
            errorMessage = error.error || errorMessage
          }
        } catch {
          // Response was empty or not JSON
          errorMessage = `Server error (${response.status})`
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Failed to create campaign:", error)
      alert("Failed to create campaign")
    } finally {
      setIsCreating(false)
    }
  }

  async function updateCampaignStatus(campaignId: string, status: CampaignStatus) {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setCampaigns(campaigns.map(c =>
          c.id === campaignId ? { ...c, status } : c
        ))
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign({ ...selectedCampaign, status })
        }
      }
    } catch (error) {
      console.error("Failed to update campaign:", error)
    }
  }

  async function deleteCampaign(campaignId: string) {
    if (!confirm("Are you sure you want to archive this campaign?")) return

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId))
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete campaign:", error)
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function downloadQRCode(campaign: Campaign) {
    if (!campaign.qr_code_data_url) return

    const link = document.createElement("a")
    link.download = `qr-${campaign.tracking_code}.png`
    link.href = campaign.qr_code_data_url
    link.click()
  }

  // Use new /go/ route for tracking URLs
  const getTrackingUrl = (campaign: CampaignWithStats) => {
    const code = campaign.slug || campaign.tracking_code
    return `${window.location.origin}/go/${code}`
  }

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-400/30"
      case "paused": return "bg-yellow-500/20 text-yellow-400 border-yellow-400/30"
      case "archived": return "bg-gray-500/20 text-gray-400 border-gray-400/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">QR Code Campaigns</h2>
            <p className="text-white/60">Create and manage trackable QR codes for your physical ads</p>
          </div>
          <Button
            variant="glass-solid"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Create New Campaign</h3>
          <form onSubmit={createCampaign} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Campaign Name *
                </label>
                <Input
                  variant="glass"
                  placeholder="e.g., Spring 2024 Flyers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Destination URL *
                </label>
                <Input
                  variant="glass"
                  type="url"
                  placeholder="https://your-website.com"
                  value={formData.destination_url}
                  onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description (optional)
              </label>
              <Input
                variant="glass"
                placeholder="Brief description of this campaign"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Cookie Duration (Attribution Window)
              </label>
              <div className="flex gap-3">
                {[30, 60, 90].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={formData.cookie_duration_days === days ? "glass-active" : "glass"}
                    onClick={() => setFormData({ ...formData, cookie_duration_days: days as 30 | 60 | 90 })}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
              <p className="text-xs text-white/50 mt-2">
                How long to track visitors after they scan the QR code
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="glass"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="glass-solid"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Campaign List */}
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Your Campaigns</h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-white/60 mt-2">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">No campaigns yet</p>
              <p className="text-white/40 text-sm">Create your first QR code campaign above</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  onClick={() => setSelectedCampaign(campaign)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedCampaign?.id === campaign.id
                      ? "bg-white/15 border-white/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white truncate">{campaign.name}</h4>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/50 truncate mt-1">
                        {campaign.destination_url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {campaign.status === "active" ? (
                        <Button
                          size="icon-sm"
                          variant="glass"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateCampaignStatus(campaign.id, "paused")
                          }}
                          title="Pause"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      ) : campaign.status === "paused" ? (
                        <Button
                          size="icon-sm"
                          variant="glass"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateCampaignStatus(campaign.id, "active")
                          }}
                          title="Activate"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : null}
                      <Button
                        size="icon-sm"
                        variant="glass"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCampaign(campaign.id)
                        }}
                        title="Archive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* QR Code Preview */}
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">QR Code Preview</h3>

          {selectedCampaign ? (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
                {selectedCampaign.qr_code_svg ? (
                  <div
                    className="w-48 h-48"
                    dangerouslySetInnerHTML={{ __html: selectedCampaign.qr_code_svg }}
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                    No QR Code
                  </div>
                )}
              </div>

              {/* Campaign Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/60">Tracking URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      variant="glass"
                      readOnly
                      value={getTrackingUrl(selectedCampaign)}
                      className="text-sm"
                    />
                    <Button
                      size="icon"
                      variant="glass"
                      onClick={() => copyToClipboard(
                        getTrackingUrl(selectedCampaign),
                        "url"
                      )}
                    >
                      <Copy className={`h-4 w-4 ${copiedId === "url" ? "text-green-400" : ""}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="glass"
                      onClick={() => window.open(getTrackingUrl(selectedCampaign), "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60">Attribution Window</p>
                    <p className="text-white font-medium">{selectedCampaign.cookie_duration_days} days</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/60">Destination</p>
                    <p className="text-white font-medium truncate">{selectedCampaign.destination_url}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="glass-solid"
                    className="flex-1"
                    onClick={() => downloadQRCode(selectedCampaign)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button
                    variant="glass"
                    className="flex-1"
                    onClick={() => copyToClipboard(selectedCampaign.qr_code_svg || "", "svg")}
                  >
                    <Copy className={`mr-2 h-4 w-4 ${copiedId === "svg" ? "text-green-400" : ""}`} />
                    {copiedId === "svg" ? "Copied!" : "Copy SVG"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">Select a campaign to preview</p>
              <p className="text-white/40 text-sm">Click on any campaign from the list</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
