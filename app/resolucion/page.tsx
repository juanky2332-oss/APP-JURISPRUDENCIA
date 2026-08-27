import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FichaResolucion } from '@/components/FichaResolucion';

// Un enlace a una resolución se comparte por correo: merece un título propio y no el genérico del sitio.
export const metadata: Metadata = {
  title: 'Ficha de la resolución',
  description: 'Metadatos oficiales, cita compuesta y enlace al documento del CGPJ para una resolución concreta.',
  robots: { index: false, follow: true },
};

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
