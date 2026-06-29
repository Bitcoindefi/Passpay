// Gráficos de marca Passpay en SVG (gradiente indigo→teal + relleno, estilo portada).
// - 6 íconos del set con cuerpo, degradé y glow (no line-art)
// - Fondo de patrón de flechas (motivo del logo)

type IconProps = { size?: number; className?: string };

const INDIGO = '#5B4BF5';
const TEAL = '#2DD4BF';
const CUT = '#0B0E14'; // color de "recorte" = fondo del tile

// Tile con anillo degradé + glow, igual a la estética de la portada
export function IconTile({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <div
        className="rounded-2xl bg-gradient-to-br from-[#5B4BF5]/50 to-[#2DD4BF]/50 p-[1.5px]"
        style={{ boxShadow: '0 8px 24px -6px rgba(45,212,191,.25), 0 0 20px -8px rgba(91,75,245,.4)' }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-[14px] bg-[#0B0E14]">
          {children}
        </div>
      </div>
      <span className="text-[11px] font-medium leading-tight text-slate-300">{label}</span>
    </div>
  );
}

// gradiente reutilizable por ícono (id único)
function Grad({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={INDIGO} />
        <stop offset="1" stopColor={TEAL} />
      </linearGradient>
    </defs>
  );
}

export function QrIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-qr" />
      <g>
        <rect x="5" y="5" width="12" height="12" rx="3.2" fill="url(#g-qr)" />
        <rect x="8.6" y="8.6" width="4.8" height="4.8" rx="1.6" fill={CUT} />
        <rect x="23" y="5" width="12" height="12" rx="3.2" fill="url(#g-qr)" />
        <rect x="26.6" y="8.6" width="4.8" height="4.8" rx="1.6" fill={CUT} />
        <rect x="5" y="23" width="12" height="12" rx="3.2" fill="url(#g-qr)" />
        <rect x="8.6" y="26.6" width="4.8" height="4.8" rx="1.6" fill={CUT} />
      </g>
      <g fill={TEAL}>
        <rect x="23" y="23" width="5" height="5" rx="1.4" />
        <rect x="30" y="23" width="5" height="5" rx="1.4" />
        <rect x="23" y="30" width="5" height="5" rx="1.4" />
        <rect x="30" y="30" width="5" height="5" rx="1.4" />
      </g>
    </svg>
  );
}

export function BankIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-bank" />
      <path d="M20 4.5 L35.5 14 H4.5 Z" fill="url(#g-bank)" />
      <g fill="url(#g-bank)">
        <rect x="8" y="16.5" width="3.6" height="11.5" rx="1.2" />
        <rect x="14.6" y="16.5" width="3.6" height="11.5" rx="1.2" />
        <rect x="21.8" y="16.5" width="3.6" height="11.5" rx="1.2" />
        <rect x="28.4" y="16.5" width="3.6" height="11.5" rx="1.2" />
      </g>
      <rect x="5" y="30" width="30" height="4.2" rx="1.6" fill="url(#g-bank)" />
      <circle cx="20" cy="10.3" r="1.9" fill={TEAL} />
    </svg>
  );
}

export function SwapIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-swap" />
      <circle cx="20" cy="20" r="12" fill="url(#g-swap)" opacity="0.16" />
      <g fill="none" stroke={TEAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 16.5 A11 11 0 0 1 28 12.8" />
        <path d="M28 8.2 L29.2 13 L24.3 13.8" />
        <path d="M30 23.5 A11 11 0 0 1 12 27.2" />
        <path d="M12 31.8 L10.8 27 L15.7 26.2" />
      </g>
      <text
        x="20"
        y="25.8"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="url(#g-swap)"
        fontFamily="system-ui, sans-serif"
      >
        $
      </text>
    </svg>
  );
}

export function ChainIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-chain" />
      <rect x="4.5" y="5.5" width="11.5" height="11.5" rx="3.2" fill="url(#g-chain)" />
      <rect x="16" y="17.5" width="11.5" height="11.5" rx="3.2" fill="url(#g-chain)" opacity="0.85" />
      <path d="M14 11.2 H19 a3 3 0 0 1 3 3 V18" fill="none" stroke="url(#g-chain)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="30" cy="30" r="7.6" fill={TEAL} />
      <path d="M26.6 30 L29 32.4 L33.4 27.6" fill="none" stroke={CUT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-wallet" />
      <rect x="4.5" y="9.5" width="31" height="21.5" rx="5.5" fill="url(#g-wallet)" />
      <path d="M35.5 18.5 H27.5 a3.6 3.6 0 0 0 0 7.2 H35.5 Z" fill={CUT} opacity="0.32" />
      <circle cx="29.2" cy="22.1" r="1.9" fill={TEAL} />
    </svg>
  );
}

export function OffRampIcon({ size = 34, className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <Grad id="g-off" />
      <rect x="17.4" y="5.5" width="5.2" height="15" rx="2.6" fill="url(#g-off)" />
      <path d="M10.5 16.5 L20 27 L29.5 16.5 Z" fill="url(#g-off)" />
      <rect x="7" y="31" width="26" height="4.3" rx="2.1" fill={TEAL} />
    </svg>
  );
}

// Fondo: patrón de flechas (motivo del logo) + viñeta.
// absolute para cubrir TODA la altura del contenido (no sólo el viewport).
export function ArrowPatternBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#0B0E14]">
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="pp-arrows" width="86" height="62" patternUnits="userSpaceOnUse">
            <g
              stroke="#5B4BF5"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.16"
            >
              <path d="M16 24 H46" />
              <path d="M40 18 L48 24 L40 30" />
              <path d="M50 38 H20" />
              <path d="M26 32 L18 38 L26 44" />
            </g>
          </pattern>
          <radialGradient id="pp-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#16213a" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#0d1424" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0B0E14" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#pp-arrows)" />
        <rect width="100%" height="100%" fill="url(#pp-vignette)" />
      </svg>
    </div>
  );
}

// Set ordenado para iterar en "Cómo funciona"
export const PASSPAY_FEATURES = [
  { Icon: QrIcon, label: 'QR Transferencias 3.0' },
  { Icon: BankIcon, label: 'CVU recaudador' },
  { Icon: SwapIcon, label: 'Convertí a dólar' },
  { Icon: ChainIcon, label: 'Liquidación on-chain' },
  { Icon: WalletIcon, label: 'Wallet Stellar' },
  { Icon: OffRampIcon, label: 'Off-ramp a pesos' },
] as const;
