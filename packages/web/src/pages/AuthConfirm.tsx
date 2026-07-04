import type { EmailOtpType } from '@supabase/supabase-js';
import { Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  AuthShell,
  SubmitButton,
  TextField,
} from '@/components/AuthShell';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'success' | 'error';

// Callback route for the email confirmation link (#26). Supabase links come
// back either as `?token_hash=&type=` (verifyOtp) or `?code=` (PKCE exchange);
// the @supabase/ssr client may also auto-exchange `?code=` on load, so an
// existing session counts as success too.
export function AuthConfirm() {
  const navigate = useNavigate();
  const resendVerification = useAuth((s) => s.resendVerification);
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fail = () => {
      setStatus('error');
      setMessage('Link je nevažeći ili istekao');
    };

    if (params.get('error_description')) return fail();

    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;

    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return error ? fail() : setStatus('success');
      }
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        return error ? fail() : setStatus('success');
      }
      // No token in the URL — maybe the client already exchanged it on load.
      const { data } = await supabase.auth.getSession();
      if (data.session) return setStatus('success');
      fail();
    })();
  }, []);

  const onResend = async (e: FormEvent) => {
    e.preventDefault();
    setResending(true);
    const err = await resendVerification(email);
    setResending(false);
    if (err) {
      setMessage(err);
      return;
    }
    setResent(true);
  };

  if (status === 'verifying') {
    return (
      <AuthShell title="Potvrda emaila" subtitle="Provjeravamo tvoj link">
        <div className="flex items-center justify-center gap-3 py-4 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
          Potvrđujem…
        </div>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell title="Email potvrđen" subtitle="Račun je aktiviran">
        <Alert kind="success">Tvoj email je uspješno potvrđen.</Alert>
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark"
        >
          Nastavi
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Potvrda nije uspjela" subtitle="">
      <Alert kind="error">{message}</Alert>

      {resent ? (
        <Alert kind="success">
          Poslali smo novi link za potvrdu. Provjeri email.
        </Alert>
      ) : (
        <form onSubmit={onResend} className="mt-6 flex flex-col gap-4">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="ti@primjer.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SubmitButton loading={resending}>Pošalji novi link</SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-slate-500 text-sm">
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Nazad na prijavu
        </Link>
      </p>
    </AuthShell>
  );
}
