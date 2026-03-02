"use client"

import { Card } from "shared-components"
import { Mail } from "lucide-react"

export function SupportPanel() {
  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="text-center py-8">
          <Mail className="w-14 h-14 text-white/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Talk Directly to the Founder</h2>
          <p className="text-white/70 max-w-lg mx-auto mb-6 leading-relaxed">
            You're not just a user - you're one of our first customers, and that means everything to us.
            I personally read and respond to every single message. No support tickets, no chatbots, just a real conversation.
          </p>
          <a
            href="mailto:toanandvarghese@outlook.com?subject=Elendil Support"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium"
          >
            <Mail className="h-5 w-5" />
            toanandvarghese@outlook.com
          </a>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">What to Expect</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 text-lg">⚡</span>
            </div>
            <div>
              <p className="text-white font-medium">24-Hour Response Time</p>
              <p className="text-white/60 text-sm">I'll get back to you within 24 hours, usually much faster.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-lg">💬</span>
            </div>
            <div>
              <p className="text-white font-medium">Real Conversations</p>
              <p className="text-white/60 text-sm">No canned responses. I want to understand your needs and help you succeed.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-400 text-lg">🚀</span>
            </div>
            <div>
              <p className="text-white font-medium">Your Feedback Shapes the Product</p>
              <p className="text-white/60 text-sm">As an early user, your input directly influences what we build next.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <p className="text-white/50 text-sm text-center italic">
          "The best thing about being small is you can provide a level of service no big company can." - Y Combinator
        </p>
      </Card>
    </div>
  )
}
