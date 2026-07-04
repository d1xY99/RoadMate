import { Link } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import {
  Alert,
  AuthShell,
  SubmitButton,
  TextField,
} from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';

export function ForgotPassword() {
  const requestPasswordReset = useAuth((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await requestPasswordReset(email);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Provjeri email" subtitle="Link za reset je poslan">
        <Alert kind="success">
          Ako nalog s adresom <strong>{email}</strong> postoji, poslali smo link
          za postavljanje nove lozinke.
        </Alert>
        <p className="mt-6 text-center text-slate-500 text-sm">
          <Link
            to="/login"
            className="font-semibold text-brand hover:underline"
          >
            Nazad na prijavu
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Zaboravljena lozinka"
      subtitle="Unesi email pa ti šaljemo link za reset"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert kind="error">{error}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ti@primjer.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <SubmitButton loading={loading}>Pošalji link</SubmitButton>
      </form>

      <p className="mt-6 text-center text-slate-500 text-sm">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Nazad na prijavu
        </Link>
      </p>
    </AuthShell>
  );
}
