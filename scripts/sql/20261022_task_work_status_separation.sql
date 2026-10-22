-- Keep implementation progress independent from the user's final confirmation.
ALTER TABLE tasks
    ADD COLUMN work_status ENUM('pending', 'done') NOT NULL DEFAULT 'pending' AFTER status;

-- Existing Sip entries represented completed work; preserve that badge separately.
UPDATE tasks
SET work_status = 'done'
WHERE status = 'sip';

-- These confirmations were written without an authenticated confirming user.
-- Reopen them so the owner can personally review and confirm each task.
UPDATE tasks
SET status = 'open',
    completed_by_user_id = NULL,
    completed_at = NULL,
    updated_at = NOW()
WHERE status = 'sip'
  AND completed_by_user_id IS NULL;
