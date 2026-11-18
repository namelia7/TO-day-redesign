import midtransClient from 'midtrans-client'

const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
const clientKey = process.env.MIDTRANS_CLIENT_KEY || ''

// Server tetap boleh jalan sebelum akun Midtrans siap. Selama key belum diisi,
// endpoint pembayaran mengembalikan 503 (bukan crash saat startup).
export const isMidtransConfigured = Boolean(serverKey && clientKey)

export const snap = isMidtransConfigured
  ? new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey,
      clientKey,
    })
  : null

export const midtransServerKey = serverKey
