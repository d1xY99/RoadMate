import { Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import {
  Alert,
  AuthShell,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';

export function Register() {
  const navigate = useNavigate();
  const signUp = useAuth((s) => s.signUp);
  const resendVerification = useAuth((s) => s.resendVerification);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju.');
      return;
    }

    setLoading(true);
    const res = await signUp(email, password, fullName);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.needsConfirmation) {
      setDone(true);
      return;
    }
    navigate({ to: '/' });
  };

  if (done) {
    return (
      <AuthShell title="Provjeri email" subtitle="Jos jedan korak">
        <Alert kind="success">
          Poslali smo ti link za potvrdu na <strong>{email}</strong>. Otvori ga
          da aktiviraš račun.
        </Alert>
        {resent ? (
          <p className="mt-4 text-center text-green-600 text-sm">
            Novi link je poslan.
          </p>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await resendVerification(email);
              setResent(true);
            }}
            className="mt-4 w-full text-center font-semibold text-brand text-sm hover:underline"
          >
            Nisi dobio email? Pošalji ponovo
          </button>
        )}
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
      title="Napravi račun"
      subtitle="Pridruži se zajednici za pomoć na cesti"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert kind="error">{error}</Alert>}
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
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ti@primjer.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Lozinka"
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
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <SubmitButton loading={loading}>Registruj se</SubmitButton>
      </form>

      <p className="mt-6 text-center text-slate-500 text-sm">
        Već imaš račun?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Prijavi se
        </Link>
      </p>
    </AuthShell>
  );
}
