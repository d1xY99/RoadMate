import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, TextField } from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type VehicleType = 'car' | 'van' | 'truck' | 'motorcycle' | 'suv_4x4';

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
  vehicle_type: VehicleType | null;
  thumbs_up: number;
  thumbs_down: number;
};

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Auto' },
  { value: 'van', label: 'Kombi' },
  { value: 'truck', label: 'Kamion' },
  { value: 'motorcycle', label: 'Motor' },
  { value: 'suv_4x4', label: 'Terenac' },
];

const VEHICLE_PATHS: Record<VehicleType, ReactNode> = {
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  van: (
    <>
      <path d="M3 6h10a2 2 0 0 1 1.6.8L17.5 11H20a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-2" />
      <path d="M3 6v10a1 1 0 0 0 1 1h1" />
      <path d="M13 6v5h4.5" />
      <path d="M9 17h6" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M5 17 8 12h6l2-3h2" />
      <path d="M16 9l3 8" />
      <path d="M8 12l3 5" />
    </>
  ),
  suv_4x4: (
    <>
      <path d="M3 16v-5a2 2 0 0 1 2-2h1l2-4h8l2 4h1a2 2 0 0 1 2 2v5" />
      <path d="M8 3h8" />
      <path d="M9 16h6" />
      <circle cx="6.5" cy="16" r="2" />
      <circle cx="17.5" cy="16" r="2" />
    </>
  ),
};

function VehicleIcon({ type }: { type: VehicleType }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {VEHICLE_PATHS[type]}
    </svg>
  );
}

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={down ? 'rotate-180' : undefined}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuth((s) => s.session);
  const loading = useAuth((s) => s.loading);
  const uid = session?.user.id;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: '/login' });
  }, [loading, session, navigate]);

  const profileQ = useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('profiles')
        .select(
          'id, full_name, phone, photo_url, vehicle_type, thumbs_up, thumbs_down',
        )
        .eq('id', uid as string)
        .single();
      if (err) throw err;
      return data as Profile;
    },
  });

  // Hydrate the form once the profile arrives.
  const profile = profileQ.data;
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setVehicleType(profile.vehicle_type ?? '');
  }, [profile]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setError(null);
    setOk(false);
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        vehicle_type: vehicleType || null,
      })
      .eq('id', uid);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOk(true);
    queryClient.invalidateQueries({ queryKey: ['profile', uid] });
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setError(null);
    setOk(false);
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${uid}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      setError(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    // Cache-bust so the <img> refreshes after re-upload to the same path.
    const photoUrl = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ photo_url: photoUrl })
      .eq('id', uid);
    setUploading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setOk(true);
    queryClient.invalidateQueries({ queryKey: ['profile', uid] });
  };

  if (loading || !session || profileQ.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        Učitavanje...
      </div>
    );
  }

  if (profileQ.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <Alert kind="error">
            Greška pri učitavanju profila. Pokušaj ponovo.
          </Alert>
        </div>
      </div>
    );
  }

  const initials = (fullName || session.user.email || '?')
    .slice(0, 1)
    .toUpperCase();
  const totalVotes = (profile?.thumbs_up ?? 0) + (profile?.thumbs_down ?? 0);
  const rating = totalVotes
    ? Math.round(((profile?.thumbs_up ?? 0) / totalVotes) * 100)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur">
        <Link to="/" className="font-bold text-brand text-lg">
          🚗 RoadMate
        </Link>
        <span className="text-slate-500 text-sm">{session.user.email}</span>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        {/* Cover + avatar */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="relative h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
            <div
              aria-hidden
              className="-right-10 -top-10 absolute h-40 w-40 rounded-full bg-white/10 blur-2xl"
            />
            <div
              aria-hidden
              className="-bottom-12 -left-6 absolute h-32 w-32 rounded-full bg-white/10 blur-2xl"
            />
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="relative">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt="Profilna slika"
                    className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-3xl text-white shadow-md">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Promijeni profilnu sliku"
                  className="-right-1.5 -bottom-1.5 absolute flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <CameraIcon />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                />
              </div>

              {rating !== null && (
                <span className="rounded-full bg-brand/10 px-3 py-1 font-semibold text-brand text-xs">
                  {rating}% pozitivnih
                </span>
              )}
            </div>

            <h1 className="mt-4 font-bold text-2xl text-slate-900">
              {fullName || 'Bez imena'}
            </h1>
            <p className="mt-0.5 text-slate-500 text-sm">
              {session.user.email}
            </p>

            {/* Ocjene */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/60 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <ThumbIcon />
                </span>
                <div>
                  <div className="font-bold text-lg text-slate-900 leading-none">
                    {profile?.thumbs_up ?? 0}
                  </div>
                  <div className="mt-1 text-slate-500 text-xs">Pohvale</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-500">
                  <ThumbIcon down />
                </span>
                <div>
                  <div className="font-bold text-lg text-slate-900 leading-none">
                    {profile?.thumbs_down ?? 0}
                  </div>
                  <div className="mt-1 text-slate-500 text-xs">Zamjerke</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Podaci */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-lg text-slate-900">Moji podaci</h2>
          <p className="mt-0.5 text-slate-500 text-sm">
            Vidi i ažuriraj svoje podatke.
          </p>

          <form onSubmit={onSave} className="mt-5 flex flex-col gap-4">
            {error && <Alert kind="error">{error}</Alert>}
            {ok && <Alert kind="success">Sačuvano.</Alert>}

            <TextField
              label="Ime i prezime"
              type="text"
              autoComplete="name"
              placeholder="Marko Marković"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <TextField
              label="Telefon"
              type="tel"
              autoComplete="tel"
              placeholder="+387 6x xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <fieldset>
              <legend className="mb-1.5 block font-medium text-slate-700 text-sm">
                Tip vozila
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {VEHICLES.map((v) => {
                  const active = vehicleType === v.value;
                  return (
                    <button
                      type="button"
                      key={v.value}
                      onClick={() => setVehicleType(active ? '' : v.value)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm transition ${
                        active
                          ? 'border-brand bg-brand/5 font-semibold text-brand ring-2 ring-brand/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <VehicleIcon type={v.value} />
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={saving}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              Sačuvaj
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
