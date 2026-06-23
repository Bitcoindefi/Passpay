'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Direction = 'deposit' | 'withdraw';

const TERMINAL = new Set(['completed', 'refunded', 'expired', 'error']);

export default function RampPage() {
  const [anchor, setAnchor] = useState<Awaited<ReturnType<typeof api.anchor.info>> | null>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>('withdraw');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.anchor
      .info()
      .then(setAnchor)
      .catch((e) => setAnchorError(e.message));
  }, []);

  // Polling del estado de la transacción del anchor
  const poll = useCallback(async (id: string) => {
    try {
      const tx = await api.anchor.transaction(id);
      setStatus(tx.status);
      setStatusMsg(tx.message ?? null);
      if (!TERMINAL.has(tx.status)) {
        setTimeout(() => poll(id), 4000);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const handleStart = async () => {
    setError(null);
    setStatus(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await api.anchor.ramp({
        direction,
        amount: amount && parseFloat(amount) > 0 ? amount : undefined,
      });
      setTxId(res.transactionId);
      // Abrir el flujo hosted del anchor (KYC + transferencia bancaria) en popup
      window.open(res.interactiveUrl, 'passpay-anchor', 'width=480,height=720');
      setStatus('pending_user_transfer_start');
      poll(res.transactionId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fiat = anchor?.fiatCurrency ?? 'ARS';
  const asset = anchor?.assetCode ?? 'USDC';
  const isDeposit = direction === 'deposit';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="px-4 pt-6 pb-2 max-w-md mx-auto">
        <Link href="/">
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Volver</span>
          </button>
        </Link>
        <div className="text-center mb-6">
          <Image src="/passpay-logo.svg" alt="Passpay" width={200} height={64} priority className="w-auto h-auto max-w-[200px] mx-auto" />
          <p className="text-sm text-[#16E0A3] font-medium mt-2">Rampa fiat ↔ dólar on-chain</p>
        </div>
      </div>

      <div className="px-4 pb-12 max-w-md mx-auto space-y-6">
        {/* Estado del anchor */}
        <div className="glass-card p-4 bg-slate-800/30 text-sm">
          {anchorError ? (
            <p className="text-red-400">Anchor no disponible: {anchorError}</p>
          ) : anchor ? (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Anchor</span>
              <span className="font-medium text-white">{anchor.name}</span>
            </div>
          ) : (
            <p className="text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Conectando con el anchor…</p>
          )}
        </div>

        {/* Selector dirección */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDirection('withdraw')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              direction === 'withdraw'
                ? 'border-[#16E0A3] bg-[#16E0A3]/10'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <ArrowUpFromLine className="w-6 h-6 text-[#16E0A3]" />
            <span className="font-semibold text-sm">Cobrar en {fiat}</span>
            <span className="text-[11px] text-slate-400">{asset} → {fiat} (off-ramp)</span>
          </button>
          <button
            onClick={() => setDirection('deposit')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              direction === 'deposit'
                ? 'border-[#5B4BF5] bg-[#5B4BF5]/10'
                : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
            }`}
          >
            <ArrowDownToLine className="w-6 h-6 text-[#8B7CF8]" />
            <span className="font-semibold text-sm">Fondear {asset}</span>
            <span className="text-[11px] text-slate-400">{fiat} → {asset} (on-ramp)</span>
          </button>
        </div>

        {/* Monto */}
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Monto en {isDeposit ? fiat : asset} (opcional)</label>
          <div className="glass-card p-4 bg-slate-800/30 flex items-center gap-2">
            <span className="text-slate-500 text-2xl font-bold">{isDeposit ? '$' : ''}</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              className="bg-transparent border-none outline-none text-3xl font-bold text-white w-full tabular-nums"
            />
            <span className="text-slate-400 font-semibold">{isDeposit ? fiat : asset}</span>
          </div>
        </div>

        <Button
          onClick={handleStart}
          disabled={loading || !anchor}
          className={`w-full h-14 text-lg font-semibold shadow-lg ${
            isDeposit
              ? 'bg-gradient-to-r from-[#5B4BF5] to-[#3D2FD6]'
              : 'bg-gradient-to-r from-[#16E0A3] to-[#0FB985]'
          } hover:opacity-90`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isDeposit ? `Fondear ${asset}` : `Retirar a ${fiat}`}
        </Button>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        {/* Estado de la transacción */}
        {txId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Transacción SEP-24</span>
              <span className="font-mono text-xs text-slate-500 truncate max-w-[160px]">{txId}</span>
            </div>
            <div className="flex items-center gap-2">
              {status && TERMINAL.has(status) ? (
                <CheckCircle2 className="w-5 h-5 text-[#16E0A3]" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-[#8B7CF8]" />
              )}
              <span className="font-medium">{status ?? '—'}</span>
            </div>
            {statusMsg && <p className="text-xs text-slate-400">{statusMsg}</p>}
            <p className="text-xs text-slate-500">
              Completá el KYC y la transferencia en la ventana del anchor. El estado se actualiza solo.
            </p>
          </motion.div>
        )}

        <p className="text-center text-xs text-slate-500 pt-2 flex items-center justify-center gap-1">
          SEP-10 + SEP-24 sobre Stellar <ExternalLink className="w-3 h-3" />
        </p>
      </div>
    </div>
  );
}
