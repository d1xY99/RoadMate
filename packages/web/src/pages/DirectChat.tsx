import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { sendPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const fmtTime = (s: string) =>
  new Date(s).toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// 1-na-1 chat sa prijateljem. Realtime preko Supabase kanala (INSERT na
// direct_messages prema meni) + poll fallback; otvaranje označava pročitano.
export function DirectChat() {
  const { userId: partnerId } = useParams({ strict: false }) as {
    userId: string;
  };
  const uid = useAuth((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const partnerQ = useQuery({
    queryKey: ['profile-mini', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, photo_url')
        .eq('id', partnerId)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string; photo_url: string | null } | null;
    },
  });

  const messagesQ = useQuery({
    queryKey: ['dm', partnerId],
    enabled: !!uid,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, body, created_at')
        .or(
          `and(sender_id.eq.${uid},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${uid})`,
        )
        .order('created_at');
      if (error) throw error;
      return data as Message[];
    },
  });
  const messages = messagesQ.data ?? [];

  // Realtime: svaka nova poruka meni osvježava thread i listu razgovora.
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`direct-messages-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm', partnerId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, partnerId, queryClient]);

  // Otvoren razgovor = pročitane poruke ovog sagovornika.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mark read on new messages
  useEffect(() => {
    if (!uid) return;
    supabase.rpc('mark_dm_read', { p_from: partnerId }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
  }, [uid, partnerId, messages.length, queryClient]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !uid) return;
    setSending(true);
    setSendError(null);
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: uid,
        recipient_id: partnerId,
        body: text,
      })
      .select('id')
      .single();
    setSending(false);
    if (error) {
      setSendError(
        'Poruka nije poslana — poruke su moguće samo između prijatelja.',
      );
      return;
    }
    if (data) sendPush('dm', data.id);
    setBody('');
    queryClient.invalidateQueries({ queryKey: ['dm', partnerId] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const partner = partnerQ.data;

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center gap-3 border-slate-200 border-b bg-white/80 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
        <Link
          to="/messages"
          aria-label="Nazad na poruke"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ←
        </Link>
        {partner?.photo_url ? (
          <img
            src={partner.photo_url}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-sm text-white">
            {(partner?.full_name?.[0] ?? '?').toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
            {partner?.full_name || 'Korisnik'}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messagesQ.isSuccess && messages.length === 0 && (
          <p className="py-10 text-center text-slate-400 text-sm dark:text-slate-500">
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
                    : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div
                  className={`mt-0.5 text-right text-[10px] ${
                    own ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
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
        className="border-slate-200 border-t bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mx-auto w-full max-w-lg">
          {sendError && (
            <p className="mb-2 px-1 text-red-600 text-xs dark:text-red-400">
              {sendError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              placeholder="Napiši poruku…"
              className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
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
          </div>
        </div>
      </form>
    </div>
  );
}
