/**
 * Prueba de extremo a extremo del plan Pro, conduciendo un navegador real.
 *
 *   npm run probar:pro                                  # contra localhost:3000
 *   npm run probar:pro -- https://firme-legal.vercel.app # contra producción
 *
 * Necesita una clave Pro válida en `%TEMP%\clave.txt`. Emítela antes con
 * `npm run licencia -- --correo prueba@ejemplo.es` y pega la clave en ese
 * archivo. Hace consultas reales a CENDOJ, así que tarda un par de minutos.
 *
 * Hace lo que haría un abogado que acaba de recibir su clave: la activa,
 * verifica un escrito, guarda una sentencia en una carpeta, exporta el dossier,
 * crea una alerta y mira su factura. Comprueba el resultado en el DOM después
 * de cada paso, no solo que la página cargue.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as esperar } from 'node:timers/promises';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const CLAVE = readFileSync(process.argv[3] ?? 'C:\\Users\\juank\\AppData\\Local\\Temp\\clave.txt', 'utf8').trim();
// Puerto y perfil nuevos en cada pasada: si Chrome de una ejecución anterior
// sigue vivo, el nuevo no puede abrir el puerto y la prueba acaba hablando con
// el navegador viejo, que está en otra página. Pasó, y despistó un buen rato.
const SELLO = Date.now().toString(36).slice(-5);
const PUERTO = 9400 + (Date.now() % 500);
// Nombre distinto en cada pasada: si no, la segunda vez la resolución ya está
// guardada y el paso de guardar no probaría nada.
const NOMBRE_CARPETA = `Asunto de prueba ${Date.now().toString(36).slice(-4)}`;
// El titular se lee de la propia clave: dar por hecho un correo concreto hacía
// que la prueba fallara al usar una licencia distinta, sin que nada estuviera mal.
const TITULAR = JSON.parse(
  Buffer.from(CLAVE.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
).correo;

const ESCRITO = `AL JUZGADO

FUNDAMENTOS DE DERECHO

PRIMERO.- Resulta de aplicación la doctrina de la STS 564/2014, de 14 de octubre
(ECLI:ES:TS:2014:3877), sobre suspensión de la pensión de alimentos.

SEGUNDO.- En igual sentido, ROJ: STS 3877/2014 y la SAP B 3695/2026.

TERCERO.- Cita a efectos de prueba: STS 999999/2023 y ECLI:ES:TS:1999:999999.`;

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PUERTO}`,
  '--window-size=1400,1000',
  '--no-first-run',
  `--user-data-dir=${process.env.TEMP}\\chrome-pro-${SELLO}`,
  'about:blank',
]);

const fallos = [];
const pasos = [];

function comprobar(nombre, condicion, detalle = '') {
  if (condicion) {
    pasos.push(`  OK     ${nombre}`);
  } else {
    pasos.push(`  FALLO  ${nombre}${detalle ? ` — ${detalle}` : ''}`);
    fallos.push(nombre);
  }
}

let ws;
let id = 0;
const pendientes = new Map();

function enviar(method, params) {
  return new Promise((res) => {
    const n = ++id;
    pendientes.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

async function evaluar(expresion) {
  const r = await enviar('Runtime.evaluate', {
    expression: `(async () => { ${expresion} })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? 'error'));
  }
  return r.result?.result?.value;
}

async function ir(ruta) {
  await enviar('Page.navigate', { url: `${BASE}${ruta}` });
  await esperar(2600);
}

try {
  let objetivo = null;
  for (let i = 0; i < 40 && !objetivo; i += 1) {
    await esperar(400);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json();
      objetivo = lista.find((t) => t.type === 'page');
    } catch {
      /* aún arrancando */
    }
  }
  if (!objetivo) throw new Error('Chrome no ha abierto ninguna página');

  ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = pendientes.get(m.id);
    if (p) {
      pendientes.delete(m.id);
      p(m);
    }
  };
  await enviar('Page.enable', {});
  await enviar('Runtime.enable', {});

  // ---------------------------------------------------------------- 1. Pro
  await ir('/pro');
  const sinLicencia = await evaluar(`return document.body.innerText.includes('Ya tengo una clave');`);
  comprobar('La página de cuenta ofrece activar una clave', sinLicencia === true);

  await evaluar(`
    const input = document.querySelector('#clave');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(input, ${JSON.stringify(CLAVE)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  `);
  await evaluar(`document.querySelector('.forma-clave button[type=submit]').click(); return true;`);
  await esperar(2200);

  const textoPro = await evaluar(`return document.body.innerText;`);
  comprobar('La licencia se activa y se muestra como válida', textoPro.includes('Licencia válida'));
  comprobar('Aparece el titular de la licencia', textoPro.includes(TITULAR), `esperaba ${TITULAR}`);
  comprobar('Aparece el enlace a la factura', textoPro.includes('Ver y descargar'));
  comprobar('Las herramientas Pro se marcan como activas', (await evaluar(`return document.querySelectorAll('.cupo-activo').length;`)) >= 4);

  // ------------------------------------------------------- 2. Verificación
  await ir('/verificar');
  await evaluar(`
    const t = document.querySelector('#escrito');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(t, ${JSON.stringify(ESCRITO)});
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  `);
  const sinCuota = await evaluar(`return document.body.innerText.includes('Plan gratuito');`);
  comprobar('Siendo Pro no aparece el aviso de cuota gratuita', sinCuota === false);

  await evaluar(`
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Comprobar las citas'));
    b.click(); return true;
  `);

  // Cada cita es una consulta real a CENDOJ: hay que darle tiempo.
  let citas = 0;
  for (let i = 0; i < 45; i += 1) {
    await esperar(2000);
    citas = await evaluar(`return document.querySelectorAll('.cita-resultado').length;`);
    const acabado = await evaluar(`return document.body.innerText.includes('Copiar el informe');`);
    if (acabado) break;
  }
  const textoVerif = await evaluar(`return document.body.innerText;`);
  comprobar('Comprueba las 6 citas del escrito', citas === 6, `encontradas ${citas}`);
  comprobar('Detecta al menos una cita confirmada', textoVerif.includes('Confirmada'));
  comprobar('Marca como ambigua la referencia con doble lectura', textoVerif.includes('Ambigua'));
  comprobar('Marca como sin localizar la cita falsa', textoVerif.includes('Sin localizar'));
  comprobar('No usa nunca la palabra «inventada»', !textoVerif.toLowerCase().includes('inventada'));
  comprobar('Ofrece copiar el informe', textoVerif.includes('Copiar el informe'));

  // --------------------------------------------------- 3. Guardar en carpeta
  await ir('/buscar?q=' + encodeURIComponent('ECLI:ES:TS:2014:3877'));
  for (let i = 0; i < 25; i += 1) {
    await esperar(1500);
    if ((await evaluar(`return document.querySelectorAll('.resultado').length;`)) > 0) break;
  }
  const hayResultado = await evaluar(`return document.querySelectorAll('.resultado').length;`);
  comprobar('El buscador devuelve la resolución buscada', hayResultado > 0);

  await evaluar(`
    const b = [...document.querySelectorAll('.guardar-carpeta > button')][0];
    b.click(); return true;
  `);
  await esperar(600);
  await evaluar(`
    const i = document.querySelector('.guardar-menu input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, ${JSON.stringify(NOMBRE_CARPETA)});
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  `);
  await evaluar(`document.querySelector('.guardar-menu form button[type=submit]').click(); return true;`);
  await esperar(900);
  // Se comprueba el estado del botón, no el mensaje: el mensaje se autocierra
  // a los 1,2 s y la comprobación entraba en carrera con él.
  const guardada = await evaluar(`
    return [...document.querySelectorAll('.guardar-carpeta > button')].some((b) => b.textContent.includes('Guardada'));
  `);
  comprobar('Guarda la resolución en una carpeta nueva', guardada === true);

  // ------------------------------------------------------- 4. Carpetas
  await ir('/carpetas');
  const textoCarp = await evaluar(`return document.body.innerText;`);
  comprobar('La carpeta aparece con su nombre', textoCarp.includes(NOMBRE_CARPETA));
  comprobar('La ficha guardada trae su ECLI', textoCarp.includes('ECLI:ES:TS:2014:3877'));
  comprobar('Compone la cita para pegar', textoCarp.includes('Tribunal Supremo'));

  await evaluar(`
    const d = [...document.querySelectorAll('details')].find((x) => x.textContent.includes('Ver cómo queda'));
    if (d) d.open = true; return true;
  `);
  await esperar(400);
  const previa = await evaluar(`return (document.querySelector('.vista-previa')||{}).innerText || '';`);
  comprobar('La vista previa del dossier lleva el aviso de fuente', previa.includes('CENDOJ'));
  comprobar('La vista previa lleva el ECLI', previa.includes('ECLI:ES:TS:2014:3877'));

  // -------------------------------------------------------- 5. Alertas
  await ir('/alertas');
  const textoAl = await evaluar(`return document.body.innerText;`);
  comprobar('Siendo Pro, las alertas no salen bloqueadas', !textoAl.includes('función de Pro'));
  comprobar('Explica por qué la comprobación es manual', textoAl.includes('no se revisan solas'));

  // -------------------------------------------------------- 6. Factura
  await ir('/factura');
  const textoFac = await evaluar(`return document.body.innerText;`);
  comprobar('La factura sale a nombre del titular', textoFac.includes(TITULAR), `esperaba ${TITULAR}`);
  comprobar('La base imponible es 238,80 €', textoFac.includes('238,80'));
  comprobar('El IVA calculado es 50,15 €', textoFac.includes('50,15'));
  comprobar('El total es 288,95 €', textoFac.includes('288,95'));
  comprobar('Dice que el gasto es deducible', textoFac.includes('deducible'));

  // --------------------------------------------- 7. Volver a plan gratuito
  await ir('/pro');
  await evaluar(`
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Quitar la licencia'));
    b.click(); return true;
  `);
  await esperar(1200);
  const trasQuitar = await evaluar(`return document.body.innerText.includes('Ya tengo una clave');`);
  comprobar('Se puede quitar la licencia y se vuelve al plan gratuito', trasQuitar === true);

  await ir('/alertas');
  const alSinPro = await evaluar(`return document.body.innerText.includes('función de Pro');`);
  comprobar('Sin licencia, las alertas vuelven a estar bloqueadas', alSinPro === true);
} catch (e) {
  fallos.push(`excepción: ${e.message}`);
  pasos.push(`  FALLO  excepción durante la prueba — ${e.message}`);
} finally {
  console.log('\n' + pasos.join('\n'));
  console.log(`\n  ${pasos.length - fallos.length} de ${pasos.length} comprobaciones correctas.`);
  if (fallos.length > 0) console.log(`  FALLAN: ${fallos.join(' · ')}`);
  writeFileSync('resultado-pro.txt', pasos.join('\n'));
  try {
    ws?.close();
  } catch {}
  chrome.kill();
  process.exit(fallos.length > 0 ? 1 : 0);
}
