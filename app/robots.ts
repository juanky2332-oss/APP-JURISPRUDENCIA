import type { MetadataRoute } from 'next';
import { urlBase } from '@/lib/marca';

/**
 * Qué se indexa y qué no.
 *
 * La portada y las páginas legales, sí: son contenido estable que describe el
 * servicio. El buscador y las fichas, no: su contenido es de CENDOJ, cambia en
 * cada consulta y generaría miles de páginas duplicadas con información que no
 * es nuestra. Indexarlas sería, además, construir por la puerta de atrás el
 * índice propio que este proyecto ha decidido no tener.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/buscar', '/resolucion', '/documento', '/api/'],
    },
    sitemap: `${urlBase()}/sitemap.xml`,
  };
}
