ALTER TABLE inspection_report_items
  MODIFY result_status ENUM('good', 'fair', 'bad', 'not_available') NOT NULL;
