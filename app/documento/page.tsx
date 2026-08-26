import { Suspense } from 'react';
import { PuenteDocumento } from '@/components/PuenteDocumento';

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
