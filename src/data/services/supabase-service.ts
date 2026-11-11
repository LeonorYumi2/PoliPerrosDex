import { createClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { env } from './env';

// Adaptador de almacenamiento local usando expo-file-system para persistir
// la sesión de Supabase Auth en dispositivos móviles sin librerías externas.
const storageAuth = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    try {
      const nombreLimpio = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const archivo = new File(Paths.document, `sb_${nombreLimpio}.json`);
      if (!archivo.exists) return null;
      const texto = (await archivo.text()).trim();
      return texto || null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    try {
      const nombreLimpio = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const archivo = new File(Paths.document, `sb_${nombreLimpio}.json`);
      if (!archivo.exists) archivo.create();
      archivo.write(value);
    } catch (e) {
      console.warn('No se pudo guardar la sesión de autenticación:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    try {
      const nombreLimpio = key.replace(/[^a-zA-Z0-9_-]/g, '_');
      const archivo = new File(Paths.document, `sb_${nombreLimpio}.json`);
      if (archivo.exists) archivo.delete();
    } catch (e) {
      console.warn('No se pudo eliminar la sesión de autenticación:', e);
    }
  },
};

// Service: envuelve una fuente de datos externa y nada más.
// No guarda estado ni transforma datos; eso le toca al repositorio.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: storageAuth,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export function urlPublica(ruta: string): string {
  return supabase.storage.from(env.bucket).getPublicUrl(ruta).data.publicUrl;
}

export async function subirImagen(ruta: string, bytes: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from(env.bucket)
    .upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
}
