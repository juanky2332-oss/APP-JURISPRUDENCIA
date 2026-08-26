import { Suspense } from 'react';
import { Buscador } from '@/components/Buscador';

export default function PaginaInicio() {
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
