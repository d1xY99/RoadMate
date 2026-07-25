import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Globalni realtime listener — montiran u root rutu, živi dok je korisnik
// prijavljen. Sluša promjene koje RLS dozvoli i odmah invalidira pogođene
// querije, pa se svaki otvoreni ekran osvježi bez refresha. Pollinzi po
// stranicama ostaju kao fallback za propuštene događaje.
export function GlobalRealtime() {
  const uid = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const invalidate = (keys: unknown[][]) => {
      for (const queryKey of keys) {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    const channel = supabase
      .channel(`global-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${uid}`,
        },
        (p) => {
          const senderId = (p.new as { sender_id?: string }).sender_id;
          invalidate([['conversations'], ['dm', senderId]]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_messages' },
        (p) => {
          const requestId = (p.new as { request_id?: string }).request_id;
          invalidate([['messages', requestId]]);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'help_requests' },
        (p) => {
          const id = (p.new as { id?: string }).id;
          invalidate([
            ['request', id],
            ['active-request'],
            ['my-requests'],
            ['nearby-requests'],
          ]);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'help_offers' },
        (p) => {
          const requestId = (p.new as { request_id?: string }).request_id;
          invalidate([['request-offers', requestId]]);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          invalidate([['friend-requests'], ['friends'], ['user-search']]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, queryClient]);

  return null;
}
