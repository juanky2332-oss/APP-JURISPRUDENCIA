import type { Metadata } from 'next';
import { PanelPro } from '@/components/pro/PanelPro';

export const metadata: Metadata = {
  title: 'Tu cuenta',
  description: 'Activa tu licencia Pro y accede a las herramientas de trabajo de Firme.',
  robots: { index: false, follow: true },
};

export default function PaginaPro() {
  return <PanelPro />;
}
