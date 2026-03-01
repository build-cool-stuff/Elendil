-- Migration 010: Admin Panel Tables
-- Support tickets, ticket replies, admin notes, admin tasks

-- ============================================================
-- 1. Support Tickets (users create, admin manages)
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: users can view and create their own tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_id = requesting_user_id()));

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = requesting_user_id()));

-- ============================================================
-- 2. Ticket Replies (threaded conversation on tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type VARCHAR(10) NOT NULL CHECK (author_type IN ('user', 'admin')),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_created_at ON ticket_replies(created_at);

-- RLS: users can view replies on their own tickets and create user replies
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replies on own tickets"
  ON ticket_replies FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE user_id IN (SELECT id FROM users WHERE clerk_id = requesting_user_id())
    )
  );

CREATE POLICY "Users can reply to own tickets"
  ON ticket_replies FOR INSERT
  WITH CHECK (
    author_type = 'user'
    AND ticket_id IN (
      SELECT id FROM support_tickets
      WHERE user_id IN (SELECT id FROM users WHERE clerk_id = requesting_user_id())
    )
  );

-- ============================================================
-- 3. Admin Notes (only accessible via service role)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE TRIGGER set_admin_notes_updated_at
  BEFORE UPDATE ON admin_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: no user-facing policies, only service role can access
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Admin Tasks (dev todo list, only accessible via service role)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX idx_admin_tasks_priority ON admin_tasks(priority);

-- Auto-update updated_at
CREATE TRIGGER set_admin_tasks_updated_at
  BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: no user-facing policies, only service role can access
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
