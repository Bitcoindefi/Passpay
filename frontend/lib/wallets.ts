// lib/wallets.ts

export const STELLAR_WALLETS = [
  {
    id: 'freighter',
    name: 'Freighter',
    icon: '🔷',
    type: 'extension',
    detectFunction: () => (window as any).freighter !== undefined,
    connectFunction: async () => {
    const freighter = await import('@stellar/freighter-api');
    if (await freighter.isConnected()) {
      const result = await freighter.requestAccess();
      return result;
    }
    return null;
}
  },
  {
    id: 'lobstr',
    name: 'LOBSTR',
    icon: '🦞',
    type: 'mobile',
    deepLink: 'lobstr://',
    detectFunction: () => /Lobstr/i.test(navigator.userAgent),
  },
{
    id: 'albedo',
    name: 'Albedo',
    icon: '🌟',
    type: 'web',
    url: 'https://albedo.link',
    // connectFunction: async () => {
    //   const albedo = await import('@albedo-link/intent');
    //   const result = await albedo.publicKey();
    //   return result.pubkey;
    // }
  },
  {
    id: 'xbull',
    name: 'xBull',
    icon: '🐂',
    type: 'extension',
    detectFunction: () => (window as any).xBullSDK !== undefined,
    connectFunction: async () => {
      const xbull = (window as any).xBullSDK;
      await xbull.connect();
      return xbull.getPublicKey();
    }
  }
];
