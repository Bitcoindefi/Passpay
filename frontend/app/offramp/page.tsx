'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Wallet, DollarSign, RefreshCw, Plus, Building2, Globe } from 'lucide-react';
import { StellarWalletsKit } from '@creit-tech/stellar-wallets-kit/sdk';
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils';
import { SwkAppDarkTheme } from '@creit-tech/stellar-wallets-kit/types';
import { api } from '@/lib/api';

// Sandbox usa stellar_testnet; prod usaría 'Public Global Stellar Network ; September 2015'
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_BLINDPAY_NETWORK === 'stellar'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

type Step = 'setup' | 'quote' | 'done';

interface Customer { id: string; first_name: string; last_name: string; email: string; kyc_status: string }
interface BankAccount { id: string; type: string; transfers_type: string; transfers_account: string; beneficiary_name: string; status: string }
interface Quote {
  id: string; expires_at: number; sender_amount: number; receiver_amount: number;
  blindpay_quotation: number; flat_fee: number; partner_fee_amount: number;
  contract: { address: string; amount: string; network: { name: string } };
}

export default function OfframpPage() {
  const [step, setStep] = useState<Step>('setup');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [usdAmount, setUsdAmount] = useState('50');

  // crear cuenta ARS
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newCbu, setNewCbu] = useState('');
  const [newCbuType, setNewCbuType] = useState<'CBU' | 'CVU' | 'ALIAS'>('CBU');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // cargar clientes al montar
  useEffect(() => {
    api.blindpay.customers()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCustomers(arr);
        const approved = arr.find((c) => c.kyc_status === 'approved') ?? arr[0];
        if (approved) setCustomerId(approved.id);
      })
      .catch((e) => setError(`No se pudieron cargar clientes: ${e.message}`));
  }, []);

  const loadBankAccounts = useCallback(async (cid: string) => {
    setBusy('accounts');
    setError(null);
    setNotice(null);
    try {
      const list = await api.blindpay.bankAccounts(cid);
      const arr = Array.isArray(list) ? list : [];
      const ars = arr.filter((b) => b.type === 'transfers_bitso');
      setBankAccounts(ars);
      setBankAccountId(ars[0]?.id ?? '');
      if (ars.length === 0) setShowNewAccount(true);
    } catch {
      // El listado del sandbox de BlindPay se rompe por datos pre-cargados con CPF inválido.
      // Degradamos: el usuario crea una cuenta ARS nueva y usamos el id que devuelve el POST.
      setBankAccounts([]);
      setBankAccountId('');
      setShowNewAccount(true);
      setNotice('No se pudo listar cuentas (quirk del sandbox de BlindPay). Creá una cuenta ARS para continuar.');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => { if (customerId) loadBankAccounts(customerId); }, [customerId, loadBankAccounts]);

  async function handleCreateAccount() {
    if (!/^\d{22}$/.test(newCbu) && newCbuType !== 'ALIAS') {
      return setError('El CBU/CVU debe tener 22 dígitos');
    }
    const customer = customers.find((c) => c.id === customerId);
    const beneficiary = customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'Passpay';
    setBusy('create-account');
    setError(null);
    try {
      const created = await api.blindpay.createBankAccount(customerId, {
        transfers_type: newCbuType,
        transfers_account: newCbu,
        beneficiary_name: beneficiary,
      });
      // Usamos el id devuelto directamente (no re-listamos: el GET del sandbox está roto)
      const account: BankAccount = {
        id: created.id,
        type: 'transfers_bitso',
        transfers_type: newCbuType,
        transfers_account: newCbu,
        beneficiary_name: beneficiary,
        status: created.status ?? 'approved',
      };
      setBankAccounts((prev) => [account, ...prev.filter((b) => b.id !== account.id)]);
      setBankAccountId(account.id);
      setShowNewAccount(false);
      setNewCbu('');
      setNotice(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleGetQuote() {
    setError(null);
    const amount = parseFloat(usdAmount);
    if (!amount || amount <= 0) return setError('Ingresá un monto válido');
    if (!bankAccountId) return setError('Elegí o creá una cuenta ARS de destino');

    setLoading(true);
    try {
      const q = await api.blindpay.quote({
        bank_account_id: bankAccountId,
        request_amount: Math.round(amount * 100), // a centavos
        currency_type: 'sender',
      });
      setQuote(q);
      setStep('quote');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthorizeAndSign() {
    if (!quote) return;
    setError(null);
    setLoading(true);
    try {
      StellarWalletsKit.init({ modules: defaultModules(), theme: SwkAppDarkTheme });
      const { address } = await StellarWalletsKit.authModal();
      setWalletAddress(address);

      const auth = await api.blindpay.authorize({ quote_id: quote.id, sender_wallet_address: address });
      const unsignedXdr = auth.transactionHash ?? auth.xdr ?? auth.unsigned_xdr;
      if (!unsignedXdr) throw new Error('BlindPay no devolvió XDR para firmar');

      const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address,
      });

      const payout = await api.blindpay.payout({
        quote_id: quote.id,
        signed_transaction: signedTxXdr,
        sender_wallet_address: address,
      });

      setReceipt(payout);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (cents: number) => (cents / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="px-4 pt-6 pb-10 max-w-md mx-auto">
        <Link href="/" className="inline-flex p-2 rounded-lg hover:bg-slate-700/50 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center mb-6">
          <Image src="/passpay-logo.svg" alt="Passpay" width={180} height={56} priority className="w-auto h-auto max-w-xs mx-auto" />
          <p className="text-slate-400 text-sm mt-2">Off-ramp USDC → ARS · BlindPay (Transfers/Bitso)</p>
        </div>

        {/* pasos */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {(['setup', 'quote', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s ? 'bg-[#5B4BF5] text-white scale-110'
                  : (['setup', 'quote', 'done'].indexOf(step) > i) ? 'bg-[#2DD4BF] text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                {(['setup', 'quote', 'done'].indexOf(step) > i) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 ${(['setup', 'quote', 'done'].indexOf(step) > i) ? 'bg-[#2DD4BF]' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* PASO 1 — setup */}
          {step === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Configurá el retiro</h2>

              {/* Abroad (Brasil/Colombia) — próximamente */}
              <button
                type="button"
                disabled
                title="Abroad · Brasil/Colombia · próximamente"
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-slate-800/30 opacity-60 cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Globe className="w-4 h-4 text-[#2DD4BF] shrink-0" /> Abroad · Brasil/Colombia
                </span>
                <span className="text-[10px] bg-[#FFB020] text-slate-900 font-bold px-2 py-0.5 rounded-full">Próximamente</span>
              </button>

              {/* cliente */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Cliente (receiver KYC)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#5B4BF5] text-sm"
                >
                  {customers.length === 0 && <option>Cargando…</option>}
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} · {c.kyc_status}
                    </option>
                  ))}
                </select>
              </div>

              {/* cuenta ARS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Cuenta ARS de destino</label>
                  <button onClick={() => setShowNewAccount((v) => !v)} className="text-xs text-[#2DD4BF] hover:text-[#5B4BF5] inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Nueva CBU/CVU
                  </button>
                </div>

                {notice && (
                  <p className="text-[#FFB020] text-xs bg-[#FFB020]/10 rounded-lg px-3 py-2 mb-2">{notice}</p>
                )}

                {busy === 'accounts' ? (
                  <div className="text-slate-500 text-sm py-3 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> cargando cuentas…</div>
                ) : bankAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {bankAccounts.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBankAccountId(b.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${bankAccountId === b.id
                          ? 'border-[#5B4BF5] bg-[#5B4BF5]/10' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'}`}
                      >
                        <Building2 className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{b.beneficiary_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{b.transfers_type} {b.transfers_account} · {b.status}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-2">Este cliente no tiene cuentas ARS. Creá una ↑</p>
                )}

                {showNewAccount && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                    <div className="flex gap-2">
                      {(['CBU', 'CVU', 'ALIAS'] as const).map((t) => (
                        <button key={t} onClick={() => setNewCbuType(t)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${newCbuType === t ? 'bg-[#5B4BF5] text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      value={newCbu}
                      onChange={(e) => setNewCbu(e.target.value)}
                      placeholder={newCbuType === 'ALIAS' ? 'mi.alias.mp' : '22 dígitos'}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#5B4BF5]"
                    />
                    <button
                      onClick={handleCreateAccount}
                      disabled={busy === 'create-account'}
                      className="w-full py-2 rounded-lg bg-[#2DD4BF] text-slate-900 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy === 'create-account' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Crear cuenta ARS'}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* monto */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto a enviar (USDC/USDB)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number" min="1" step="0.01" value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-white focus:outline-none focus:border-[#5B4BF5]"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2 break-words">{error}</p>}

              <button
                onClick={handleGetQuote}
                disabled={loading || !bankAccountId}
                className="w-full h-14 rounded-xl font-semibold bg-gradient-to-r from-[#5B4BF5] to-[#3D2FD6] hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Cotizar</>}
              </button>
            </motion.div>
          )}

          {/* PASO 2 — quote + firma */}
          {step === 'quote' && quote && (
            <motion.div key="quote" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
              <h2 className="text-xl font-bold text-center">Confirmá y firmá</h2>

              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Enviás</span>
                  <span className="font-bold text-lg">{fmt(quote.sender_amount)} USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Recibís</span>
                  <span className="font-bold text-lg text-[#2DD4BF]">{fmt(quote.receiver_amount)} ARS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Tasa</span>
                  <span className="text-slate-300 text-sm">1 USD ≈ {quote.blindpay_quotation?.toLocaleString('es-AR')} ARS</span>
                </div>
                {quote.flat_fee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Fee fijo</span>
                    <span className="text-slate-300 text-sm">{fmt(quote.flat_fee)} USDC</span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Red</span>
                  <span className="text-slate-300 text-sm">{quote.contract?.network?.name ?? 'Stellar'}</span>
                </div>
              </div>

              <p className="text-slate-400 text-sm text-center">
                Tu wallet firmará una transacción Stellar enviando {fmt(quote.sender_amount)} USDC a BlindPay,
                que acredita {fmt(quote.receiver_amount)} ARS en la cuenta destino.
              </p>

              {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2 break-words">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep('setup'); setError(null); }}
                  className="flex-1 h-14 rounded-xl font-semibold border border-slate-600 hover:border-slate-400 text-slate-300 transition-all">
                  Volver
                </button>
                <button onClick={handleAuthorizeAndSign} disabled={loading}
                  className="flex-1 h-14 rounded-xl font-semibold bg-gradient-to-r from-[#5B4BF5] to-[#3D2FD6] hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Wallet className="w-5 h-5" /> Firmar</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* PASO 3 — recibo */}
          {step === 'done' && receipt && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                <CheckCircle className="w-20 h-20 text-[#2DD4BF] mx-auto" />
              </motion.div>
              <h2 className="text-2xl font-bold">¡Payout iniciado!</h2>
              <p className="text-slate-400 text-sm">BlindPay está procesando la transferencia a la cuenta ARS de destino.</p>

              <div className="bg-slate-800/50 border border-[#2DD4BF]/30 rounded-2xl p-5 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Payout ID</span>
                  <span className="font-mono text-xs text-slate-300 truncate max-w-[180px]">{receipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Estado</span>
                  <span className="text-[#2DD4BF] font-semibold text-sm capitalize">{receipt.status}</span>
                </div>
                {quote && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Recibirá</span>
                    <span className="text-[#2DD4BF] font-bold">{fmt(quote.receiver_amount)} ARS</span>
                  </div>
                )}
                {walletAddress && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Desde wallet</span>
                    <span className="font-mono text-xs text-slate-400">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep('setup'); setQuote(null); setReceipt(null); setError(null); }}
                  className="flex-1 h-12 rounded-xl border border-slate-600 hover:border-[#5B4BF5] text-slate-300 hover:text-white transition-all text-sm font-medium">
                  Nuevo off-ramp
                </button>
                <Link href="/" className="flex-1 h-12 rounded-xl bg-[#5B4BF5]/20 border border-[#5B4BF5]/40 hover:bg-[#5B4BF5]/30 text-[#8B7CF8] flex items-center justify-center text-sm font-medium transition-all">
                  Inicio
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <p className="text-center text-xs text-slate-600 mt-8">Off-ramp powered by BlindPay · Stellar {NETWORK_PASSPHRASE.includes('Test') ? 'Testnet' : 'Mainnet'}</p>
      </div>
    </div>
  );
}
