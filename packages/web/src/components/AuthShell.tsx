import { type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { Logo } from '@/components/Logo';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="-right-24 -top-24 absolute h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="-bottom-24 -left-16 absolute h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative z-10">
          <Logo size="lg" light />
        </div>
        <div className="relative z-10">
          <h1 className="font-bold text-4xl leading-tight">
            Pomoć na cesti,
            <br /> zajednica koja se odaziva.
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Kvar, prazna guma ili ostao bez goriva? Najblizi clan zajednice ti
            pomaze — brzo i jednostavno.
          </p>
        </div>
        <div className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} RoadMate
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
            <h2 className="font-bold text-2xl text-slate-900">{title}</h2>
            <p className="mt-1 text-slate-500 text-sm">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium text-slate-700 text-sm">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
        {...props}
      />
    </label>
  );
}

function EyeIcon({ off }: { off: boolean }) {
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
    >
      {off ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export function PasswordField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium text-slate-700 text-sm">
        {label}
      </span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-11 text-slate-900 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Sakrij lozinku' : 'Prikaži lozinku'}
          className="-translate-y-1/2 absolute top-1/2 right-2.5 text-slate-400 transition hover:text-slate-600"
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </label>
  );
}

export function SubmitButton({
  loading,
  children,
}: {
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-sm text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: 'error' | 'success';
  children: ReactNode;
}) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
