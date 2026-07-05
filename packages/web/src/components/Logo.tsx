// Brand logo: gradient rounded-square mark with a perspective road + two-tone
// wordmark. `light` renders the wordmark for dark/gradient backgrounds.
export function Logo({
  size = 'md',
  light = false,
  iconOnly = false,
  className = '',
}: {
  size?: 'md' | 'lg';
  light?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const icon = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 48 48" className={icon} aria-hidden="true">
        <defs>
          <linearGradient id="rm-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#rm-logo-g)" />
        <path d="M15 40 21 8h6l6 32Z" fill="#fff" opacity="0.95" />
        <line
          x1="24"
          y1="13"
          x2="24"
          y2="36"
          stroke="#4f46e5"
          strokeWidth="2.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
      </svg>
      {!iconOnly && (
        <span className={`font-bold ${text} tracking-tight`}>
          <span
            className={light ? 'text-white' : 'text-slate-900 dark:text-white'}
          >
            Road
          </span>
          <span className={light ? 'text-white/80' : 'text-brand'}>Mate</span>
        </span>
      )}
    </span>
  );
}
