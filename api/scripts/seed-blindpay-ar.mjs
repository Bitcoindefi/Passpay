// Seed de BlindPay para Argentina (off-ramp USDC/USDB → ARS).
//
// Crear un receiver KYC nuevo requiere aceptar los Términos de Servicio en una
// página hosted (POST /e/instances/:id/tos → url interactiva), así que NO se puede
// automatizar 100%. Para que el off-ramp ARS funcione alcanza con:
//   1. usar un receiver ya KYC-aprobado (los 10 pre-cargados del sandbox),
//   2. adjuntarle una cuenta bancaria ARS (rail transfers_bitso, CBU/CVU),
//   3. correr un quote real USDB(testnet) → ARS.
//
// Uso:  node scripts/seed-blindpay-ar.mjs [receiver_id]
// Requiere en api/.env: BLINDPAY_API_KEY, BLINDPAY_INSTANCE_ID, BLINDPAY_BASE_URL
// En esta máquina: NODE_TLS_REJECT_UNAUTHORIZED=0 por el proxy TLS corporativo.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(join(__dirname, "..", ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*(#.*)?$/);
      if (m) out[m[1]] = m[2].replace(/\s+#.*$/, "").trim();
    }
  } catch { /* usa process.env */ }
  return { ...out, ...process.env };
}

const env = loadEnv();
const API_KEY = env.BLINDPAY_API_KEY;
const INSTANCE_ID = env.BLINDPAY_INSTANCE_ID;
const BASE = (env.BLINDPAY_BASE_URL || "https://api.blindpay.com/v1").replace(/\/$/, "");
const NETWORK = env.BLINDPAY_NETWORK || "stellar_testnet";
const TOKEN = env.BLINDPAY_TOKEN || "USDB";

if (!API_KEY || !INSTANCE_ID) {
  console.error("❌ Falta BLINDPAY_API_KEY o BLINDPAY_INSTANCE_ID en api/.env");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
}

// CBU 22 dígitos checksum-válido (Banco Galicia 017-0099)
function cbuCheck(d, w) { let s = 0; for (let i = 0; i < d.length; i++) s += parseInt(d[i], 10) * w[i]; return (10 - (s % 10)) % 10; }
function makeValidCBU(bankBranch7 = "0170099", account13 = "2000006779737") {
  const c1 = cbuCheck(bankBranch7, [7, 1, 3, 9, 7, 1, 3]);
  const c2 = cbuCheck(account13, [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]);
  return `${bankBranch7}${c1}${account13}${c2}`;
}

async function main() {
  const CBU = makeValidCBU();
  console.log(`🔧 Instance: ${INSTANCE_ID}  ·  network=${NETWORK} token=${TOKEN}`);
  console.log(`🔧 CBU (checksum válido): ${CBU} [${CBU.length} dígitos]\n`);

  // 0 ── elegir receiver KYC-aprobado
  let receiverId = process.argv[2];
  let receiverName = "receiver";
  if (!receiverId) {
    console.log("0️⃣  Buscando un receiver KYC-aprobado…");
    const list = await call("GET", `/instances/${INSTANCE_ID}/receivers`);
    if (!list.ok) { console.error("   ❌", JSON.stringify(list.json)); process.exit(1); }
    const arr = Array.isArray(list.json) ? list.json : list.json.data || [];
    const approved = arr.find((r) => r.kyc_status === "approved") || arr[0];
    if (!approved) { console.error("   ❌ No hay receivers en el sandbox."); process.exit(1); }
    receiverId = approved.id;
    receiverName = `${approved.first_name ?? ""} ${approved.last_name ?? ""}`.trim() || "receiver";
    console.log(`   ✅ ${receiverId} (${receiverName}, kyc=${approved.kyc_status})\n`);
  }

  // 1 ── adjuntar cuenta ARS (transfers_bitso)
  console.log("1️⃣  Adjuntando cuenta bancaria ARS (transfers_bitso / CBU)…");
  const bank = await call("POST", `/instances/${INSTANCE_ID}/receivers/${receiverId}/bank-accounts`, {
    type: "transfers_bitso",
    name: "Cuenta ARS Passpay",
    beneficiary_name: receiverName,
    transfers_type: "CBU",
    transfers_account: CBU,
  });
  console.log(`   status ${bank.status}`);
  if (!bank.ok) { console.error("   ❌", JSON.stringify(bank.json, null, 2)); process.exit(1); }
  const bankAccountId = bank.json.id;
  console.log(`   ✅ bank_account_id = ${bankAccountId}  (status ${bank.json.status})\n`);

  // 2 ── quote USDB(testnet) → ARS
  console.log("2️⃣  Pidiendo quote → ARS (request_amount=5000 = 50.00)…");
  const quote = await call("POST", `/instances/${INSTANCE_ID}/quotes`, {
    bank_account_id: bankAccountId,
    currency_type: "sender",
    cover_fees: false,
    request_amount: 5000,
    network: NETWORK,
    token: TOKEN,
  });
  console.log(`   status ${quote.status}`);
  if (!quote.ok) { console.error("   ❌", JSON.stringify(quote.json, null, 2)); process.exit(1); }
  const q = quote.json;
  console.log(`   ✅ quote_id = ${q.id}`);
  console.log(`      envío ${(q.sender_amount / 100).toFixed(2)} ${TOKEN} → recibe ${(q.receiver_amount / 100).toLocaleString("es-AR")} ARS`);
  console.log(`      tasa BlindPay ≈ ${q.blindpay_quotation?.toLocaleString("es-AR")} ARS/USD\n`);

  console.log("──────── RESUMEN (usar en /offramp) ────────");
  console.log(`receiver_id      = ${receiverId}`);
  console.log(`bank_account_id  = ${bankAccountId}`);
  console.log(`quote_id         = ${q.id}`);
}

main().catch((e) => { console.error("💥", e); process.exit(1); });
