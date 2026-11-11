import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useApodo } from './apodo-view-model';
import { Boton } from './boton';
import { colores, espacio, fuentes, radio } from './tema';
import { Texto } from './texto';

export function FormularioApodo() {
  const { iniciarSesionConGoogle, cargando, error } = useApodo();

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.tarjeta}>
        <View style={estilos.iconoContenedor}>
          <MaterialCommunityIcons name="paw" size={44} color={colores.terracota} />
        </View>

        <Texto variante="titulo" style={estilos.titulo}>
          PoliPerrosDex
        </Texto>

        <Texto variante="subtitulo" style={estilos.subtitulo}>
          ¡Bienvenido, Entrenador!
        </Texto>

        <Texto variante="nota" style={estilos.descripcion}>
          Para registrar y sincronizar tus capturas de los perros del campus
          con tu cuenta personal, inicia sesión con Google a través de Supabase Auth.
        </Texto>

        {error && (
          <View style={estilos.cajaError}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={colores.alerta}
            />
            <Texto style={estilos.textoError}>{error}</Texto>
          </View>
        )}

        {cargando ? (
          <View style={estilos.cargandoContenedor}>
            <ActivityIndicator size="small" color={colores.terracota} />
            <Texto variante="nota">Conectando con Google…</Texto>
          </View>
        ) : (
          <Boton
            titulo="Iniciar sesión con Google"
            onPress={iniciarSesionConGoogle}
          />
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    padding: espacio.l,
    backgroundColor: colores.papel,
  },
  tarjeta: {
    backgroundColor: colores.blanco,
    borderRadius: radio * 2,
    borderWidth: 1.5,
    borderColor: colores.linea,
    padding: espacio.l,
    gap: espacio.m,
    alignItems: 'center',
  },
  iconoContenedor: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colores.papelHondo,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacio.xs,
  },
  titulo: {
    fontFamily: fuentes.titulo,
    textAlign: 'center',
  },
  subtitulo: {
    textAlign: 'center',
  },
  descripcion: {
    textAlign: 'center',
    lineHeight: 20,
    color: colores.tintaSuave,
  },
  cajaError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: colores.alerta,
    borderRadius: radio,
    padding: espacio.s,
    width: '100%',
  },
  textoError: {
    color: colores.alerta,
    flex: 1,
    fontSize: 13,
  },
  cargandoContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.s,
    paddingVertical: espacio.m,
  },
});
