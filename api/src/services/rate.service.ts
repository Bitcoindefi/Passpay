// Cotización ARS/USD del BCRA (oficial), con cache y fallback a env.
// Fuente: https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones (USD → tipoCotizacion).
const BCRA_URL = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones";
const TTL_MS = 60 * 60 * 1000; // 1 h (el BCRA publica una vez por día hábil)
const RETRY_AFTER_FAIL_MS = 5 * 60 * 1000; // si falla, reintenta a los ~5 min

export interface ArsUsdRate {
  arsPerUsd: number;
  source: "BCRA" | "fallback";
  asOf: string | null;
}

let cache: { rate: ArsUsdRate; at: number } | null = null;

function fallbackRate(): number {
  const raw = Number(process.env.T3_ARS_PER_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 1477;
}

/** Trae la cotización oficial del BCRA (cacheada). Nunca lanza: cae al env. */
export async function getArsPerUsd(): Promise<ArsUsdRate> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rate;
  try {
    const res = await fetch(BCRA_URL, {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`BCRA HTTP ${res.status}`);
    const data: any = await res.json();
    const usd = data?.results?.detalle?.find((c: any) => c?.codigoMoneda === "USD");
    const rate = Number(usd?.tipoCotizacion);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("BCRA sin cotización USD");
    const out: ArsUsdRate = { arsPerUsd: rate, source: "BCRA", asOf: data?.results?.fecha ?? null };
    cache = { rate: out, at: Date.now() };
    return out;
  } catch {
    const out: ArsUsdRate = { arsPerUsd: fallbackRate(), source: "fallback", asOf: null };
    // cacheamos el fallback corto para reintentar pronto el BCRA
    cache = { rate: out, at: Date.now() - TTL_MS + RETRY_AFTER_FAIL_MS };
    return out;
  }
}

/** Versión sincrónica para rutas calientes (settlement): usa cache o fallback y dispara refresh. */
export function arsPerUsdSync(): number {
  if (cache) return cache.rate.arsPerUsd;
  void getArsPerUsd(); // calienta el cache para próximas llamadas
  return fallbackRate();
}
