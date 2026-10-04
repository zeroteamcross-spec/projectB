-- Notifications must support every authenticated application role that
-- receives a notification snapshot or transaction event.
ALTER TABLE notifications
    MODIFY COLUMN role ENUM('seller','buyer','affiliate_admin','admin','super_admin','seller_staff') NOT NULL;
