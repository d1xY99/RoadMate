import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  type ChangeEvent,
  type FormEvent,
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
        Ucitavanje...
      </div>
    );
  }

  if (profileQ.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <Alert kind="error">
            Greska pri ucitavanju profila. Pokusaj ponovo.
          </Alert>
        </div>
      </div>
    );
  }

  const initials = (fullName || session.user.email || '?')
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-slate-200 border-b bg-white px-6 py-4">
        <Link to="/" className="font-bold text-brand text-lg">
          🚗 RoadMate
        </Link>
        <span className="text-slate-500 text-sm">{session.user.email}</span>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        <h1 className="font-bold text-2xl text-slate-900">Moj profil</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Vidi i azuriraj svoje podatke.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          {/* Avatar + ocjene */}
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Profilna slika"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 font-bold text-2xl text-brand">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1 font-medium text-green-600">
                  👍 {profile?.thumbs_up ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-red-500">
                  👎 {profile?.thumbs_down ?? 0}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 text-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? 'Uploadam...' : 'Promijeni sliku'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
            </div>
          </div>

          <form onSubmit={onSave} className="mt-6 flex flex-col gap-4">
            {error && <Alert kind="error">{error}</Alert>}
            {ok && <Alert kind="success">Sacuvano.</Alert>}

            <TextField
              label="Ime i prezime"
              type="text"
              autoComplete="name"
              placeholder="Marko Markovic"
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

            <label className="block">
              <span className="mb-1.5 block font-medium text-slate-700 text-sm">
                Tip vozila
              </span>
              <select
                value={vehicleType}
                onChange={(e) =>
                  setVehicleType(e.target.value as VehicleType | '')
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-slate-900 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="">— odaberi —</option>
                {VEHICLES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              Sacuvaj
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
