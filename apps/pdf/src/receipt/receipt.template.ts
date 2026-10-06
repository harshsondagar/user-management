import { GenerateReceiptDto } from './dto/generate-receipt.dto';

const esc = (s: unknown) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function renderReceipt(d: GenerateReceiptDto): string {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; color: #222; font-size: 14px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
  .right { text-align: right; } .total { font-size: 18px; font-weight: bold; }
  .footer { margin-top: 40px; color: #777; font-size: 12px; text-align: center; }
</style></head>
<body>
  <div class="header">
    <div><h1>Your Company</h1></div>
    <div class="right"><strong>RECEIPT</strong><br/>#${esc(d.paymentId)}<br/>${esc(d.date)}</div>
  </div>
  <p><strong>Billed to:</strong><br/>${esc(d.customerName)}<br/>${esc(d.customerEmail)}</p>
  <table>
    <tr><th>Description</th><th>Period</th><th class="right">Amount</th></tr>
    <tr><td>${esc(d.planName)}</td><td>${esc(d.periodStart)} – ${esc(d.periodEnd)}</td>
        <td class="right">${esc(d.currency)} ${esc(d.amount)}</td></tr>
    <tr><td colspan="2" class="right">Tax</td><td class="right">${esc(d.currency)} ${esc(d.tax)}</td></tr>
    <tr><td colspan="2" class="right total">Total Paid</td>
        <td class="right total">${esc(d.currency)} ${esc(d.total)}</td></tr>
  </table>
  <p>Payment method: ${esc(d.paymentMethod)}<br/>Transaction ID: ${esc(d.transactionId)}</p>
  <div class="footer">Thank you for your purchase!</div>
</body></html>`;
}