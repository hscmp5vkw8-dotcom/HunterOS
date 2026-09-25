// Do not send QR URLs or arbitrary SKU text to a food barcode service.
export function foodBarcode(value: string): string | null {
 const code=value.trim();
 return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) ? code : null;
}
