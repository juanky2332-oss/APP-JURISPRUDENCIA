import type { Metadata } from 'next';
import { PanelCarpetas } from '@/components/pro/PanelCarpetas';

export const metadata: Metadata = {
  title: 'Carpetas de asunto',
  description: 'Aparta resoluciones por asunto y expórtalas en un dossier.',
  robots: { index: false, follow: true },
};

export default function PaginaPanelCarpetas() {
  return <PanelCarpetas />;
}
