export const PDF_QUEUE = 'pdf';
export const PDF_JOBS = { RECEIPT: 'receipt.generate' } as const;
export const receiptKey = (paymentId: string) => `receipts/${paymentId}.pdf`;