import type { MetadataRoute } from 'next';
import { urlBase } from '@/lib/marca';
import { RUTAS } from '@/lib/rutas';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlBase();
  const revisado = new Date('2026-08-27');

  return [
    { url: base, lastModified: revisado, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}${RUTAS.avisoLegal}`, lastModified: revisado, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}${RUTAS.terminos}`, lastModified: revisado, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}${RUTAS.privacidad}`, lastModified: revisado, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}${RUTAS.cookies}`, lastModified: revisado, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
