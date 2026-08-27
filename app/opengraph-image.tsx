import { ImageResponse } from 'next/og';
import { MARCA } from '@/lib/marca';

/**
 * La imagen que sale al compartir el enlace por WhatsApp, LinkedIn o correo.
 *
 * Importa más de lo que parece: Firme se reparte por invitación entre
 * abogados, así que el enlace se pega en una conversación. Sin esta imagen
 * aparece un rectángulo vacío, que es exactamente la impresión contraria a la
 * que queremos dar.
 *
 * Se dibuja con las tipografías que trae `next/og` en vez de descargar las
 * nuestras: una fuente que no llega convertiría la tarjeta en un fallo de
 * compilación, y para un elemento decorativo no compensa ese riesgo.
 */

export const alt = `${MARCA.nombre} — ${MARCA.claim}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function ImagenOpenGraph() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(145deg, #171226 0%, #241a34 55%, #1b1526 100%)',
          color: '#f6f3f9',
        }}
      >
        {/* Columnata: el mismo guiño al frontón judicial que la portada. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(198,162,224,0.10) 0 1px, transparent 1px 64px)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* El visto del sello, dibujado con dos bordes en vez de con el
              carácter «✓»: ese glifo obliga a `next/og` a descargar una fuente
              en tiempo de compilación, y si la descarga falla el emblema sale
              vacío. Con CSS no depende de nada. */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(140deg, #8adecf, #2c6e63)',
            }}
          >
            <div
              style={{
                width: 15,
                height: 26,
                marginTop: -6,
                borderRight: '5px solid #17122a',
                borderBottom: '5px solid #17122a',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>{MARCA.nombre.toUpperCase()}</div>
            <div style={{ fontSize: 17, color: '#8adecf', letterSpacing: 3 }}>FUENTE OFICIAL · CENDOJ</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ fontSize: 74, lineHeight: 1.1, fontWeight: 600, maxWidth: 900 }}>
            Jurisprudencia firme y reutilizable
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: '#c0b7ce', maxWidth: 880 }}>
            Resoluciones del CENDOJ con su ECLI, verificables una por una.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, color: '#8a819b' }}>
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 999,
              border: '1px solid rgba(198,162,224,0.35)',
              color: '#c6a2e0',
              fontSize: 20,
            }}
          >
            Acceso por invitación
          </div>
          <div style={{ display: 'flex' }}>Consulta en directo al Consejo General del Poder Judicial</div>
        </div>
      </div>
    ),
    size,
  );
}
