import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, TextField } from '@/components/AuthShell';
import { HelperToggle } from '@/components/HelperToggle';
import { Logo } from '@/components/Logo';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  type DecodedVehicle,
  decodeVin,
  normalizeVin,
  VinDecodeError,
} from '@/lib/vin';

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

type SavedVehicle = {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  model_year: number | null;
  raw_decode: Record<string, string | null> | null;
  trim: string | null;
  body_class: string | null;
  vehicle_type: string | null;
  fuel_type: string | null;
  engine: string | null;
  transmission: string | null;
  drive_type: string | null;
  manufacturer: string | null;
  plant_country: string | null;
  created_at: string;
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

function PlusIcon() {
  return (
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SearchIcon() {
  return (
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function formatVehicleTitle(vehicle: SavedVehicle | DecodedVehicle) {
  const year = 'model_year' in vehicle ? vehicle.model_year : vehicle.modelYear;
  const raw = 'raw_decode' in vehicle ? vehicle.raw_decode : vehicle.raw;
  const series = 'series' in vehicle ? vehicle.series : raw?.Series;
  const parts = [year, vehicle.make, vehicle.model, series].filter(Boolean);
  return parts.length ? parts.join(' ') : vehicle.vin;
}

function vehicleRows(vehicle: SavedVehicle | DecodedVehicle) {
  const raw = 'raw_decode' in vehicle ? vehicle.raw_decode : vehicle.raw;
  const modelYear =
    'model_year' in vehicle ? vehicle.model_year : vehicle.modelYear;
  const bodyClass =
    'body_class' in vehicle ? vehicle.body_class : vehicle.bodyClass;
  const vehicleType =
    'vehicle_type' in vehicle ? vehicle.vehicle_type : vehicle.vehicleType;
  const fuelType =
    'fuel_type' in vehicle ? vehicle.fuel_type : vehicle.fuelType;
  const driveType =
    'drive_type' in vehicle ? vehicle.drive_type : vehicle.driveType;
  const plantCountry =
    'plant_country' in vehicle ? vehicle.plant_country : vehicle.plantCountry;
  const plantCity = 'plantCity' in vehicle ? vehicle.plantCity : raw?.PlantCity;
  const doors = 'doors' in vehicle ? vehicle.doors : raw?.Doors;
  const seats = 'seats' in vehicle ? vehicle.seats : raw?.Seats;
  const seatBelts =
    'seatBelts' in vehicle ? vehicle.seatBelts : raw?.SeatBeltsAll;
  const airbagsFront =
    'airbagsFront' in vehicle ? vehicle.airbagsFront : raw?.AirBagLocFront;
  const tpms = 'tpms' in vehicle ? vehicle.tpms : raw?.TPMS;
  const descriptor =
    'vehicleDescriptor' in vehicle
      ? vehicle.vehicleDescriptor
      : raw?.VehicleDescriptor;

  return [
    ['Godiste', modelYear],
    ['Serija', raw?.Series],
    ['Trim', vehicle.trim],
    ['Karoserija', bodyClass],
    ['Tip', vehicleType],
    ['Gorivo', fuelType],
    ['Motor', vehicle.engine],
    ['Mjenjac', vehicle.transmission],
    ['Pogon', driveType],
    ['Vrata', doors],
    ['Sjedista', seats],
    ['Pojasevi', seatBelts],
    ['Prednji airbag', airbagsFront],
    ['TPMS', tpms],
    ['Proizvodjac', vehicle.manufacturer],
    ['Fabrika', plantCity],
    ['Drzava sklapanja', plantCountry],
    ['Descriptor', descriptor],
  ].filter(([, value]) => value);
}

function decodeWarning(vehicle: SavedVehicle | DecodedVehicle) {
  if ('decodeWarning' in vehicle) return vehicle.decodeWarning;
  const code = vehicle.raw_decode?.ErrorCode;
  if (!code || code === '0') return null;
  return (
    vehicle.raw_decode?.AdditionalErrorText || vehicle.raw_decode?.ErrorText
  );
}

export function Profile() {
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
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vinInput, setVinInput] = useState('');
  const [decodedVehicle, setDecodedVehicle] = useState<DecodedVehicle | null>(
    null,
  );
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [decodingVehicle, setDecodingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

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

  const vehiclesQ = useQuery({
    queryKey: ['vehicles', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('vehicles')
        .select(
          'id, vin, make, model, model_year, raw_decode, trim, body_class, vehicle_type, fuel_type, engine, transmission, drive_type, manufacturer, plant_country, created_at',
        )
        .eq('user_id', uid as string)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return (data ?? []) as unknown as SavedVehicle[];
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

  const resetVehicleModal = () => {
    setVinInput('');
    setDecodedVehicle(null);
    setVehicleError(null);
    setDecodingVehicle(false);
    setSavingVehicle(false);
  };

  const onDecodeVehicle = async (e: FormEvent) => {
    e.preventDefault();
    setVehicleError(null);
    setDecodedVehicle(null);
    setDecodingVehicle(true);

    try {
      const vehicle = await decodeVin(vinInput);
      setVinInput(vehicle.vin);
      setDecodedVehicle(vehicle);
    } catch (err) {
      setVehicleError(
        err instanceof VinDecodeError
          ? err.message
          : 'Nije moguce procitati podatke za ovaj VIN.',
      );
    } finally {
      setDecodingVehicle(false);
    }
  };

  const onSaveVehicle = async () => {
    if (!uid || !decodedVehicle) return;
    setVehicleError(null);
    setSavingVehicle(true);

    const { error: err } = await supabase.from('vehicles').upsert(
      {
        user_id: uid,
        vin: decodedVehicle.vin,
        make: decodedVehicle.make,
        model: decodedVehicle.model,
        model_year: decodedVehicle.modelYear,
        trim: decodedVehicle.trim,
        body_class: decodedVehicle.bodyClass,
        vehicle_type: decodedVehicle.vehicleType,
        fuel_type: decodedVehicle.fuelType,
        engine: decodedVehicle.engine,
        transmission: decodedVehicle.transmission,
        drive_type: decodedVehicle.driveType,
        manufacturer: decodedVehicle.manufacturer,
        plant_country: decodedVehicle.plantCountry,
        raw_decode: decodedVehicle.raw,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,vin' },
    );

    setSavingVehicle(false);
    if (err) {
      setVehicleError(err.message);
      return;
    }

    setVehicleModalOpen(false);
    resetVehicleModal();
    queryClient.invalidateQueries({ queryKey: ['vehicles', uid] });
  };

  const onDeleteVehicle = async (vehicleId: string) => {
    if (!uid) return;
    setVehicleError(null);
    setDeletingVehicleId(vehicleId);
    const { error: err } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)
      .eq('user_id', uid);
    setDeletingVehicleId(null);

    if (err) {
      setVehicleError(err.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['vehicles', uid] });
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-slate-200 border-b bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <Link to="/">
          <Logo />
        </Link>
        <span className="text-slate-500 text-sm dark:text-slate-400">
          {session.user.email}
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        {/* Cover + avatar */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

            <h1 className="mt-4 font-bold text-2xl text-slate-900 dark:text-slate-100">
              {fullName || 'Bez imena'}
            </h1>
            <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
              {session.user.email}
            </p>

            {/* Ocjene */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/60 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <ThumbIcon />
                </span>
                <div>
                  <div className="font-bold text-lg text-slate-900 leading-none dark:text-slate-100">
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
                  <div className="font-bold text-lg text-slate-900 leading-none dark:text-slate-100">
                    {profile?.thumbs_down ?? 0}
                  </div>
                  <div className="mt-1 text-slate-500 text-xs">Zamjerke</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <HelperToggle />
        </div>

        {/* Vozila */}
        <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                Moja vozila
              </h2>
              <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
                Dodaj vozilo pomocu VIN broja.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetVehicleModal();
                setVehicleModalOpen(true);
              }}
              className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 font-semibold text-sm text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <PlusIcon />
              Dodaj
            </button>
          </div>

          {vehiclesQ.isError && (
            <div className="mt-5">
              <Alert kind="error">
                Vozila se trenutno ne mogu ucitati. Provjeri migraciju i RLS
                pravila.
              </Alert>
            </div>
          )}
          {vehicleError && !vehicleModalOpen && (
            <div className="mt-5">
              <Alert kind="error">{vehicleError}</Alert>
            </div>
          )}

          {vehiclesQ.isLoading ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-500 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              Ucitavanje vozila...
            </div>
          ) : vehiclesQ.data?.length ? (
            <div className="mt-5 space-y-3">
              {vehiclesQ.data.map((vehicle) => (
                <article
                  key={vehicle.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatVehicleTitle(vehicle)}
                      </h3>
                      <p className="mt-0.5 font-mono text-slate-500 text-xs tracking-wide dark:text-slate-400">
                        {vehicle.vin}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteVehicle(vehicle.id)}
                      disabled={deletingVehicleId === vehicle.id}
                      aria-label="Obrisi vozilo"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                      {deletingVehicleId === vehicle.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      ) : (
                        <TrashIcon />
                      )}
                    </button>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {vehicleRows(vehicle)
                      .slice(0, 10)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-slate-500 text-xs dark:text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                            {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {decodeWarning(vehicle) && (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                      Provider nije vratio kompletne podatke za ovaj VIN. Moguce
                      je da baza nema model/godiste za ovaj VIN.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Nemas dodanih vozila.
              </p>
              <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
                VIN ce automatski popuniti marku, model, godiste i osnovne
                specifikacije.
              </p>
            </div>
          )}
        </section>

        {/* Podaci */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            Moji podaci
          </h2>
          <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
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
              <legend className="mb-1.5 block font-medium text-slate-700 text-sm dark:text-slate-300">
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
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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

        <ThemePicker />
      </main>

      {vehicleModalOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-xl text-slate-900 dark:text-slate-100">
                  Dodaj vozilo
                </h2>
                <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
                  Unesi VIN i RoadMate ce povuci dostupne podatke o vozilu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVehicleModalOpen(false);
                  resetVehicleModal();
                }}
                aria-label="Zatvori"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                x
              </button>
            </div>

            <form onSubmit={onDecodeVehicle} className="mt-5 space-y-4">
              {vehicleError && <Alert kind="error">{vehicleError}</Alert>}
              <label className="block">
                <span className="mb-1.5 block font-medium text-slate-700 text-sm dark:text-slate-300">
                  VIN
                </span>
                <input
                  value={vinInput}
                  onChange={(e) => {
                    setVinInput(normalizeVin(e.target.value));
                    setDecodedVehicle(null);
                    setVehicleError(null);
                  }}
                  maxLength={17}
                  autoComplete="off"
                  placeholder="1HGCM82633A004352"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 font-mono text-slate-900 text-sm uppercase tracking-wide outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </label>
              <button
                type="submit"
                disabled={decodingVehicle}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {decodingVehicle ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <SearchIcon />
                )}
                Pronadji podatke
              </button>
            </form>

            {decodedVehicle && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatVehicleTitle(decodedVehicle)}
                </h3>
                <p className="mt-0.5 font-mono text-slate-500 text-xs tracking-wide dark:text-slate-400">
                  {decodedVehicle.vin}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {vehicleRows(decodedVehicle)
                    .slice(0, 14)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-slate-500 text-xs dark:text-slate-400">
                          {label}
                        </dt>
                        <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
                {decodeWarning(decodedVehicle) && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    NHTSA je vratio samo djelimicne podatke. Za ovaj VIN nisu
                    dostupni model, godiste ili dio specifikacija.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onSaveVehicle}
                  disabled={savingVehicle}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 font-semibold text-sm text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {savingVehicle && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-slate-400 dark:border-t-slate-900" />
                  )}
                  Sacuvaj vozilo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
