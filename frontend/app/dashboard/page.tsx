'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';
import { ArrowPatternBg, QrIcon, SwapIcon, OffRampIcon, BankIcon } from '@/components/passpay-graphics';
import { api } from '@/lib/api';

// Fallback si el backend no responde; el valor real lo trae el BCRA vía /rates/ars-usd
const ARS_PER_USD_FALLBACK = 1477;

type Status = 'liquidado' | 'acreditado' | 'procesando' | 'pendiente';

const STATUS_STYLES: Record<Status, string> = {
  liquidado: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border-[#2DD4BF]/30',
  acreditado: 'bg-[#5B4BF5]/15 text-[#8B7CF8] border-[#5B4BF5]/30',
  procesando: 'bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/30',
  pendiente: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const STATUS_LABEL: Record<Status, string> = {
  liquidado: 'Confirmado',
  acreditado: 'Acreditado',
  procesando: 'Procesando',
  pendiente: 'Pendiente',
};

interface Movimiento {
  id: string;
  Icon: typeof QrIcon;
  title: string;
  detail: string;
  amount: string;
  sub?: string;
  status: Status;
  time: string;
  hash?: string;
}

const MOVIMIENTOS: Movimiento[] = [
  {
    id: '1',
    Icon: QrIcon,
    title: 'Cobro en ARS',
    detail: 'Cobro con QR · vía Transferencias 3.0',
    amount: '+ $15.000 ARS',
    sub: '≈ 12,77 en dólares',
    status: 'liquidado',
    time: 'hace 2 min',
    hash: 'b3b1a9f2c7',
  },
  {
    id: '2',
    Icon: QrIcon,
    title: 'Cobro en ARS',
    detail: 'Cobro con QR · vía Transferencias 3.0',
    amount: '+ $8.500 ARS',
    sub: '≈ 7,23 USDC',
    status: 'acreditado',
    time: 'hace 1 h',
  },
  {
    id: '3',
    Icon: OffRampIcon,
    title: 'Retiro a pesos',
    detail: 'A tu cuenta · BlindPay',
    amount: '- 50 USDC',
    sub: '≈ $76.300 ARS a tu CBU',
    status: 'procesando',
    time: 'hace 3 h',
  },
  {
    id: '4',
    Icon: BankIcon,
    title: 'Cobro en ARS',
    detail: 'Cobro con QR · vía Transferencias 3.0',
    amount: '+ $42.000 ARS',
    sub: '≈ 35,74 en dólares',
    status: 'liquidado',
    time: 'ayer',
    hash: 'a1c4e88b02',
  },
];

const ACTIONS = [
  { href: '/cobrar-ars', Icon: QrIcon, label: 'Cobrar en ARS', accent: '#2DD4BF' },
  { href: '/pos', Icon: BankIcon, label: 'POS / Split', accent: '#5B4BF5' },
  { href: '/offramp', Icon: OffRampIcon, label: 'Pasar a pesos', accent: '#FFB020' },
  { href: '/ramp', Icon: SwapIcon, label: 'Comprar USD', accent: '#8B7CF8' },
];

export default function DashboardPage() {
  const [hidden, setHidden] = useState(false);
  const [arsPrimary, setArsPrimary] = useState(false);
  const [merchant, setMerchant] = useState<string>('Mi negocio');
  const [arsPerUsd, setArsPerUsd] = useState(ARS_PER_USD_FALLBACK);
  const [rateSource, setRateSource] = useState<'BCRA' | 'fallback'>('BCRA');

  // Balance de demo (reemplazable por /merchant/balance contra Horizon)
  const usdc = 1240.5;
  const ars = usdc * arsPerUsd;

  useEffect(() => {
    api.t3.collector().then((c) => c?.name && setMerchant(c.name)).catch(() => {});
    api.rates.arsUsd().then((r) => { setArsPerUsd(r.arsPerUsd); setRateSource(r.source); }).catch(() => {});
  }, []);

  const fmtUsd = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtArs = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const mask = (s: string) => (hidden ? '••••••' : s);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0E14] px-5 py-6 text-white">
      <ArrowPatternBg />

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="rounded-lg p-2 transition-colors hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Image src="/passpay-logo.svg" alt="Passpay" width={120} height={38} className="h-auto w-auto max-w-[120px]" />
          <button onClick={() => setHidden((v) => !v)} className="rounded-lg p-2 transition-colors hover:bg-white/5" aria-label="Ocultar saldo">
            {hidden ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
          </button>
        </div>

        {/* balance */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#5B4BF5] to-[#3D2FD6] p-6 shadow-xl shadow-[#5B4BF5]/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">{merchant} · disponible</span>
            <button
              onClick={() => setArsPrimary((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25"
            >
              <RefreshCw className="h-3 w-3" /> {arsPrimary ? 'Ver en USDC' : 'Ver en ARS'}
            </button>
          </div>

          {arsPrimary ? (
            <>
              <p className="mt-3 text-4xl font-black tabular-nums">{mask(`$${fmtArs(ars)}`)}</p>
              <p className="mt-1 text-sm text-white/70">≈ {mask(`${fmtUsd(usdc)} en dólares`)}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-4xl font-black tabular-nums">{mask(`${fmtUsd(usdc)}`)} <span className="text-2xl font-bold text-white/80">USDC</span></p>
              <p className="mt-1 text-sm text-white/70">≈ {mask(`$${fmtArs(ars)} ARS`)}</p>
            </>
          )}

          <div className="mt-5 flex items-center gap-2 text-[11px] text-white/60">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2DD4BF]" />
            Acreditado al instante · 1 USD ≈ AR$ {fmtArs(arsPerUsd)} · {rateSource === 'BCRA' ? 'BCRA' : 'ref.'}
          </div>
        </motion.div>

        {/* acciones */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 grid gap-3"
          style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
        >
          {ACTIONS.map(({ href, Icon, label, accent }) => (
            <Link key={href} href={href} className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-4 transition-all hover:bg-white/[0.07]">
              <span className="grid h-11 w-11 place-items-center rounded-xl text-[#7C6CF7]" style={{ boxShadow: `0 0 18px ${accent}33` }}>
                <Icon size={26} />
              </span>
              <span className="px-1 text-center text-[10px] font-medium leading-tight text-slate-300">{label}</span>
            </Link>
          ))}
        </motion.div>

        {/* movimientos */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Movimientos</h2>
            <span className="text-xs text-slate-500">últimos 7 días</span>
          </div>

          <div className="space-y-2.5">
            {MOVIMIENTOS.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[#7C6CF7]">
                    <m.Icon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{m.title}</p>
                        <p className="truncate text-xs text-slate-400">{m.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold tabular-nums ${m.amount.startsWith('+') ? 'text-[#2DD4BF]' : 'text-white'}`}>{m.amount}</p>
                        <p className="text-[11px] text-slate-500">{m.time}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[m.status]}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                      {m.sub && <span className="truncate text-[11px] text-slate-500">{m.sub}</span>}
                      {m.hash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${m.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-1 text-[11px] text-[#8B7CF8] hover:text-[#2DD4BF]"
                        >
                          Ver comprobante <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Link href="/cobrar-ars" className="mt-5 flex items-center justify-center gap-1 rounded-2xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 py-3.5 text-sm font-semibold text-[#2DD4BF] transition-all hover:bg-[#2DD4BF]/20">
            Nuevo cobro <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <p className="mt-8 text-center text-[11px] text-slate-600">
          Cobrás en pesos, ahorrás en dólares · Tecnología Transferencias 3.0 y Stellar
        </p>
      </div>
    </div>
  );
}
