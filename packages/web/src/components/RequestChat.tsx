import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
  });

// Chat between the two parties of a request (#29). Live via Supabase Realtime
// (INSERT events, RLS-scoped) with a light poll fallback.
export function RequestChat({ requestId }: { requestId: string }) {
  const uid = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const messagesQ = useQuery({
    queryKey: ['messages', requestId],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_messages')
        .select('id, sender_id, body, created_at')
        .eq('request_id', requestId)
        .order('created_at');
      if (error) throw error;
      return data as Message[];
    },
  });
  const messages = messagesQ.data ?? [];

  // Realtime: refetch on any new message in this request.
  useEffect(() => {
    const channel = supabase
      .channel(`request-messages-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', requestId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, queryClient]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !uid) return;
    setSending(true);
    const { error } = await supabase.from('request_messages').insert({
      request_id: requestId,
      sender_id: uid,
      body: text,
    });
    setSending(false);
    if (!error) {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['messages', requestId] });
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-slate-100 border-b px-5 py-3">
        <h2 className="font-semibold text-slate-900">Poruke</h2>
      </div>

      <div className="flex max-h-72 min-h-32 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-6 text-center text-slate-400 text-sm">
            Još nema poruka — piši prvi.
          </p>
        )}
        {messages.map((m) => {
          const own = m.sender_id === uid;
          return (
            <div
              key={m.id}
              className={`flex ${own ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  own
                    ? 'rounded-br-md bg-brand text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div
                  className={`mt-0.5 text-right text-[10px] ${
                    own ? 'text-white/70' : 'text-slate-400'
                  }`}
                >
                  {fmtTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-slate-100 border-t p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="Napiši poruku…"
          className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          aria-label="Pošalji poruku"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
}
