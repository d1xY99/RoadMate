import { Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import {
  Alert,
  AuthShell,
  PasswordField,
  SubmitButton,
} from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';

export function ResetPassword() {
  const navigate = useNavigate();
  const updatePassword = useAuth((s) => s.updatePassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase error from the recovery link (e.g. expired) lands in the URL hash.
  const linkError = new URLSearchParams(window.location.hash.slice(1)).get(
    'error_description',
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Lozinke se ne poklapaju.');
      return;
    }
    setLoading(true);
    // Fails if there's no recovery session (invalid/expired link).
    const err = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError('Link je nevažeći ili istekao. Zatraži novi.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell title="Lozinka promijenjena" subtitle="Gotovo">
        <Alert kind="success">Nova lozinka je postavljena.</Alert>
        <button
          type="button"
          onClick={() => navigate({ to: '/login' })}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark"
        >
          Prijavi se
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nova lozinka"
      subtitle="Postavi novu lozinku za svoj nalog"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {(error || linkError) && (
          <Alert kind="error">
            {error ?? 'Link je nevažeći ili istekao. Zatraži novi.'}
          </Alert>
        )}
        <PasswordField
          label="Nova lozinka"
          autoComplete="new-password"
          placeholder="Najmanje 8 znakova"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label="Potvrdi lozinku"
          autoComplete="new-password"
          placeholder="Ponovi lozinku"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton loading={loading}>Sačuvaj lozinku</SubmitButton>
      </form>

      <p className="mt-6 text-center text-slate-500 text-sm">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Nazad na prijavu
        </Link>
      </p>
    </AuthShell>
  );
}
