import { supabase } from '@/lib/supabase';

// Web Push pretplata za ovaj browser/uređaj. Javni VAPID ključ dolazi iz
// env-a; slanje radi edge funkcija `push` (vidi supabase/functions/push).

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

export type PushState =
  | 'unsupported'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

export class PushError extends Error {}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported(): boolean {
  return (
    !!VAPID_PUBLIC_KEY &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'unsubscribed';
}

// Traži dozvolu, pretplati browser i upiši pretplatu u bazu.
export async function enablePush(uid: string): Promise<void> {
  if (!pushSupported()) {
    throw new PushError('Ovaj browser ne podržava notifikacije.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new PushError(
      'Dozvola za notifikacije je odbijena — omogući je u postavkama browsera.',
    );
  }
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
    }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new PushError('Pretplata nije uspjela. Pokušaj ponovo.');
  }
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: uid,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw new PushError('Spremanje pretplate nije uspjelo.');
}

// Ugasi pretplatu na ovom uređaju i obriši je iz baze.
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

// Fire-and-forget okidač: javi edge funkciji da se događaj desio.
// Nikad ne smije srušiti akciju koja ga je izazvala.
export function sendPush(
  type:
    | 'new_request'
    | 'offer'
    | 'accepted'
    | 'request_message'
    | 'dm'
    | 'friend_request'
    | 'friend_accept',
  id: string,
): void {
  supabase.functions.invoke('push', { body: { type, id } }).catch(() => {
    // push je best-effort; realtime/poll su primarni kanal u aplikaciji
  });
}
