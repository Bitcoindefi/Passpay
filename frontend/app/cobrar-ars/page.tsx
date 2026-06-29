'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, QrCode as QrIcon, ExternalLink, CheckCircle2, Loader2, Landmark } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Step = 'input' | 'qr' | 'done';

export default function CobrarArsPage() {
  const [step, setStep] = useState<Step>('input');
  const [amount, setAmount] = useState('');
  const [collector, setCollector] = useState<Awaited<ReturnType<typeof api.t3.collector>> | null>(null);
  const [qr, setQr] = useState<Awaited<ReturnType<typeof api.t3.qr>> | null>(null);
  const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof api.t3.simulatePayment>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.t3.collector().then(setCollector).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return setError('Ingresá un monto válido');
    setError(null);
    setLoading(true);
    try {
      const res = await api.t3.qr({ amountArs: a });
      setQr(res);
      setStep('qr');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!qr) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.t3.simulatePayment({
        amountArs: qr.fields.amountArs,
        reference: qr.fields.reference,
      });
      setReceipt(res);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setAmount('');
    setQr(null);
    setReceipt(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/">
          <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Volver</span>
          </button>
        </Link>

        <div className="text-center mb-6">
          <Image src="/passpay-logo.svg" alt="Passpay" width={220} height={70} priority className="w-auto h-auto max-w-[220px] mx-auto" />
          <p className="text-sm text-[#2DD4BF] font-medium mt-2 flex items-center justify-center gap-1">
            <Landmark className="w-4 h-4" /> Cobrá en pesos con QR
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass-card p-8 space-y-6">
              <div className="space-y-2 text-center">
                <label className="text-base text-white font-medium block">Monto a cobrar (ARS)</label>
                <div className="flex items-center justify-center pt-2">
                  <span className="text-slate-500 text-5xl font-black mr-2">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    className="bg-transparent border-none outline-none text-7xl font-black text-white text-center inline-block tabular-nums"
                    style={{ width: `${Math.max(2, (amount || '0').length)}ch` }}
                    autoFocus
                  />
                </div>
                <div className="h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
              </div>

              {collector && (
                <div className="glass-card p-4 bg-slate-800/30 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-400">Recaudador</span><span className="font-medium">{collector.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Alias</span><span className="font-mono">{collector.alias}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">CVU (tu cuenta)</span><span className="font-mono text-xs">{collector.cvu}</span></div>
                </div>
              )}

              <Button onClick={handleGenerate} disabled={loading} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] hover:opacity-90 shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><QrIcon className="w-5 h-5 mr-2" /> Generar QR de cobro</>}
              </Button>
            </motion.div>
          )}

          {step === 'qr' && qr && (
            <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 space-y-5">
              <div className="text-center">
                <p className="text-5xl font-bold text-gradient">${qr.fields.amountArs.toFixed(2)}</p>
                <p className="text-sm text-slate-400 mt-1">Pesos · pagá con cualquier billetera</p>
              </div>

              <div className="flex justify-center">
                {/* QR EMVCo interoperable generado por el backend */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrImage} alt="QR Transferencias 3.0" className="w-64 h-64 bg-white p-3 rounded-2xl" />
              </div>

              <div className="glass-card p-3 bg-slate-800/30 text-[11px] font-mono text-slate-400 break-all">
                {qr.emv}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Lo escanea cualquier billetera o banco (Mercado Pago, Modo, tu banco, etc.).
              </p>

              <Button onClick={handleSimulate} disabled={loading} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#5B4BF5] to-[#3D2FD6] hover:opacity-90 shadow-lg">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simular pago del cliente'}
              </Button>
              <button onClick={reset} className="w-full text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
            </motion.div>
          )}

          {step === 'done' && receipt && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 space-y-5 text-center">
              <CheckCircle2 className="w-16 h-16 text-[#2DD4BF] mx-auto" />
              <div>
                <h2 className="text-2xl font-bold">Pago acreditado</h2>
                <p className="text-slate-400 text-sm mt-1">${receipt.amountArs.toFixed(2)} ARS acreditados</p>
              </div>

              <div className="glass-card p-4 bg-slate-800/30 text-sm space-y-2 text-left">
                <div className="flex justify-between"><span className="text-slate-400">ID de pago</span><span className="font-mono text-xs">{receipt.coelsaId}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">CVU acreditado</span><span className="font-mono text-xs">{receipt.creditedCvu}</span></div>
              </div>

              {/* Liquidación on-chain en Stellar */}
              {receipt.settlement.settled ? (
                <a
                  href={receipt.settlement.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-[#5B4BF5]/10 border border-[#5B4BF5]/30 rounded-xl hover:bg-[#5B4BF5]/20 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#8B7CF8] mb-1">
                      Guardado en dólares: {receipt.settlement.settlementAmount} {receipt.settlement.settlementAsset}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate w-56">{receipt.settlement.stellarTxHash}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-[#8B7CF8] shrink-0" />
                </a>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
                  <p className="text-sm font-semibold text-amber-400 mb-1">Conversión a dólares pendiente</p>
                  <p className="text-xs text-slate-400">{receipt.settlement.error ?? 'Configurá tu cuenta de dólares para completar la conversión.'}</p>
                </div>
              )}

              <Button onClick={reset} variant="outline" className="w-full h-12 border-2 border-slate-600 hover:bg-slate-700/50">Nuevo cobro</Button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}

        <p className="text-center text-xs text-slate-500 mt-6">
          De pesos a dólares, al instante · Passpay
        </p>
      </div>
    </div>
  );
}
