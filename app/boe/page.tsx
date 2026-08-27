import type { Metadata } from 'next';
import { PanelBoe } from '@/components/pro/PanelBoe';

export const metadata: Metadata = {
  title: 'El BOE de tu materia',
  description: 'Sumario diario del BOE filtrado por las materias que trabajas.',
  robots: { index: false, follow: true },
};

export default function PaginaPanelBoe() {
  return <PanelBoe />;
}
