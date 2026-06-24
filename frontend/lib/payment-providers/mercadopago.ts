// lib/payment-providers/mercadopago.ts
// TODO: conectar MercadoPago cuando se integre

export async function createMPPayment(params: {
  amount: number;
  description: string;
  splitId: string;
  participantId: string;
}) {
  // TODO: implementar cuando se integre MercadoPago
  throw new Error('MercadoPago not implemented yet');
}