import type { Metadata } from 'next';
import { VerificadorEscrito } from '@/components/pro/VerificadorEscrito';

export const metadata: Metadata = {
  title: 'Verificar un escrito',
  description:
    'Pega una demanda o un recurso y FundaLex comprueba cada cita jurisprudencial contra el buscador oficial del CENDOJ.',
  robots: { index: false, follow: true },
};

export default function PaginaVerificar() {
  return <VerificadorEscrito />;
}
