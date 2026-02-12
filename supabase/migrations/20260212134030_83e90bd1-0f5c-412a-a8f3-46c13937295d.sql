-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-checkout every 15 minutes
SELECT cron.schedule(
  'auto-checkout-every-15min',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gkrczwtldvondiehsesh.supabase.co/functions/v1/auto-checkout',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcmN6d3RsZHZvbmRpZWhzZXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzQ4NDIsImV4cCI6MjA4MDYxMDg0Mn0.hnFTG_6Na1L4MHhFmm11Th-CdJn-JJJAT8MJTtCcMrU"}'::jsonb,
        body:='{"time": "scheduled"}'::jsonb
    ) AS request_id;
  $$
);
