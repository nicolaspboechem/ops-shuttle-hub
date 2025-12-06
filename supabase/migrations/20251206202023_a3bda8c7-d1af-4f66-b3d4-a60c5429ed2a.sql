-- Add tipo_operacao to eventos table
ALTER TABLE public.eventos 
ADD COLUMN tipo_operacao VARCHAR(50) DEFAULT 'transfer';

-- Update existing eventos based on their viagens
-- (This will be handled by Apps Script going forward)
COMMENT ON COLUMN public.eventos.tipo_operacao IS 'Tipo de operação: transfer ou shuttle - vem do nome da aba do Google Sheets';