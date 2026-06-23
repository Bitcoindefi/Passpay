// Servicio de anchor — on/off-ramp dólar ↔ ARS sobre Stellar.
//
// Implementa el handshake estándar de los anchors de Stellar:
//   SEP-1  → descubrimiento de endpoints vía stellar.toml
//   SEP-10 → autenticación web (challenge firmado → JWT)
//   SEP-24 → depósito / retiro interactivo (hosted)
//
// El flujo es load-bearing: Passpay usa el anchor para convertir las
// liquidaciones on-chain (USDC) en pesos en una cuenta bancaria/CVU, y para
// fondear con dólares on-chain desde fiat. Sin el anchor no hay rampa fiat.

import StellarSdk from "@stellar/stellar-sdk";
import { getAnchorConfig, tomlUrl, AnchorPreset } from "../config/anchor";

const { Keypair, TransactionBuilder, Networks } = StellarSdk;

export interface AnchorInfo extends AnchorPreset {
  webAuthEndpoint: string;
  transferServerSep24: string;
  signingKey: string;
  networkPassphrase: string;
}

export interface InteractiveRamp {
  /** "interactive_customer_info_needed" normalmente */
  type: string;
  /** URL del flujo hosted del anchor (se abre en popup/iframe) */
  url: string;
  /** id de la transacción SEP-24 — usar para hacer polling de estado */
  id: string;
}

export interface RampTransaction {
  id: string;
  kind: string; // deposit | withdrawal
  status: string; // pending_user_transfer_start | completed | ...
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  more_info_url?: string;
  message?: string;
}

/** Extrae claves top-level simples (key = "value") de un stellar.toml */
function tomlValue(toml: string, key: string): string | undefined {
  // Captura: KEY = "valor"  (ignora secciones [[CURRENCIES]] anidadas)
  const re = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, "m");
  const m = toml.match(re);
  return m?.[1];
}

/** SEP-1 — descubre los endpoints del anchor desde su stellar.toml */
export async function fetchAnchorInfo(): Promise<AnchorInfo> {
  const cfg = getAnchorConfig();
  const url = tomlUrl(cfg.homeDomain);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo leer stellar.toml del anchor (${url}): ${res.status}`);
  }
  const toml = await res.text();

  const webAuthEndpoint = tomlValue(toml, "WEB_AUTH_ENDPOINT");
  const transferServerSep24 = tomlValue(toml, "TRANSFER_SERVER_SEP0024");
  const signingKey = tomlValue(toml, "SIGNING_KEY");
  const networkPassphrase =
    tomlValue(toml, "NETWORK_PASSPHRASE") ?? Networks.TESTNET;

  if (!webAuthEndpoint || !transferServerSep24 || !signingKey) {
    throw new Error(
      `stellar.toml incompleto: faltan WEB_AUTH_ENDPOINT / TRANSFER_SERVER_SEP0024 / SIGNING_KEY en ${url}`
    );
  }

  return {
    ...cfg,
    webAuthEndpoint,
    transferServerSep24,
    signingKey,
    networkPassphrase,
  };
}

/** Keypair que Passpay usa para operar la rampa (cuenta de tesorería) */
function rampKeypair() {
  const secret = process.env.RAMP_SECRET ?? process.env.PASSPAY_SECRET;
  if (!secret) {
    throw new Error(
      "Falta RAMP_SECRET (o PASSPAY_SECRET) para autenticar con el anchor vía SEP-10"
    );
  }
  return Keypair.fromSecret(secret);
}

/**
 * SEP-10 — autenticación web.
 * 1) pide el challenge al anchor, 2) lo firma con la cuenta de rampa,
 * 3) lo devuelve y obtiene un JWT de sesión.
 */
export async function authenticate(info: AnchorInfo): Promise<string> {
  const kp = rampKeypair();
  const account = kp.publicKey();

  const challengeUrl =
    `${info.webAuthEndpoint}?account=${encodeURIComponent(account)}` +
    `&home_domain=${encodeURIComponent(info.homeDomain)}`;

  const challengeRes = await fetch(challengeUrl);
  if (!challengeRes.ok) {
    throw new Error(`SEP-10 challenge falló: ${challengeRes.status}`);
  }
  const { transaction, network_passphrase } = await challengeRes.json();
  if (!transaction) {
    throw new Error("SEP-10: el anchor no devolvió transaction en el challenge");
  }

  const tx = TransactionBuilder.fromXDR(
    transaction,
    network_passphrase ?? info.networkPassphrase
  );
  tx.sign(kp);
  const signedXdr = tx.toXDR();

  const tokenRes = await fetch(info.webAuthEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!tokenRes.ok) {
    throw new Error(`SEP-10 token falló: ${tokenRes.status}`);
  }
  const { token } = await tokenRes.json();
  if (!token) {
    throw new Error("SEP-10: el anchor no devolvió token");
  }
  return token;
}

/**
 * SEP-24 — inicia un depósito (fiat → USDC on-chain) o retiro
 * (USDC on-chain → fiat/CVU) interactivo. Devuelve la URL hosted y el id.
 */
export async function startInteractive(
  direction: "deposit" | "withdraw",
  amount?: string
): Promise<{ info: AnchorInfo; ramp: InteractiveRamp; account: string }> {
  const info = await fetchAnchorInfo();
  const jwt = await authenticate(info);
  const account = rampKeypair().publicKey();

  const endpoint = `${info.transferServerSep24}/transactions/${direction}/interactive`;
  const body: Record<string, string> = {
    asset_code: info.assetCode,
    account,
  };
  if (amount) body.amount = amount;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SEP-24 ${direction} falló: ${res.status} ${detail}`);
  }
  const ramp = (await res.json()) as InteractiveRamp;
  return { info, ramp, account };
}

/** SEP-24 — estado de una transacción de rampa (para polling) */
export async function getRampTransaction(id: string): Promise<RampTransaction> {
  const info = await fetchAnchorInfo();
  const jwt = await authenticate(info);

  const res = await fetch(
    `${info.transferServerSep24}/transaction?id=${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  if (!res.ok) {
    throw new Error(`SEP-24 transaction status falló: ${res.status}`);
  }
  const { transaction } = await res.json();
  if (!transaction) throw new Error("SEP-24: transacción no encontrada");
  return transaction as RampTransaction;
}
