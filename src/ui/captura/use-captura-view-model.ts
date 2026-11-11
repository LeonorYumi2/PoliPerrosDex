import { useCallback, useEffect, useRef, useState } from 'react';

import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import { escucharCaidas } from '@/data/services/acelerometro-service';
import { obtenerUbicacionActual } from '@/data/services/ubicacion-service';
import type { Perro } from '@/domain/models/perro';

export type PasoCaptura = 'listo' | 'fotografiando' | 'ubicando' | 'guardando';

type Parametros = {
  apodo: string;
  usuarioId?: string;
  // Solo escuchamos el acelerómetro mientras la pantalla está a la vista.
  activo: boolean;
};

export function useCapturaViewModel({ apodo, usuarioId, activo }: Parametros) {
  const [perros, setPerros] = useState<Perro[]>([]);
  const [perroId, setPerroId] = useState<string | null>(null);
  const [paso, setPaso] = useState<PasoCaptura>('listo');
  const [error, setError] = useState<string | null>(null);
  const [seCayo, setSeCayo] = useState(false);

  // Un AbortController por captura. Va en una ref y no en un estado porque
  // la función async que ya está corriendo necesita ver el valor actual;
  // un estado quedaría "congelado" con el valor que tenía al empezar.
  const capturaEnCurso = useRef<AbortController | null>(null);

  useEffect(() => {
    perrosRepository
      .listar()
      .then(setPerros)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!activo || seCayo) return;
    // escucharCaidas devuelve la función para soltar el sensor; React la
    // llama al salir de la pantalla, así no se gasta batería en segundo plano.
    return escucharCaidas(() => {
      capturaEnCurso.current?.abort();
      setSeCayo(true);
    });
  }, [activo, seCayo]);

  // Un "comando", como lo llama la guía de Flutter: lo que la vista invoca.
  // La vista le pasa cómo tomar la foto porque la cámara es un componente de
  // interfaz; el ViewModel decide el orden de los pasos y qué hacer con cada uno.
  const capturar = useCallback(
    async (tomarFoto: () => Promise<string | undefined>): Promise<boolean> => {
      if (!perroId) return false;

      const controlador = new AbortController();
      capturaEnCurso.current = controlador;
      setError(null);

      try {
        setPaso('fotografiando');
        const fotoUri = await tomarFoto();
        if (!fotoUri) throw new Error('La cámara no devolvió ninguna foto');
        if (controlador.signal.aborted) return false;

        setPaso('ubicando');
        const { latitud, longitud } = await obtenerUbicacionActual();
        if (controlador.signal.aborted) return false;

        setPaso('guardando');
        await avistamientosRepository.registrarCaptura(
          { perroId, usuarioId, apodo, fotoUri, latitud, longitud },
          controlador.signal,
        );
        return true;
      } catch (e) {
        // Si se canceló por una caída, el aviso ya lo explica: no es un error.
        if (!controlador.signal.aborted) {
          setError(e instanceof Error ? e.message : 'No se pudo completar la captura');
        }
        return false;
      } finally {
        capturaEnCurso.current = null;
        setPaso('listo');
      }
    },
    [perroId, apodo, usuarioId],
  );

  return {
    perros,
    perroId,
    paso,
    error,
    seCayo,
    puedeCapturar: perroId !== null && paso === 'listo' && !seCayo,
    seleccionarPerro: setPerroId,
    capturar,
    cerrarAvisoCaida: () => setSeCayo(false),
  };
}
