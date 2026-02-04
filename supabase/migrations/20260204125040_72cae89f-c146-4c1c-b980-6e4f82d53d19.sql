-- Adicionar política de DELETE na tabela eventos
CREATE POLICY "Allow all delete on eventos"
ON public.eventos
FOR DELETE
USING (true);

-- Adicionar política de DELETE na tabela viagens (também faltando)
CREATE POLICY "Allow all delete on viagens"
ON public.viagens
FOR DELETE
USING (true);