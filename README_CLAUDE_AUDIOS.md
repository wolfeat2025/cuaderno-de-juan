# Voces de Juan · integración ElevenLabs

Actualizado: 14 de noviembre de 2026. Service worker: **cuaderno-v11**.

## Qué está implementado

Los diez MP3 entregados por Fabián están en `audios/juan/`, conservados sin recodificar. Tres pertenecen a Corazón, cuatro a Comidas y tres a Actividades/Cuidados. Reemplazan la voz sintética del dispositivo en las explicaciones de Juan.

- `js/visuales.js`: un único elemento Audio persistente, fuera del DOM que se repinta. Escuchar empieza la pista; Pausar conserva la posición; Continuar reanuda. El evento `ended` pasa a la siguiente explicación del mismo tema. La última termina sin volver al inicio.
- `js/recorridos.js`: guion y cuatro tiempos de inicio por pista (tres partes + recorrido completo). Los tiempos proceden de alineación con transcripción local de los MP3 entregados, no de repartir la duración por porcentajes.
- `audios/juan/timings.json`: tabla de tiempos, duración y texto de referencia. Los guiones 04–10 contienen la última revisión, con menos repetición de «mira».
- `sw.js`: precarga las diez pistas; sirve peticiones Range, incluidos rangos parciales y de sufijo, desde el audio completo en caché. No devuelve index.html para un MP3 ausente.

La posición visual se deriva de `audio.currentTime` en `timeupdate`; al pausar, cambiar de concepto, tocar una parte, cerrar la explicación, navegar o esconder la app se detiene/pausa según la acción. Una nueva reproducción invalida los callbacks antiguos. Si el navegador bloquea el avance con voz, se pide tocar Continuar. Los errores dejan disponibles la lectura y la animación.

El audio y la animación comienzan al tocar Escuchar. Ver animación conserva un recorrido visual sin narración. No hay reproducción de voz al abrir la página.

## Mapa de archivos

| Tema | Archivos |
|---|---|
| Corazón | 01_corazon_bombeo.mp3, 02_corazon_cuidados.mp3, 03_corazon_recuperacion.mp3 |
| Comidas | 04_comidas_azucar.mp3, 05_comidas_sal.mp3, 06_comidas_grasas.mp3, 07_comidas_cuidarme.mp3 |
| Actividades | 08_actividad_de_a_poco.mp3, 09_actividad_mi_pauta.mp3, 10_actividad_controles.mp3 |

Tamaño conjunto aproximado: 7,4 MB. Duraciones: 40–49 segundos por pista. Para recibir toda la versión sin conexión hay que abrirla con internet y dejar que termine la descarga de recursos. La disponibilidad depende de que el navegador conserve la caché.

## Verificación y límites

Se comprobaron sintaxis ES2021, decodificación/duración de los diez MP3 en Chromium y 22 verificaciones de reproducción/interacción con la DB sustituida por datos ficticios. Cuatro casos Range del service worker pasaron sin red. Los originales y las copias se comparan por hash antes de entregar.

El WebKit de automatización de este equipo no pudo decodificar el primer MP3; esa comprobación no pasó y no se presenta como validación de Safari. Chromium sí decodificó las diez pistas. La prueba en iPhone real sigue pendiente.

La alineación automática ayuda a localizar los comienzos de párrafo; la aceptación perceptual final en iPhone/PC corresponde a Fabián. No confundir estas comprobaciones con una escucha humana completa o una prueba física de iOS. No se ha cambiado la configuración clínica ni probado con datos familiares reales.

## Qué debe probar Fabián

1. Juan → Entender mi corazón → Escuchar. Confirmar voz, partes, vista completa y paso a Cuidados.
2. Pausar unos segundos y Continuar. Tocar otra parte, Siguiente y Volver a Hoy; comprobar que no se superpongan voces.
3. Juan → Comidas → ¿Por qué importa? → Azúcar/Sal/Grasas/Cuidarme. Revisar que voz y dibujos correspondan.
4. Actividades y cuidados: las tres pistas. La última de cada tema debe terminar sin reiniciarse.
5. Después de cargar con internet, probar una explicación en modo avión.

## Al retomar o reemplazar audios

Leer también `CONTINUAR.md` y `CORRECCIONES_UI.md` del proyecto. Cambiar un MP3 requiere volver a medir sus cuatro transiciones, actualizar el texto si cambió y subir la versión del service worker para renovar la caché. No ejecutar los antiguos instaladores de `work/` del chat: son artefactos de desarrollo y pueden restaurar estados anteriores.

Conservar el diseño existente, el perfil Juan de consulta y las indicaciones médicas cargadas. La evaluación nutricional automática de cualquier receta casera sigue pendiente: esta entrega trata de narración educativa y sincronización.
