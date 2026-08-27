import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Buscador } from '@/components/Buscador';
import { MARCA } from '@/lib/marca';

export const metadata: Metadata = {
  // El layout ya aplica la plantilla «%s · FundaLex»: aquí solo va el nombre de la página.
  title: 'Buscar jurisprudencia',
  description: MARCA.descripcionCorta,
  // El buscador es una herramienta con estado en la URL: no aporta nada
  // indexado y multiplicaría páginas duplicadas. La portada sí se indexa.
  robots: { index: false, follow: true },
};

export default function PaginaBuscador() {
  return (
    <Suspense
      fallback={
        <div className="panel estado">
          <h2>Cargando el buscador…</h2>
        </div>
      }
    >
      <Buscador />
    </Suspense>
  );
}
