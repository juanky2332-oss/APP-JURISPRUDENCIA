import type { Metadata } from 'next';
import { Factura } from '@/components/pro/Factura';

export const metadata: Metadata = {
  title: 'Factura',
  description: 'Factura con IVA de tu licencia Pro, lista para descargar.',
  robots: { index: false, follow: true },
};

export default function PaginaFactura() {
  return <Factura />;
}
