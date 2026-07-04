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

export function Login() {
  const navigate = useNavigate();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    const admin = useAuth.getState().roles.includes('admin');
    navigate({ to: admin ? '/admin-dashboard' : '/' });
  };

  return (
    <AuthShell title="Dobrodosao nazad" subtitle="Prijavi se na svoj racun">
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
        <div>
          <PasswordField
            label="Lozinka"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link
              to="/forgot-password"
              className="text-brand text-xs hover:underline"
            >
              Zaboravljena lozinka?
            </Link>
          </div>
        </div>
        <SubmitButton loading={loading}>Prijavi se</SubmitButton>
      </form>

      <p className="mt-6 text-center text-slate-500 text-sm">
        Nemas racun?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand hover:underline"
        >
          Registruj se
        </Link>
      </p>
    </AuthShell>
  );
}
