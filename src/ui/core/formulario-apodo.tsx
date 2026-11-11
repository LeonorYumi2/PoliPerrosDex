import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
 
import { useApodo } from './apodo-view-model';
import { Boton } from './boton';
import { colores, espacio, radio } from './tema';
import { Texto } from './texto';
 
// Mismas reglas que el CHECK de la tabla avistamientos. Validar aquí no
// sobra: la app da un mensaje claro y la base de datos protege los datos
// si alguien llama a la API sin pasar por la app.
function validarApodo(texto: string): string | null {
  const apodo = texto.trim();
  if (apodo.length < 3) return 'El apodo debe tener al menos 3 caracteres';
  if (apodo.length > 20) return 'El apodo no puede pasar de 20 caracteres';
  if (!/^[a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚ-]+$/.test(apodo)) {
    return 'Usa solo letras, números, guion o guion bajo (sin espacios)';
  }
  return null;
}
 
export function FormularioApodo() {
  const { guardarApodo } = useApodo();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
 
  function confirmar() {
    const problema = validarApodo(texto);
    if (problema) {
      setError(problema);
      return;
    }
    guardarApodo(texto);
  }
 
  return (
    <View style={estilos.caja}>
      <Texto variante="subtitulo">¿Cómo te llamamos?</Texto>
      <Texto variante="nota">
        Tus capturas quedan a nombre de este apodo. No hay contraseña, así que
        cualquiera podría usar el mismo: por eso más adelante vendrá el login.
      </Texto>
      <TextInput
        value={texto}
        onChangeText={(valor) => {
          setTexto(valor);
          setError(null);
        }}
        placeholder="ej. cazadora_23"
        placeholderTextColor={colores.tintaSuave}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        style={estilos.campo}
        onSubmitEditing={confirmar}
      />
      {error && <Texto style={{ color: colores.alerta }}>{error}</Texto>}
      <Boton titulo="Empezar a capturar" onPress={confirmar} />
    </View>
  );
}
 
const estilos = StyleSheet.create({
  caja: { gap: espacio.m, padding: espacio.l },
  campo: {
    borderWidth: 1.5,
    borderColor: colores.tinta,
    borderRadius: radio,
    paddingHorizontal: espacio.m,
    minHeight: 48,
    fontSize: 16,
    color: colores.tinta,
    backgroundColor: colores.blanco,
  },
});
