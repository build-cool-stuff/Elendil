# Admin Panel Documentation

The admin panel is a protected area accessible only to the single admin user (determined by `ADMIN_USER_ID` environment variable matching a Clerk user ID). It provides a comprehensive business management interface for the Elendil QR Tracking SaaS platform.

## Access Control

- **Auth guard**: `requireAdmin()` in the layout redirects non-admin users to `/dashboard`
- **API guard**: `checkAdminApi()` returns `null` for non-admin requests (API routes return 403)
- **Single admin model**: No roles or permissions — one Clerk user ID matched against env var
- **Supabase access**: All admin API routes use the service-role key (`createServerClient()`) which bypasses Row Level Security

## Pages & Features

### Dashboard (`/admin`)
- **8 stat cards**: Total Users, Active Campaigns, Scans (30d), Revenue (30d), Active Subscribers, Total Scans, Open Tickets, Pending Tasks
- **Quick Actions**: Direct links to open tickets, dev task board, and user management
- **Data source**: `/api/admin/stats` — runs 11 parallel Supabase count queries
- **Responsive**: 2-column grid on mobile, 4-column on desktop

### Users (`/admin/users`)
- **Paginated user list** (50 per page) with debounced search by email/name
- **Per-user data**: Name, email, billing status (Active/Degraded/Free), campaign count, scan count, last scan date, join date
- **Mobile layout**: Card-based view on mobile, traditional table on desktop
- **Data source**: `/api/admin/users` with pagination, search, and per-user stat aggregation

### Billing (`/admin/billing`)
- **Revenue overview**: Revenue (30d), billable scan count, active subscriber count
- **User breakdown**: Active vs Degraded vs Free user counts
- **Active Subscribers list**: Each subscriber's scan count and campaign count
- **Degraded Users list**: Users past their grace period with degradation date
- **Data sources**: `/api/admin/stats` + `/api/admin/users?limit=100`

### Support Tickets (`/admin/tickets`)
- **Filterable ticket list**: All, Open, In Progress, Resolved, Closed
- **Paginated** (20 per page) with status/priority badges
- **Each ticket shows**: Subject, message preview, submitter name, date, priority, status

### Ticket Detail (`/admin/tickets/[id]`)
- **Full conversation thread**: Original message + chronological replies
- **Status/priority controls**: Inline toggle buttons with optimistic updates
- **Reply as Admin**: Textarea with send button, auto-scroll to new reply
- **Contact link**: Direct email link to the ticket submitter
- **Reply visual distinction**: Admin replies indented with blue left border

### Dev Tasks (`/admin/tasks`)
- **Kanban-lite task board**: To Do, In Progress, Done status cycling via icon click
- **Create tasks**: Title, description, priority (Low/Medium/High), due date
- **Filter tabs**: All, To Do, In Progress, Done with counts
- **Delete tasks**: Trash icon with exit animation, always visible on mobile
- **Optimistic updates**: Status changes and deletions update UI immediately

### Notes (`/admin/notes`)
- **Personal notepad**: Create, edit, pin/unpin, and delete notes
- **Inline editor**: Click any note card to open the editor above the grid
- **Pin/unpin**: Pinned notes sort to the top with yellow accent
- **Mobile actions**: Three-dot menu on mobile (replaces hover-only desktop actions)
- **Error feedback**: Toast notifications on all operations (create, save, pin, delete)
- **Grid layout**: Single column on mobile, 2-column on desktop

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/admin/stats` | GET | Dashboard statistics (11 parallel queries) |
| `/api/admin/users` | GET | Paginated user list with search and stats |
| `/api/admin/tickets` | GET | Paginated ticket list with status filter |
| `/api/admin/tickets/[id]` | GET, PATCH, POST | Ticket detail, update status/priority, add reply |
| `/api/admin/tasks` | GET, POST | All tasks list, create new task |
| `/api/admin/tasks/[id]` | PATCH, DELETE | Update task fields, delete task |
| `/api/admin/notes` | GET, POST | All notes list, create new note |
| `/api/admin/notes/[id]` | PATCH, DELETE | Update note fields, delete note |

## Database Tables (Migration 010)

- **`support_tickets`**: User-created support tickets with status and priority
- **`ticket_replies`**: Threaded replies on tickets (user or admin authored)
- **`admin_notes`**: Admin-only personal notes (RLS with no policies — service role only)
- **`admin_tasks`**: Admin-only dev task tracker (RLS with no policies — service role only)

## UI/UX Design

- **Glassmorphic dark-mode**: Consistent with the main dashboard aesthetic
- **Mobile-first responsive**: Card layouts on mobile, tables on desktop
- **Touch-optimized**: 44px minimum touch targets, active states on all interactive elements
- **Error boundaries**: Dedicated error boundary catches render crashes within admin shell
- **Toast notifications**: Sonner toasts for all mutation feedback (success/error)
- **Optimistic updates**: Task status cycling, ticket status/priority changes, note pin/unpin
- **Animations**: Fade-in on data load, exit animation on deletions, smooth sidebar transitions
- **Safe area support**: Bottom padding for iPhone home indicator
