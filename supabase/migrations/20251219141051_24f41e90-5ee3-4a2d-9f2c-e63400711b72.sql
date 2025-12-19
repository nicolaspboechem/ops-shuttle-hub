-- Agendar sincronização a cada 15 minutos (America/Sao_Paulo)
SELECT cron.schedule(
  'sync-data-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gkrczwtldvondiehsesh.supabase.co/functions/v1/sync-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrcmN6d3RsZHZvbmRpZWhzZXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzQ4NDIsImV4cCI6MjA4MDYxMDg0Mn0.hnFTG_6Na1L4MHhFmm11Th-CdJn-JJJAT8MJTtCcMrU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);