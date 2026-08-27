import type { Metadata } from 'next';
import { PanelAlertas } from '@/components/pro/PanelAlertas';

export const metadata: Metadata = {
  title: 'Alertas',
  description: 'Consultas vigiladas: qué jurisprudencia nueva ha publicado CENDOJ.',
  robots: { index: false, follow: true },
};

export default function PaginaPanelAlertas() {
  return <PanelAlertas />;
}
