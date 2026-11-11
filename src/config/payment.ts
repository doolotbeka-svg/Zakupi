/**
 * Payment by bank QR code (ELQR). The bank does not notify the site about transfers,
 * so every payment is confirmed by an administrator.
 */
export const QR_PAYMENT = {
  /** Image of the QR code, served from public/ */
  imageUrl: '/payment/mbank-qr.jpg',
  /** The link encoded in the QR code: opens the payment in a banking app on a phone */
  link: 'https://pay.payqr.kg/qr/#00020101021132440012c2c.mbank.kg01020210129969980103951302125204999953034175911Doolotbek%20A63041c49',
  recipient: 'Доолотбек А',
  bank: 'MBank'
} as const;
