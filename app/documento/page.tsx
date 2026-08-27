import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PuenteDocumento } from '@/components/PuenteDocumento';

// Igual que la ficha: si alguien pega este enlace, que se vea de qué es.
export const metadata: Metadata = {
  title: 'Documento oficial',
  description: 'Apertura del PDF oficial de una resolución en poderjudicial.es, por la vía que permite el CGPJ.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

/**
 * Página puente hacia el PDF oficial.
 *
 * Aquí acaba quien pincha un enlace `/api/documento` cuando el CGPJ ha
 * interpuesto su control de descargas masivas. En vez de un JSON de error, ve
 * una página que le explica qué ha pasado y le abre el documento en
 * poderjudicial.es con su propia sesión.
 */
export default function PaginaDocumento() {
  return (
    <Suspense
      fallback={
        <div className="panel estado">
          <h2>Preparando el documento oficial…</h2>
        </div>
      }
    >
      <PuenteDocumento />
    </Suspense>
  );
}
