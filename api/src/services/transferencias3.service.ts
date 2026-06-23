// Transferencias 3.0 (BCRA) — QR interoperable + acreditación CVU.
//
// Transferencias 3.0 es el esquema del Banco Central de la República Argentina
// que habilita pagos interoperables: un único QR estandarizado (formato EMVCo,
// administrado por Coelsa) que cualquier billetera o banco puede leer para
// debitar al pagador y acreditar al comercio en su CVU/CBU de forma instantánea
// y 24/7.
//
// En Passpay, este rail es el on-ramp local: el comercio cobra en ARS vía
// Transferencias 3.0 y Passpay liquida el valor on-chain en Stellar (USDC/XLM),
// cerrando el puente peso ↔ dólar on-chain. El banco/Coelsa están simulados
// (no requieren cuenta bancaria real), pero el QR cumple el formato EMVCo real
// y la liquidación on-chain es una transacción real en la red Stellar.

import { sendSettlementPayment } from "./stellar.service";
import { AssetConfig } from "../types/asset.types";

// ── Datos del comercio recaudador (Passpay) ──────────────────────────────
export function collectorAccount() {
  return {
    cvu: process.env.PASSPAY_CVU ?? "0000003100099999999999", // CVU demo (22 dígitos)
    alias: process.env.PASSPAY_ALIAS ?? "passpay.ars",
    name: process.env.PASSPAY_MERCHANT_NAME ?? "PASSPAY",
    city: process.env.PASSPAY_MERCHANT_CITY ?? "BUENOS AIRES",
  };
}

// ── EMVCo QR (formato Transferencias 3.0 / Coelsa) ────────────────────────
// Construye un TLV EMVCo: cada campo es ID(2) + LEN(2) + VALUE, cerrado con
// un CRC16-CCITT (ID "63"), igual que el QR interoperable real.

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) — checksum del estándar EMVCo */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface T3QrFields {
  amountArs: number;
  reference: string;
  cvu: string;
  alias: string;
  merchantName: string;
  merchantCity: string;
}

export interface T3Qr {
  /** Payload EMVCo completo (lo que va dentro del QR) */
  emv: string;
  /** Campos legibles para la UI / conciliación */
  fields: T3QrFields;
}

/**
 * Genera el QR interoperable Transferencias 3.0 para un monto en ARS.
 * `reference` se usa para conciliar (típicamente el id del split/cobro).
 */
export function generateInteroperableQR(
  amountArs: number,
  reference: string
): T3Qr {
  if (!amountArs || amountArs <= 0) throw new Error("amountArs must be > 0");
  const c = collectorAccount();

  // Merchant Account Information (ID "26") — sub-TLV con el dominio del esquema,
  // CVU y alias del comercio recaudador.
  const merchantAccountInfo =
    tlv("00", "ar.com.coelsa") + // Globally Unique Identifier del esquema
    tlv("01", c.cvu) +
    tlv("02", c.alias);

  let payload =
    tlv("00", "01") + // Payload Format Indicator
    tlv("01", "12") + // Point of Initiation Method: 12 = dinámico (monto fijo)
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") + // Merchant Category Code (genérico)
    tlv("53", "032") + // Currency: 032 = ARS (ISO 4217)
    tlv("54", amountArs.toFixed(2)) + // Transaction Amount
    tlv("58", "AR") + // Country Code
    tlv("59", c.name.slice(0, 25)) + // Merchant Name
    tlv("60", c.city.slice(0, 15)) + // Merchant City
    tlv("62", tlv("05", reference.slice(0, 25))); // Additional Data: Reference Label

  // CRC: se calcula sobre el payload + "6304"
  payload += "6304";
  const crc = crc16(payload);
  const emv = payload + crc;

  return {
    emv,
    fields: {
      amountArs,
      reference,
      cvu: c.cvu,
      alias: c.alias,
      merchantName: c.name,
      merchantCity: c.city,
    },
  };
}

// ── Acreditación simulada (Coelsa) + liquidación on-chain ─────────────────

export interface T3SettlementResult {
  settled: boolean;
  settlementAsset?: string;
  settlementAmount?: string;
  stellarTxHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface T3PaymentReceipt {
  rail: "TRANSFERENCIAS_3_0";
  status: "ACCREDITED";
  bankTransactionId: string;
  coelsaId: string;
  amountArs: number;
  creditedCvu: string;
  reference: string;
  payer: string;
  timestamp: string;
  settlement: T3SettlementResult;
}

/** Tasa de cambio ARS→USD para la demo (reemplazar por anchor/oráculo en prod) */
function arsPerUsd(): number {
  const raw = Number(process.env.T3_ARS_PER_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 1175;
}

/** Asset de liquidación on-chain por defecto (XLM nativo para robustez en demo) */
function settlementAssetFromEnv(): AssetConfig {
  const code = (process.env.T3_SETTLE_ASSET_CODE ?? "XLM").toUpperCase();
  if (code === "XLM") {
    return { network: "stellar", type: "native", code: "XLM" };
  }
  const issuer = process.env.T3_SETTLE_ASSET_ISSUER;
  if (!issuer) {
    throw new Error("T3_SETTLE_ASSET_ISSUER requerido para assets de crédito");
  }
  return { network: "stellar", type: "credit", code, issuer };
}

/**
 * Simula que un pagador abona el QR desde su billetera/banco: Coelsa acredita
 * los ARS en el CVU de Passpay y, acto seguido, Passpay liquida el valor
 * on-chain enviando el asset de settlement al comercio en Stellar.
 *
 * El banco está simulado; la transacción Stellar es REAL (testnet/mainnet).
 * Si las cuentas Stellar no están configuradas/fondeadas, devuelve igual el
 * recibo bancario con el detalle del error de settlement (no rompe la demo).
 */
export async function simulateInboundPayment(params: {
  amountArs: number;
  reference: string;
  payer?: string;
}): Promise<T3PaymentReceipt> {
  const { amountArs, reference } = params;
  if (!amountArs || amountArs <= 0) throw new Error("amountArs must be > 0");

  const c = collectorAccount();
  const seq = Math.round(amountArs * 100) + reference.length;
  const bankTransactionId = `T3-${reference.slice(0, 8)}-${seq}`;
  const coelsaId = `COELSA-${seq}`;

  // Liquidación on-chain en Stellar
  const settlement: T3SettlementResult = { settled: false };
  try {
    const asset = settlementAssetFromEnv();
    const usd = amountArs / arsPerUsd();
    // Si el asset es nativo, convertimos USD→XLM con una referencia simple;
    // si es USDC, el monto en USD es directo.
    const amount =
      asset.code === "USDC"
        ? usd.toFixed(7)
        : (usd / Number(process.env.T3_USD_PER_XLM || 0.1)).toFixed(7);

    const hash = await sendSettlementPayment(amount, asset);
    const network = process.env.STELLAR_NETWORK === "mainnet" ? "public" : "testnet";
    settlement.settled = true;
    settlement.settlementAsset = asset.code;
    settlement.settlementAmount = amount;
    settlement.stellarTxHash = hash;
    settlement.explorerUrl = `https://stellar.expert/explorer/${network}/tx/${hash}`;
  } catch (err: any) {
    settlement.error = err?.message ?? String(err);
  }

  return {
    rail: "TRANSFERENCIAS_3_0",
    status: "ACCREDITED",
    bankTransactionId,
    coelsaId,
    amountArs,
    creditedCvu: c.cvu,
    reference,
    payer: params.payer ?? "pagador-demo",
    timestamp: new Date().toISOString(),
    settlement,
  };
}
