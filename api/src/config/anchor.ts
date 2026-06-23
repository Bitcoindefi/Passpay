// Configuración del anchor (on/off-ramp dólar ↔ ARS) — SEP-1 / SEP-10 / SEP-24
//
// Passpay habla con cualquier anchor compatible con SEP-24 de forma agnóstica:
// solo necesita el `home_domain`, desde el cual descubre dinámicamente los
// endpoints vía el stellar.toml (SEP-1). Por defecto apuntamos al anchor de
// referencia de la SDF en testnet (siempre disponible para la demo); en
// producción se apunta a Anclap (anchor argentino real, ARS ↔ USDC).
//
// Presets (setear ANCHOR_PROVIDER en .env):
//   reference → testanchor.stellar.org      (SEP-24 ref anchor, testnet, USDC/SRT)
//   anclap    → anchor de Anclap (Argentina) — definir ANCLAP_HOME_DOMAIN

export interface AnchorPreset {
  /** Nombre legible para la UI */
  name: string;
  /** Dominio raíz del anchor; el stellar.toml vive en /.well-known/stellar.toml */
  homeDomain: string;
  /** Código del asset on-chain que se deposita/retira (lado Stellar del ramp) */
  assetCode: string;
  /** Moneda fiat de off-ramp (lado banco) — informativo para la UI */
  fiatCurrency: string;
}

const PRESETS: Record<string, AnchorPreset> = {
  reference: {
    name: "Stellar Reference Anchor (testnet)",
    homeDomain: "testanchor.stellar.org",
    assetCode: "USDC",
    fiatCurrency: "USD",
  },
  anclap: {
    name: "Anclap (Argentina)",
    // El dominio exacto del sandbox de Anclap se setea por env; este default
    // es un placeholder razonable y debe confirmarse con credenciales de Anclap.
    homeDomain: process.env.ANCLAP_HOME_DOMAIN ?? "api-stage.anclap.com",
    assetCode: process.env.ANCLAP_ASSET_CODE ?? "ARS",
    fiatCurrency: "ARS",
  },
};

export function getAnchorConfig(): AnchorPreset {
  const provider = (process.env.ANCHOR_PROVIDER ?? "reference").toLowerCase();
  const preset = PRESETS[provider] ?? PRESETS.reference;

  // Overrides finos por env (permiten apuntar a cualquier anchor sin tocar código)
  return {
    ...preset,
    homeDomain: process.env.ANCHOR_HOME_DOMAIN ?? preset.homeDomain,
    assetCode: process.env.ANCHOR_ASSET_CODE ?? preset.assetCode,
    fiatCurrency: process.env.ANCHOR_FIAT_CURRENCY ?? preset.fiatCurrency,
  };
}

export function tomlUrl(homeDomain: string): string {
  const host = homeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${host}/.well-known/stellar.toml`;
}
