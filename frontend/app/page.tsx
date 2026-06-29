'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Store, Moon, Sun, ArrowDownToLine, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { ArrowPatternBg, IconTile, PASSPAY_FEATURES } from '@/components/passpay-graphics';

export default function Home() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden px-6 py-10 transition-colors duration-300 ${
        isDark ? 'bg-[#0B0E14] text-white' : 'bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900'
      }`}
    >
      {/* Fondo de flechas (solo en dark) — cubre toda la altura */}
      {isDark && <ArrowPatternBg />}

      {/* Toggle de tema */}
      <button
        onClick={toggleTheme}
        aria-label="Cambiar tema"
        className={`fixed top-6 right-6 z-20 rounded-full p-3 transition-all ${
          isDark ? 'bg-slate-800/70 text-amber-400 hover:bg-slate-700' : 'bg-white text-gray-800 shadow-lg hover:bg-gray-100'
        }`}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center">
        {/* Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-7 mt-6 text-center"
        >
          <Image
            src="/passpay-logo.svg"
            alt="Passpay"
            width={260}
            height={84}
            priority
            className="mx-auto h-auto w-auto max-w-[260px] drop-shadow-lg"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">
            Cobrá en pesos.{' '}
            <span className="text-gradient">Ahorrá en dólares.</span>
          </h1>
          <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Simple. Rápido. <span className="text-[#2DD4BF] font-medium">En Stellar.</span>
          </p>
        </motion.div>

        {/* Cards de entrada */}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/cobrar-ars" className="block h-full">
              <div
                className={`group h-full rounded-3xl border p-8 transition-all ${
                  isDark
                    ? 'border-white/10 bg-white/[0.04] hover:border-[#2DD4BF]/60 hover:bg-white/[0.06]'
                    : 'border-gray-200 bg-white hover:border-[#2DD4BF] hover:shadow-xl'
                }`}
              >
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] shadow-lg shadow-[#2DD4BF]/30"
                >
                  <ArrowDownToLine className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Cobrar en ARS</h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Pago con QR · cualquier billetera o banco
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2DD4BF]">
                  Empezar <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/dashboard" className="block h-full">
              <div
                className={`group h-full rounded-3xl border p-8 transition-all ${
                  isDark
                    ? 'border-white/10 bg-white/[0.04] hover:border-[#5B4BF5]/60 hover:bg-white/[0.06]'
                    : 'border-gray-200 bg-white hover:border-[#5B4BF5] hover:shadow-xl'
                }`}
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B4BF5] to-[#3D2FD6] shadow-lg shadow-[#5B4BF5]/30">
                  <Store className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Mi negocio</h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Panel: balance, cobros y movimientos
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#8B7CF8]">
                  Abrir panel <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Accesos secundarios */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 grid w-full grid-cols-2 gap-4"
        >
          <Link
            href="/offramp"
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-all ${
              isDark ? 'border-white/10 bg-white/[0.03] hover:border-[#FFB020]/50' : 'border-gray-200 bg-white hover:shadow-md'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ArrowRightLeft className="h-4 w-4 text-[#FFB020]" /> Pasar mis dólares a pesos
            </span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>
          <Link
            href="/ramp"
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-all ${
              isDark ? 'border-white/10 bg-white/[0.03] hover:border-[#8B7CF8]/50' : 'border-gray-200 bg-white hover:shadow-md'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ArrowRightLeft className="h-4 w-4 text-[#8B7CF8]" /> Comprar o vender dólares
            </span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Link>
        </motion.div>

        {/* Cómo funciona — set de íconos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-14 w-full"
        >
          <p className={`mb-6 text-center text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Cómo funciona
          </p>
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {PASSPAY_FEATURES.map(({ Icon, label }) => (
              <IconTile key={label} label={label}>
                <Icon />
              </IconTile>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`mt-14 text-center text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
        >
          Cobrá en pesos y guardá el valor en dólares · Tecnología Transferencias 3.0 (BCRA) y Stellar
        </motion.p>
      </div>
    </div>
  );
}
