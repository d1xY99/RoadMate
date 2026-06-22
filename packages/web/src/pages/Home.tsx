import { Link } from '@tanstack/react-router';

export function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 text-center text-white">
      <div
        aria-hidden
        className="-right-32 -top-32 absolute h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="-bottom-32 -left-24 absolute h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center">
        <span className="font-bold text-2xl tracking-tight">🚗 RoadMate</span>

        <div className="mt-10 text-6xl">🚧</div>
        <h1 className="mt-6 font-bold text-4xl sm:text-5xl">U izradi</h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Radimo na aplikaciji za pomoc na cesti. Uskoro stize — zajednica koja
          se odaziva.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-brand text-sm transition hover:bg-white/90"
          >
            Prijava
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-sm text-white transition hover:bg-white/10"
          >
            Registracija
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 text-sm text-white/50">
        © {new Date().getFullYear()} RoadMate
      </div>
    </div>
  );
}
