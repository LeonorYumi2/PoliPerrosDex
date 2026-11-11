import { Accelerometer } from 'expo-sensors';
 
const UMBRAL_CAIDA_LIBRE = 0.35; // g
const DURACION_MINIMA_CAIDA_MS = 120;
const UMBRAL_IMPACTO = 2.2; // g
const VENTANA_IMPACTO_MS = 1000;
 
// Envuelve el sensor y entrega un solo evento: "hubo una caída".
// Quien lo usa no necesita saber nada de vectores ni de unidades g.
// Devuelve la función para dejar de escuchar.
export function escucharCaidas(alCaer: () => void): () => void {
  let inicioCaidaLibre: number | null = null;
  let finCaidaLibre: number | null = null;
 
  Accelerometer.setUpdateInterval(40);
  const suscripcion = Accelerometer.addListener(({ x, y, z }) => {
    const magnitud = Math.sqrt(x * x + y * y + z * z);
    const ahora = Date.now();
 
    if (magnitud < UMBRAL_CAIDA_LIBRE) {
      inicioCaidaLibre ??= ahora;
      return;
    }
    if (inicioCaidaLibre !== null) {
      if (ahora - inicioCaidaLibre >= DURACION_MINIMA_CAIDA_MS) finCaidaLibre = ahora;
      inicioCaidaLibre = null;
    }
    if (finCaidaLibre !== null) {
      if (ahora - finCaidaLibre > VENTANA_IMPACTO_MS) finCaidaLibre = null;
      else if (magnitud > UMBRAL_IMPACTO) {
        finCaidaLibre = null;
        alCaer();
      }
    }
  });
 
  return () => suscripcion.remove();
}
