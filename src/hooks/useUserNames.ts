import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserNameCache {
  [userId: string]: string;
}

export function useUserNames(userIds: (string | null | undefined)[]) {
  const namesRef = useRef<UserNameCache>({});
  const [, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);

  const serializedIds = JSON.stringify(userIds);

  const fetchNames = useCallback(async () => {
    const validIds = (JSON.parse(serializedIds) as (string | null | undefined)[])
      .filter((id): id is string => !!id);
    const uniqueIds = [...new Set(validIds)];
    
    const idsToFetch = uniqueIds.filter(id => !namesRef.current[id]);
    
    if (idsToFetch.length === 0) return;

    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', idsToFetch);

    if (error) {
      console.error('Erro ao buscar nomes de usuários:', error);
      setLoading(false);
      return;
    }

    data?.forEach(profile => {
      namesRef.current[profile.user_id] = profile.full_name || 'Usuário';
    });

    idsToFetch.forEach(id => {
      if (!namesRef.current[id]) {
        namesRef.current[id] = 'Usuário';
      }
    });

    setVersion(v => v + 1);
    setLoading(false);
  }, [serializedIds]);

  useEffect(() => {
    fetchNames();
  }, [fetchNames]);

  const getName = useCallback((userId: string | null | undefined): string => {
    if (!userId) return 'Sistema';
    return namesRef.current[userId] || 'Carregando...';
  }, []);

  return { names: namesRef.current, getName, loading };
}
