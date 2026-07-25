// Edge funkcija `push` — jedino mjesto koje šalje Web Push notifikacije.
//
// Klijent nakon akcije pozove funkciju sa {type, id}; funkcija OVDJE (service
// role) provjeri da se događaj stvarno desio i da ga je izazvao pozivalac, pa
// tek onda odredi primaoce i sadržaj. Klijent nikad ne šalje naslov/tekst —
// spoofing nije moguć. Mrtve pretplate (410/404) se brišu.
import { createClient } from 'npm:@supabase/supabase-js@2';
// Deno-nativni web push (WebCrypto). npm:web-push ovdje ne radi — njegov
// Node ECDH obara edge runtime.
import * as webpush from 'jsr:@negrel/webpush@0.5.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const vapidKeys = await webpush.importVapidKeys(
  JSON.parse(Deno.env.get('VAPID_KEYS_JSON') ?? '{}'),
  { extractable: false },
);
const appServer = await webpush.ApplicationServer.new({
  contactInformation:
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:podrska@roadmate.app',
  vapidKeys,
});

const service = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const PROBLEM_LABELS: Record<string, string> = {
  flat_tire: 'Guma',
  dead_battery: 'Akumulator',
  out_of_fuel: 'Gorivo',
  stuck: 'Zaglavljen',
  mechanical: 'Kvar',
  other: 'Pomoć',
};

type Notification = {
  recipients: string[];
  title: string;
  body: string;
  url: string;
  tag: string;
};

async function name(userId: string): Promise<string> {
  const { data } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  return data?.full_name || 'Korisnik';
}

// Za svaki tip događaja: provjeri autentičnost + odredi primaoce i sadržaj.
async function buildNotification(
  type: string,
  id: string,
  callerId: string,
): Promise<Notification | null> {
  switch (type) {
    case 'new_request': {
      const { data: hr } = await service
        .from('help_requests')
        .select('id, requester_id, type, status')
        .eq('id', id)
        .maybeSingle();
      if (!hr || hr.requester_id !== callerId || hr.status !== 'open')
        return null;
      const { data: nearby } = await service.rpc('helpers_near_request', {
        p_request_id: id,
      });
      const recipients = (nearby ?? []).map(
        (r: { user_id: string }) => r.user_id,
      );
      return {
        recipients,
        title: `${PROBLEM_LABELS[hr.type] ?? 'Pomoć'} — neko blizu tebe treba pomoć`,
        body: 'Otvori RoadMate i ponudi pomoć.',
        url: '/',
        tag: `request-${id}`,
      };
    }
    case 'offer': {
      const { data: offer } = await service
        .from('help_offers')
        .select('id, helper_id, request_id, status')
        .eq('id', id)
        .maybeSingle();
      if (!offer || offer.helper_id !== callerId || offer.status !== 'offered')
        return null;
      const { data: hr } = await service
        .from('help_requests')
        .select('requester_id')
        .eq('id', offer.request_id)
        .maybeSingle();
      if (!hr) return null;
      return {
        recipients: [hr.requester_id],
        title: 'Nova ponuda pomoći',
        body: `${await name(callerId)} ti nudi pomoć.`,
        url: `/request/${offer.request_id}`,
        tag: `offers-${offer.request_id}`,
      };
    }
    case 'accepted': {
      const { data: hr } = await service
        .from('help_requests')
        .select('id, requester_id, helper_id, status')
        .eq('id', id)
        .maybeSingle();
      if (
        !hr ||
        hr.requester_id !== callerId ||
        hr.status !== 'accepted' ||
        !hr.helper_id
      )
        return null;
      return {
        recipients: [hr.helper_id],
        title: 'Tvoja ponuda je prihvaćena! ⚡',
        body: `${await name(callerId)} te čeka — otvori za lokaciju i chat.`,
        url: `/request/${id}`,
        tag: `request-${id}`,
      };
    }
    case 'request_message': {
      const { data: msg } = await service
        .from('request_messages')
        .select('id, request_id, sender_id, body')
        .eq('id', id)
        .maybeSingle();
      if (!msg || msg.sender_id !== callerId) return null;
      const { data: hr } = await service
        .from('help_requests')
        .select('requester_id, helper_id')
        .eq('id', msg.request_id)
        .maybeSingle();
      if (!hr) return null;
      const other =
        hr.requester_id === callerId ? hr.helper_id : hr.requester_id;
      if (!other) return null;
      return {
        recipients: [other],
        title: await name(callerId),
        body: msg.body.slice(0, 120),
        url: `/request/${msg.request_id}`,
        tag: `req-chat-${msg.request_id}`,
      };
    }
    case 'dm': {
      const { data: msg } = await service
        .from('direct_messages')
        .select('id, sender_id, recipient_id, body')
        .eq('id', id)
        .maybeSingle();
      if (!msg || msg.sender_id !== callerId) return null;
      return {
        recipients: [msg.recipient_id],
        title: await name(callerId),
        body: msg.body.slice(0, 120),
        url: `/messages/${msg.sender_id}`,
        tag: `dm-${msg.sender_id}`,
      };
    }
    case 'friend_request': {
      const { data: f } = await service
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .eq('id', id)
        .maybeSingle();
      if (!f || f.requester_id !== callerId || f.status !== 'pending')
        return null;
      return {
        recipients: [f.addressee_id],
        title: 'Zahtjev za prijateljstvo',
        body: `${await name(callerId)} želi biti prijatelj.`,
        url: '/friends',
        tag: `friend-${f.id}`,
      };
    }
    case 'friend_accept': {
      const { data: f } = await service
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .eq('id', id)
        .maybeSingle();
      if (!f || f.addressee_id !== callerId || f.status !== 'accepted')
        return null;
      return {
        recipients: [f.requester_id],
        title: 'Prijateljstvo prihvaćeno 🤝',
        body: `${await name(callerId)} je prihvatio tvoj zahtjev.`,
        url: '/friends',
        tag: `friend-${f.id}`,
      };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Ko zove? (JWT iz Authorization headera)
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let type = '';
  let id = '';
  try {
    const body = await req.json();
    type = String(body.type ?? '');
    id = String(body.id ?? '');
  } catch {
    return new Response(JSON.stringify({ error: 'bad request' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const notification = await buildNotification(type, id, user.id);
  if (!notification || notification.recipients.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', notification.recipients);

  let sent = 0;
  const dead: string[] = [];
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.url,
    tag: notification.tag,
  });
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        const subscriber = appServer.subscribe({
          endpoint: s.endpoint,
          expirationTime: null,
          keys: { p256dh: s.p256dh, auth: s.auth },
        });
        await subscriber.pushTextMessage(payload, {});
        sent++;
      } catch (err) {
        const status =
          err instanceof webpush.PushMessageError
            ? err.response?.status
            : undefined;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    }),
  );
  if (dead.length > 0) {
    await service.from('push_subscriptions').delete().in('id', dead);
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
