-- Adds database-level protection for event notification idempotency.
-- Run after removing any duplicate event notifications for the same target/source.

ALTER TABLE notifications
  ADD UNIQUE KEY uq_notifications_idempotency (user_id, role, type, source_type, source_id);
