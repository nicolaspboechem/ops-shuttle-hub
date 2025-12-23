import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserNameCache {
  [userId: string]: string;
}

export function useUserNames(userIds: (string | null | undefined)[]) {
  const [names, setNames] = useState<UserNameCache>({});
  const [loading, setLoading] = useState(false);

  const fetchNames = useCallback(async () => {
    const validIds = userIds.filter((id): id is string => !!id);
    const uniqueIds = [...new Set(validIds)];
    
    // Filtrar IDs que ainda não temos no cache
    const idsToFetch = uniqueIds.filter(id => !names[id]);
    
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

    const newNames: UserNameCache = { ...names };
    data?.forEach(profile => {
      newNames[profile.user_id] = profile.full_name || 'Usuário';
    });

    // Marcar IDs não encontrados
    idsToFetch.forEach(id => {
      if (!newNames[id]) {
        newNames[id] = 'Usuário';
      }
    });

    setNames(newNames);
    setLoading(false);
  }, [userIds, names]);

  useEffect(() => {
    fetchNames();
  }, [fetchNames]);

  const getName = useCallback((userId: string | null | undefined): string => {
    if (!userId) return 'Sistema';
    return names[userId] || 'Carregando...';
  }, [names]);

  return { names, getName, loading };
}
