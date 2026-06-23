// lib/payment-providers/pomelo.ts

export async function createPomeloPayment(params: {
  amount: number;
  currency: 'ARS' | 'USD';
  splitId: string;
}) {
  const response = await fetch('https://api.pomelo.la/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.POMELO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      description: `Passpay Split ${params.splitId}`,
      callback_url: `https://api.passpay.app/webhooks/pomelo/${params.splitId}`
    })
  });
  
  return await response.json();
}