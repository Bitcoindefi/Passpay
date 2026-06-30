// Graba el video demo de Passpay recorriendo los flujos reales contra el backend en vivo.
// Requiere frontend en :3000 y backend en :3001.
const { chromium } = require("playwright");
const path = require("path");

const BASE = "https://passpay-one.vercel.app";
const OUT = path.join(__dirname, "videos");
const VALID_CBU = "0170099220000067797370"; // Banco Galicia, checksum válido

const sleep = (p, ms) => p.waitForTimeout(ms);

async function hideDevOverlay(page) {
  await page.addStyleTag({
    content:
      "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button],#__next-build-watcher,nextjs-dev-tools-button{display:none!important;visibility:hidden!important}",
  }).catch(() => {});
}

// Grabación LIMPIA: cap() ya no dibuja banner; registra una marca de tiempo (ms desde T0)
// para que Remotion sincronice los subtítulos sobre el marco de teléfono.
const MARKS = [];
let T0 = 0;
async function cap(page, title, sub = "") {
  await hideDevOverlay(page);
  MARKS.push({ t: Math.max(0, Date.now() - T0), title, sub });
}
async function clearCap() {}

async function safeClickByText(page, text) {
  const btn = page.getByRole("button", { name: text });
  await btn.first().click({ timeout: 15000 });
}

async function scrollTo(page, y) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Users/usuario/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 480, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: { width: 480, height: 900 } },
  });

  await context.addInitScript(() => {
    // matar el splash de la app en la grabación (la portada se antepone con ffmpeg)
    try { sessionStorage.setItem("pp-splash-seen", "1"); } catch {}
    const hide = () =>
      document.querySelectorAll("nextjs-portal").forEach((e) =>
        e.style.setProperty("display", "none", "important")
      );
    const start = () => {
      hide();
      new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.documentElement) start();
    else document.addEventListener("DOMContentLoaded", start);
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  T0 = Date.now(); // referencia para las marcas de subtítulos

  try {
    // ───────── 0 · Home (la portada se antepone luego con ffmpeg) ─────────
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await hideDevOverlay(page);
    await sleep(page, 900);

    // ───────── 1 · Home rediseñado ─────────
    await cap(page, "Passpay", "Cobrá en pesos. Ahorrá en dólares. — sobre Stellar");
    await sleep(page, 2600);
    await scrollTo(page, 700); // mostrar "Cómo funciona" con los íconos
    await sleep(page, 2600);
    await scrollTo(page, 0);
    await sleep(page, 800);

    // ───────── 2 · Panel del comercio ─────────
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
    await sleep(page, 1500);
    await cap(page, "Panel del comercio", "Balance en USDC on-chain + equivalente en ARS");
    await sleep(page, 2600);
    const verArs = page.getByRole("button", { name: /Ver en ARS/i });
    if (await verArs.count()) { await verArs.first().click().catch(() => {}); await sleep(page, 2000); }
    await cap(page, "Panel del comercio", "Movimientos: cobro ARS → liquidación on-chain → off-ramp");
    await scrollTo(page, 620);
    await sleep(page, 3200);
    await scrollTo(page, 0);
    await sleep(page, 600);

    // ───────── 3 · Cobrar en ARS (Transferencias 3.0) ─────────
    await page.goto(BASE + "/cobrar-ars", { waitUntil: "networkidle" });
    await page.addStyleTag({
      content:
        ".glass-card .glass-card{background:rgba(15,23,42,.9)!important} .glass-card .glass-card span{color:#e2e8f0!important}",
    }).catch(() => {});
    await cap(page, "1 · Cobro en ARS — Transferencias 3.0", "El comercio ingresa el monto en pesos");
    await page.getByText("passpay.ars").waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
    await sleep(page, 1500);

    const amountInput = page.locator('input[inputmode="decimal"]');
    await amountInput.click();
    for (const ch of "15000") { await amountInput.type(ch, { delay: 90 }); }
    await sleep(page, 1100);

    await cap(page, "1 · Generando QR interoperable", "Formato EMVCo real (CRC16) · CVU recaudador");
    await safeClickByText(page, /Generar QR/i);
    await page.locator('img[alt="QR Transferencias 3.0"]').waitFor({ state: "visible", timeout: 20000 });
    await sleep(page, 2600);

    await cap(page, "1 · Cliente paga por su billetera/banco", "Acreditación vía Coelsa (simulada)");
    await safeClickByText(page, /Simular pago/i);
    await page.getByText(/Pago acreditado/i).waitFor({ state: "visible", timeout: 25000 });
    await cap(page, "1 · ✓ Acreditado + liquidación on-chain", "Coelsa ID + hash en Stellar");
    await sleep(page, 3300);

    // ───────── 2 · Cobro compartido — POS / Split ─────────
    // Contra el sitio deployado la DB (Supabase) está activa: el split se crea de verdad.
    await page.goto(BASE + "/pos", { waitUntil: "networkidle" });
    await cap(page, "2 · Cobro compartido — POS / Split", "Dividir una cuenta entre varias personas");
    await sleep(page, 1400);

    const posAmount = page.locator('input[inputmode="decimal"]');
    await posAmount.click();
    for (const ch of "20000") { await posAmount.type(ch, { delay: 90 }); }
    await sleep(page, 900);

    // subir a 4 personas (+2 desde 2)
    const plus = page.locator('button:has-text("+")').first();
    await plus.click().catch(() => {}); await sleep(page, 450);
    await plus.click().catch(() => {}); await sleep(page, 700);

    await cap(page, "2 · Split automático", "Monto ÷ personas — cada uno paga su parte, en su moneda");
    await sleep(page, 1700);

    await safeClickByText(page, /Generar QR/i);
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    await cap(page, "2 · QR del split listo", "Cada cliente escanea y paga su parte → liquida en Stellar");
    await sleep(page, 3500);

    // ───────── 4 · Off-ramp USDC → ARS (BlindPay) ─────────
    await page.goto(BASE + "/offramp", { waitUntil: "networkidle" });
    await cap(page, "3 · Off-ramp USDC → ARS — BlindPay", "Retirar dólares on-chain a una cuenta en pesos");
    await page.waitForFunction(() => {
      const sel = document.querySelector("select");
      return sel && !/Cargando/i.test(sel.options[sel.selectedIndex]?.text || "Cargando");
    }, { timeout: 15000 }).catch(() => {});
    await sleep(page, 2400);

    const cbuInput = page.locator('input[placeholder="22 dígitos"]');
    if (await cbuInput.count()) {
      await cap(page, "3 · Cuenta ARS de destino (CBU)", "Rail transfers_bitso → ARS");
      // el front ya pre-carga un CBU válido único; solo creamos la cuenta
      await cbuInput.first().click();
      await sleep(page, 1000);
      await safeClickByText(page, /Crear cuenta ARS/i);
      await sleep(page, 3500);
    }

    await cap(page, "3 · Cotizando contra BlindPay (en vivo)", "request_amount en centavos · moneda por el rail");
    const cotizar = page.getByRole("button", { name: /Cotizar/i });
    if (await cotizar.count()) {
      await cotizar.first().click();
      await page.getByText(/Confirmá y firmá/i).waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
      await cap(page, "3 · ✓ Quote real USDC → ARS", "Próximo paso: firmar con la wallet (Freighter/xBull)");
      await sleep(page, 3800);
    } else {
      await cap(page, "3 · Off-ramp listo", "Backend BlindPay conectado en vivo");
      await sleep(page, 2400);
    }

    // ───────── 4 · Rampa anchor SEP-24 ─────────
    await page.goto(BASE + "/ramp", { waitUntil: "networkidle" });
    await sleep(page, 2200);
    await cap(page, "4 · Rampa dólar — Anchor SEP-24", "Descubrimiento SEP-1 · auth SEP-10");
    // monto chico (límite testnet: 10) y disparar el retiro
    const rampAmount = page.locator('input[inputmode="decimal"]');
    if (await rampAmount.count()) {
      await rampAmount.first().click();
      await rampAmount.first().fill("10");
      await sleep(page, 1100);
    }
    await cap(page, "4 · Se abre el flujo SEP-24 del anchor", "Ventana hosted del anchor (KYC + transferencia) · estado en vivo");
    // Disparar el retiro: se abre el popup del anchor; lo cerramos y mostramos el
    // estado de la operación en la propia pantalla de Passpay (la UI de referencia
    // del testanchor es inestable, no la mostramos en el demo).
    try {
      const [popup] = await Promise.all([
        page.waitForEvent("popup", { timeout: 18000 }),
        page.getByRole("button", { name: /Retirar/i }).first().click(),
      ]);
      await popup.waitForTimeout(700);
      await popup.close().catch(() => {});
    } catch {
      await page.getByRole("button", { name: /Retirar/i }).first().click().catch(() => {});
    }
    await page.getByText(/Operaci[oó]n|pending|transfer/i).first().waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    await sleep(page, 4500);
    await cap(page, "4 · Rampa SEP-24 lista", "On/off-ramp dólar ↔ peso con un anchor real de Stellar");
    await sleep(page, 2500);

    // ───────── cierre ─────────
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await sleep(page, 600);
    await cap(page, "Passpay", "Transferencias 3.0 + Anchor SEP-24 + BlindPay · sobre Stellar");
    await sleep(page, 3200);

    console.log("FLOWS_OK");
  } catch (e) {
    console.error("ERROR_DURING_RECORDING:", e.message);
  } finally {
    const totalMs = Date.now() - T0;
    await context.close();
    const video = page.video();
    const vpath = video ? await video.path() : null;
    await browser.close();
    console.log("VIDEO_PATH=" + vpath);
    console.log("TOTAL_MS=" + totalMs);
    console.log("MARKS=" + JSON.stringify(MARKS));
  }
})();
