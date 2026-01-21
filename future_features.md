# have team accounts so that members can share access, with role permissions. think of claras. 

# Future Feature: White-Label Custom Subdomains

## 1. Objective
Transition from `app.yourdomain.com.au/q/...` to agent-branded URLs (e.g., `scan.raywhite-suburb.com.au/q/...`). This increases trust, click-through rates, and protects our main domain from ad-blocker flagging.

## 2. Technical Requirements
- **Automated SSL:** Implement a Reverse Proxy (e.g., Cloudflare for SaaS or Caddy) to handle automatic HTTPS certificate issuance for user-added domains.
- **DNS Verification:** Create a UI for agents to verify their CNAME records (pointing their subdomain to our proxy).
- **Multi-Tenant Routing:** Update the backend to identify which "Campaign" or "Agent" is being accessed based on the `Host` header of the request.

## 3. Bridge Page Architecture (Current & Future)
Regardless of the domain used, all QR scans MUST hit a **Bridge Page** before reaching the final real estate listing.
- **Function:** Execute the Meta Pixel (Pixel-Fire) and server-side geocoding.
- **User Experience:** A 500ms - 1000ms "Redirecting..." screen to ensure tracking data is sent to Meta's servers.
- **Data Capture:** Capture Suburb, Campaign ID, and Cookie Expiry (30/60/90 days) during this "Bridge" moment.

## 4. Why wait?
Building this now would add ~2-3 weeks of development time. Launching with the Main App Domain allows us to validate the real estate agent's "heat map" value proposition first.