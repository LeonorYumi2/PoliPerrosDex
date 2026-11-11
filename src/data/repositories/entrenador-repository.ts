import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../services/supabase-service';

// Informa al navegador que complete la sesión si la app volvió de un redirect OAuth.
WebBrowser.maybeCompleteAuthSession();

export type Entrenador = {
  id: string;
  apodo: string;
  email?: string;
  avatarUrl?: string;
};

// Parsea tanto query params (?code=...) como hash fragments (#access_token=...)
function extraerParametrosDeUrl(url: string): {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string;
} {
  const resultado: {
    accessToken?: string;
    refreshToken?: string;
    code?: string;
    error?: string;
  } = {};

  try {
    const indiceHash = url.indexOf('#');
    const indiceQuery = url.indexOf('?');

    const fragmento = indiceHash !== -1 ? url.substring(indiceHash + 1) : '';
    const query =
      indiceQuery !== -1
        ? url.substring(indiceQuery + 1, indiceHash !== -1 ? indiceHash : undefined)
        : '';

    const paramsStr = [query, fragmento].filter(Boolean).join('&');
    const pares = paramsStr.split('&');

    for (const par of pares) {
      const [clave, valor] = par.split('=');
      if (!clave) continue;
      const decodificado = decodeURIComponent(valor ?? '');
      if (clave === 'access_token') resultado.accessToken = decodificado;
      if (clave === 'refresh_token') resultado.refreshToken = decodificado;
      if (clave === 'code') resultado.code = decodificado;
      if (clave === 'error_description' || clave === 'error') {
        resultado.error = decodificado;
      }
    }
  } catch (e) {
    console.warn('Error al parsear parámetros de la URL:', e);
  }

  return resultado;
}

function mapearUsuarioAEntrenador(usuario: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}): Entrenador {
  const meta = usuario.user_metadata ?? {};
  const apodo =
    meta.full_name ||
    meta.name ||
    (usuario.email ? usuario.email.split('@')[0] : 'Entrenador');

  return {
    id: usuario.id,
    apodo,
    email: usuario.email,
    avatarUrl: meta.avatar_url || meta.picture,
  };
}

export const entrenadorRepository = {
  async obtenerActual(): Promise<Entrenador | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    return mapearUsuarioAEntrenador(session.user);
  },

  async iniciarSesionConGoogle(): Promise<Entrenador | null> {
    // Genera la URL de retorno de deep link (ej. poliperrodex://)
    console.log('INICIANDO LOGIN CON GOOGLE');
    const redirectUrl = Linking.createURL('/');
    console.log('REDIRECT URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw new Error(`Error al iniciar autenticación con Google: ${error.message}`);
    }

    if (!data?.url) {
  throw new Error('Supabase no devolvió una URL válida para iniciar sesión');
}
console.log('GOOGLE AUTH URL:', data.url);

// Abre el navegador del sistema o pestaña personalizada de Chrome
const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (resultado.type === 'success' && resultado.url) {
      const params = extraerParametrosDeUrl(resultado.url);

      if (params.error) {
        throw new Error(`Error devuelto por el proveedor: ${params.error}`);
      }

      // Si Supabase responde con flujo PKCE (code)
      if (params.code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(
          params.code,
        );
        if (codeError) {
          throw new Error(`No se pudo canjear el código de sesión: ${codeError.message}`);
        }
      } else if (params.accessToken && params.refreshToken) {
        // Si Supabase responde con tokens directos
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        if (sessionError) {
          throw new Error(`No se pudo fijar la sesión: ${sessionError.message}`);
        }
      }

      return await this.obtenerActual();
    }

    // Si el usuario canceló o cerró la ventana
    return null;
  },

  async cerrarSesion(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Error al cerrar sesión: ${error.message}`);
  },

  suscribirCambiosAuth(callback: (entrenador: Entrenador | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        callback(mapearUsuarioAEntrenador(session.user));
      } else {
        callback(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  // Métodos de compatibilidad con el diseño previo del proyecto
  async leerApodo(): Promise<string | null> {
    const actual = await this.obtenerActual();
    return actual?.apodo ?? null;
  },

  guardarApodo(_apodo: string): void {
    // La sesión e identidad ahora son administradas por Supabase Auth
  },

  olvidarApodo(): void {
    this.cerrarSesion().catch((e) => console.warn('Error al cerrar sesión:', e));
  },
};
