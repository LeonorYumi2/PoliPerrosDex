import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  entrenadorRepository,
  type Entrenador,
} from '@/data/repositories/entrenador-repository';

// ViewModel compartido: gestiona la identidad y autenticación del entrenador.
// Vive en un Context para que la Pokédex, la cámara y el perfil reaccionen
// inmediatamente a cambios de sesión de Supabase Auth sin acoplarse directamente a la API.
export type EstadoApodo = {
  apodo: string | null;
  usuarioId: string | null;
  entrenador: Entrenador | null;
  listo: boolean;
  cargando: boolean;
  error: string | null;
  iniciarSesionConGoogle: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  guardarApodo: (apodo: string) => void;
  olvidarApodo: () => void;
};

const ApodoContext = createContext<EstadoApodo | null>(null);

export function ApodoProvider({ children }: { children: ReactNode }) {
  const [entrenador, setEntrenador] = useState<Entrenador | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;

    // 1. Cargar el usuario actualmente autenticado (si hay sesión persistida)
    entrenadorRepository
      .obtenerActual()
      .then((actual) => {
        if (montado) setEntrenador(actual);
      })
      .catch((e: Error) => {
        if (montado) setError(e.message);
      })
      .finally(() => {
        if (montado) setListo(true);
      });

    // 2. Suscribirse a cambios de estado en Supabase Auth
    const desuscribir = entrenadorRepository.suscribirCambiosAuth((nuevo) => {
      if (montado) {
        setEntrenador(nuevo);
        setListo(true);
      }
    });

    return () => {
      montado = false;
      desuscribir();
    };
  }, []);

  const iniciarSesionConGoogle = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const usuario = await entrenadorRepository.iniciarSesionConGoogle();
      if (usuario) setEntrenador(usuario);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo completar el inicio de sesión con Google',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  const cerrarSesion = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      await entrenadorRepository.cerrarSesion();
      setEntrenador(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar sesión');
    } finally {
      setCargando(false);
    }
  }, []);

  return (
    <ApodoContext.Provider
      value={{
        entrenador,
        apodo: entrenador?.apodo ?? null,
        usuarioId: entrenador?.id ?? null,
        listo,
        cargando,
        error,
        iniciarSesionConGoogle,
        cerrarSesion,
        guardarApodo: () => {},
        olvidarApodo: () => {
          cerrarSesion().catch(() => {});
        },
      }}>
      {children}
    </ApodoContext.Provider>
  );
}

export function useApodo(): EstadoApodo {
  const valor = useContext(ApodoContext);
  if (!valor) throw new Error('useApodo debe usarse dentro de <ApodoProvider>');
  return valor;
}
