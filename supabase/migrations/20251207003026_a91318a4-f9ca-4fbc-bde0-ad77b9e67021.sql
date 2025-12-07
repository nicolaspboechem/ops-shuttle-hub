-- Remover políticas restritivas e criar permissivas para motoristas
DROP POLICY IF EXISTS "Allow service role insert on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow service role update on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow service role delete on motoristas" ON public.motoristas;
DROP POLICY IF EXISTS "Allow public read on motoristas" ON public.motoristas;

CREATE POLICY "Allow all read on motoristas" ON public.motoristas FOR SELECT USING (true);
CREATE POLICY "Allow all insert on motoristas" ON public.motoristas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on motoristas" ON public.motoristas FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on motoristas" ON public.motoristas FOR DELETE USING (true);

-- Remover políticas restritivas e criar permissivas para veiculos
DROP POLICY IF EXISTS "Allow service role insert on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow service role update on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow service role delete on veiculos" ON public.veiculos;
DROP POLICY IF EXISTS "Allow public read on veiculos" ON public.veiculos;

CREATE POLICY "Allow all read on veiculos" ON public.veiculos FOR SELECT USING (true);
CREATE POLICY "Allow all insert on veiculos" ON public.veiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on veiculos" ON public.veiculos FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on veiculos" ON public.veiculos FOR DELETE USING (true);

-- Remover políticas restritivas e criar permissivas para viagens
DROP POLICY IF EXISTS "Allow service role insert on viagens" ON public.viagens;
DROP POLICY IF EXISTS "Allow service role update on viagens" ON public.viagens;
DROP POLICY IF EXISTS "Allow public read on viagens" ON public.viagens;

CREATE POLICY "Allow all read on viagens" ON public.viagens FOR SELECT USING (true);
CREATE POLICY "Allow all insert on viagens" ON public.viagens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on viagens" ON public.viagens FOR UPDATE USING (true);

-- Remover políticas restritivas e criar permissivas para eventos
DROP POLICY IF EXISTS "Allow service role insert on eventos" ON public.eventos;
DROP POLICY IF EXISTS "Allow service role update on eventos" ON public.eventos;
DROP POLICY IF EXISTS "Allow public read on eventos" ON public.eventos;

CREATE POLICY "Allow all read on eventos" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Allow all insert on eventos" ON public.eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on eventos" ON public.eventos FOR UPDATE USING (true);