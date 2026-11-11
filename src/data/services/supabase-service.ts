import { createClient } from '@supabase/supabase-js';
 
import { env } from './env';
 
// Service: envuelve una fuente de datos externa y nada más.
// No guarda estado ni transforma datos; eso le toca al repositorio.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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
