import { File } from 'expo-file-system';

import type { Avistamiento } from '@/domain/models/avistamiento';

import { subirImagen, supabase, urlPublica } from '../services/supabase-service';

type FilaAvistamiento = {
  id: string;
  perro_id: string;
  usuario_id?: string | null;
  apodo: string;
  foto_path: string;
  latitud: number;
  longitud: number;
  creado_en: string;
  perro: { nombre: string } | null;
};

const COLUMNAS_CON_USUARIO =
  'id, perro_id, usuario_id, apodo, foto_path, latitud, longitud, creado_en, perro:perros(nombre)';
const COLUMNAS_BASE =
  'id, perro_id, apodo, foto_path, latitud, longitud, creado_en, perro:perros(nombre)';

function aDominio(fila: FilaAvistamiento): Avistamiento {
  return {
    id: fila.id,
    perroId: fila.perro_id,
    nombrePerro: fila.perro?.nombre ?? 'Perro desconocido',
    usuarioId: fila.usuario_id ?? undefined,
    apodo: fila.apodo,
    fotoUrl: urlPublica(fila.foto_path),
    latitud: fila.latitud,
    longitud: fila.longitud,
    creadoEn: fila.creado_en,
  };
}

// No usamos signal.throwIfAborted(): existe en los navegadores, pero el
// AbortSignal de React Native no la trae y fallaría en el teléfono.
function cortarSiSeCancelo(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('Captura cancelada');
}

export type NuevaCaptura = {
  perroId: string;
  usuarioId?: string;
  apodo: string;
  fotoUri: string;
  latitud: number;
  longitud: number;
};

export const avistamientosRepository = {
  async listar(perroId?: string): Promise<Avistamiento[]> {
    // Intentamos primero con usuario_id si la columna ya existe en la base de datos
    let consulta = supabase
      .from('avistamientos')
      .select(COLUMNAS_CON_USUARIO)
      .order('creado_en', { ascending: false });
    if (perroId) consulta = consulta.eq('perro_id', perroId);

    const respuesta = await consulta;
    let data: unknown[] | null = respuesta.data;
    let error = respuesta.error;

    // Si la columna usuario_id aún no ha sido agregada por el usuario en Supabase,
    // reintentamos con las columnas base para no quebrar la vista.
    if (error && error.message?.includes('usuario_id')) {
      let consultaBase = supabase
        .from('avistamientos')
        .select(COLUMNAS_BASE)
        .order('creado_en', { ascending: false });
      if (perroId) consultaBase = consultaBase.eq('perro_id', perroId);
      const resBase = await consultaBase;
      data = resBase.data;
      error = resBase.error;
    }

    if (error)
      throw new Error(`No se pudieron cargar los avistamientos: ${error.message}`);
    return (data as unknown as FilaAvistamiento[]).map(aDominio);
  },

  async perrosCapturadosPor(identificadorUsuario: string, apodoAlternativo?: string): Promise<Set<string>> {
    // Busca avistamientos registrados por el usuario_id del usuario autenticado,
    // o por el apodo para mantener compatibilidad con capturas previas.
    try {
      let consulta = supabase.from('avistamientos').select('perro_id');
      if (apodoAlternativo && identificadorUsuario !== apodoAlternativo) {
        consulta = consulta.or(
          `usuario_id.eq.${identificadorUsuario},apodo.eq.${apodoAlternativo}`,
        );
      } else {
        consulta = consulta.or(
          `usuario_id.eq.${identificadorUsuario},apodo.eq.${identificadorUsuario}`,
        );
      }

      const { data, error } = await consulta;
      if (!error && data) {
        return new Set(data.map((fila) => fila.perro_id as string));
      }
    } catch {
      // Ignora y pasa al fallback directo por apodo
    }

    const { data, error } = await supabase
      .from('avistamientos')
      .select('perro_id')
      .eq('apodo', apodoAlternativo ?? identificadorUsuario);

    if (error) throw new Error(`No se pudo revisar tus capturas: ${error.message}`);
    return new Set(data.map((fila) => fila.perro_id as string));
  },

  // Para el ViewModel, "registrar una captura" es una sola operación.
  // Que por dentro sean dos (subir a Storage e insertar en la tabla)
  // es un detalle de datos que el repositorio esconde.
  //
  // El AbortSignal permite que el ViewModel cancele a mitad de camino
  // (por ejemplo, si el teléfono se cae) sin conocer esos dos pasos.
  async registrarCaptura(captura: NuevaCaptura, signal?: AbortSignal): Promise<void> {
    const bytes = await new File(captura.fotoUri).arrayBuffer();
    const aleatorio = Math.random().toString(36).slice(2, 8);
    const ruta = `capturas/${Date.now()}-${aleatorio}.jpg`;

    cortarSiSeCancelo(signal);
    await subirImagen(ruta, bytes);
    cortarSiSeCancelo(signal);

    // Obtener usuario autenticado actual de Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const usuarioId = captura.usuarioId || user?.id;

    const registro: Record<string, unknown> = {
      perro_id: captura.perroId,
      apodo: captura.apodo,
      foto_path: ruta,
      latitud: captura.latitud,
      longitud: captura.longitud,
    };
    if (usuarioId) {
      registro.usuario_id = usuarioId;
    }

    let insercion = supabase.from('avistamientos').insert(registro);
    if (signal) insercion = insercion.abortSignal(signal);

    const { error } = await insercion;

    if (error) {
      // Si el campo usuario_id aún no existe en Supabase, reintentar sin usuario_id
      if (error.message?.includes('usuario_id') && usuarioId) {
        delete registro.usuario_id;
        let insercionFallback = supabase.from('avistamientos').insert(registro);
        if (signal) insercionFallback = insercionFallback.abortSignal(signal);
        const { error: errFallback } = await insercionFallback;
        if (errFallback) {
          throw new Error(`No se pudo guardar el avistamiento: ${errFallback.message}`);
        }
        return;
      }
      throw new Error(`No se pudo guardar el avistamiento: ${error.message}`);
    }
  },
};
