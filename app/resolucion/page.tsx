import { Suspense } from 'react';
import { FichaResolucion } from '@/components/FichaResolucion';

export const dynamic = 'force-dynamic';

export default function PaginaResolucion() {
  return (
    <Suspense
      fallback={
        <div className="panel estado">
          <h2>Cargando la ficha…</h2>
        </div>
      }
    >
      <FichaResolucion />
    </Suspense>
  );
}
