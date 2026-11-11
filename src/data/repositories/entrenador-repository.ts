import { File, Paths } from 'expo-file-system';
 
// Sin login, el "entrenador" es solo un apodo guardado en el teléfono.
// Cuando llegue Supabase Auth, cambia este repositorio y nada más.
const archivo = new File(Paths.document, 'apodo.txt');
 
export const entrenadorRepository = {
  async leerApodo(): Promise<string | null> {
    if (!archivo.exists) return null;
    const texto = (await archivo.text()).trim();
    return texto || null;
  },
 
  guardarApodo(apodo: string): void {
    if (!archivo.exists) archivo.create();
    archivo.write(apodo.trim());
  },
 
  olvidarApodo(): void {
    if (archivo.exists) archivo.delete();
  },
};
