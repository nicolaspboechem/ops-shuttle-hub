-- Bug Fix #2: Allow event members (supervisors, motoristas) to UPDATE motoristas table
CREATE POLICY "motoristas_update_event_member"
  ON public.motoristas
  FOR UPDATE
  TO authenticated
  USING (has_event_access(auth.uid(), evento_id))
  WITH CHECK (has_event_access(auth.uid(), evento_id));

-- Also allow event members to UPDATE veiculos (needed for vistoria/combustivel by supervisors)
CREATE POLICY "veiculos_update_event_member"
  ON public.veiculos
  FOR UPDATE
  TO authenticated
  USING (has_event_access(auth.uid(), evento_id))
  WITH CHECK (has_event_access(auth.uid(), evento_id));