'use client';
import { api } from '@/lib/api';
import { fetchSplit } from '@/lib/api';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Users, DollarSign, QrCode as QrIcon, ArrowLeft } from 'lucide-react';

export default function POSPage() {
  const [step, setStep] = useState<'input' | 'qr'>('input');
  const [amount, setAmount] = useState('');
  const [people, setPeople] = useState('2');
  const [splitId, setSplitId] = useState('');

  const handleGenerate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

try {
      const split = await api.splits.create({
        totalAmount: parseFloat(amount),
        mode: "OPEN_POOL",
        settlementAsset: {
          network: "stellar",
          type: "native",
          code: "XLM",
        },
      });
      setSplitId(split.id);
      setStep('qr');
    } catch (err: any) {
      alert('Error al crear el split: ' + err.message);
    }
  };

  const handleReset = () => {
    setStep('input');
    setAmount('');
    setPeople('2');
    setSplitId('');
  };

  const [splitStatus, setSplitStatus] = useState<string>('PENDING');
const [settled, setSettled] = useState(false);
const [settledSplit, setSettledSplit] = useState<any>(null);

// Polling del estado del split cada 3 segundos
useEffect(() => {
  if (step !== 'qr' || !splitId) return;

  const interval = setInterval(async () => {
    try {
      const split = await fetchSplit(splitId);
      setSplitStatus(split.status);
      if (split.status === 'SETTLED') {
        setSettled(true);
        setSettledSplit(split);
        clearInterval(interval);
      }
    } catch (err) {
      console.error('Error polling split status:', err);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [step, splitId]);


  const shareAmount = amount && people ? (parseFloat(amount) / parseInt(people)).toFixed(2) : '0.00';
  const qrData = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/pay/${splitId}?personas=${people}`;

   return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Botón Volver */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/passpay-logo.svg"
            alt="Passpay POS"
            width={250}
            height={80}
            priority
            className="w-auto h-auto max-w-xs mx-auto mb-3"
          />
          <p className="text-sm text-[#2DD4BF] font-medium">Punto de Venta · Pagos Compartidos</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card p-8 space-y-8"
            >
              {/* Monto */}
              <div className="space-y-4">
                <label className="text-base text-white text-center font-medium block">
                  Monto Total
                </label>
                <div className="relative">
                  <div className="text-center pt-4 pb-2">
                    <span className="text-slate-500 text-6xl font-black mr-2">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setAmount(value);
                      }}
                      placeholder="0"
                      className="bg-transparent border-none outline-none text-9xl font-black text-white text-center inline-block min-w-[200px] tabular-nums"
                      style={{ width: `${Math.max(3, (amount || '0').length)}ch` }}
                      autoFocus
                    />
                  </div>
                  <div className="h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                </div>
              </div>

              {/* Personas */}
              <div className="space-y-4">
                <label className="text-base text-slate-300 flex items-center gap-2 font-medium">
                  <Users className="w-5 h-5" />
                  Cantidad de Personas
                </label>
                <div className="glass-card p-6 bg-slate-800/30">
                  <div className="flex items-center justify-between gap-6">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPeople((prev) => Math.max(1, parseInt(prev || '2') - 1).toString())}
                      className="group relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg hover:shadow-xl border border-slate-600"
                    >
                      <span className="relative text-4xl font-bold text-slate-200 group-hover:text-white transition-colors">−</span>
                    </motion.button>
                    <div className="flex-1 text-center">
                      <div className="text-8xl font-black text-gradient mb-1 tabular-nums">{people || '2'}</div>
                      <p className="text-sm text-slate-400 uppercase tracking-wider font-medium">
                        {parseInt(people || '2') === 1 ? 'persona' : 'personas'}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPeople((prev) => Math.min(10, parseInt(prev || '2') + 1).toString())}
                      className="group relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5B4BF5] to-[#3D2FD6] hover:from-[#6D5EF7] hover:to-[#4A39E0] transition-all shadow-lg hover:shadow-xl shadow-[#5B4BF5]/20"
                    >
                      <span className="relative text-4xl font-bold text-white">+</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {amount && parseFloat(amount) > 0 && people && parseInt(people) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 bg-[#5B4BF5]/5 border-[#5B4BF5]/20 text-center"
                >
                  <p className="text-base text-slate-300 mb-3 font-medium">Cada persona paga:</p>
                  <p className="text-5xl font-black text-[#5B4BF5] tabular-nums">${shareAmount}</p>
                </motion.div>
              )}

              <Button
                onClick={handleGenerate}
                className="w-full h-16 text-xl font-bold bg-gradient-to-r from-[#3D2FD6] to-[#5B4BF5] hover:opacity-90 shadow-lg"
              >
                <QrIcon className="w-6 h-6 mr-2" />
                Generar QR
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card p-8 space-y-6 relative"
            >
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {settled ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-6"
                >
                  <div className="text-8xl">✅</div>
                  <h2 className="text-4xl font-bold text-[#2DD4BF]">¡Pago Completado!</h2>
                  <p className="text-slate-400">El split fue pagado por todos</p>
                  {settledSplit?.stellarTxHash && (
  
                    <a href={`https://stellar.expert/explorer/testnet/tx/${settledSplit.stellarTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-emerald-400 mb-1">Ver transacción en Stellar Expert</p>
                        <p className="text-xs text-slate-400 font-mono truncate w-64">
                          {settledSplit.stellarTxHash}
                        </p>
                      </div>
                    </a>
                  )}
                  <Button
                    onClick={handleReset}
                    className="w-full h-14 bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] text-white font-bold text-lg"
                  >
                    Nuevo Cobro
                  </Button>
                </motion.div>
              ) : (
                <>
                  <div className="text-center py-6 border-b border-slate-700/50">
                    <p className="text-6xl font-bold text-gradient mb-2">${amount}</p>
                    <p className="text-sm text-slate-400">Monto Total</p>
                  </div>

                  <div className="flex justify-center py-8">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl">
                      <QRCodeCanvas value={qrData} size={280} level="H" includeMargin={false} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-slate-700/30">
                      <span className="text-slate-400">Dividido entre:</span>
                      <span className="text-xl font-bold">{people} personas</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-700/30">
                      <span className="text-slate-400">Cada uno paga:</span>
                      <span className="text-2xl font-bold text-[#5B4BF5]">${shareAmount}</span>
                    </div>
                  </div>

                  <div className="glass-card p-4 bg-blue-500/5 border-blue-500/20 text-center">
                    <p className="text-sm text-slate-300">📱 Los clientes escanean este QR para pagar su parte</p>
                  </div>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full h-14 border-2 border-slate-600 hover:bg-slate-700/50"
                  >
                    Nuevo Cobro
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">Passpay POS · Powered by Stellar</p>
        </div>
      </div>
    </div>
  );
}