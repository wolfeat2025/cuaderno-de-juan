# El cuaderno de Juan

App web familiar (PWA) para cuidar a una persona en la casa: remedios a la hora, mediciones (presión, pulso, azúcar, oxígeno), comidas, turnos, fechas médicas y datos de emergencia. Lo que anota uno lo ven los demás al instante.

- Sin framework ni compilación: HTML, CSS y JavaScript con módulos.
- Datos en Firebase (Firestore, plan gratis), con caché sin conexión.
- Instalable en iPhone ("Agregar a inicio"). Compatible con Safari 15 (iPhone 7).
- Modo claro y oscuro según el iPhone.

> La app no da consejos médicos. Los rangos precargados son generales y provisorios: valen primero las indicaciones del médico.

## 1. Configurar Firebase (una sola vez, unos 10 minutos)

1. Entra a <https://console.firebase.google.com> con una cuenta de Google y toca **Crear un proyecto**. Nombre: `cuaderno-de-juan`. Desactiva Google Analytics y crea el proyecto.
2. Menú izquierdo → **Compilación → Authentication → Comenzar**. En **Método de acceso** elige **Anónimo**, actívalo y guarda.
3. Menú izquierdo → **Compilación → Firestore Database → Crear base de datos**. Ubicación: `southamerica-west1 (Santiago)` si aparece; si no, `southamerica-east1`. Elige **modo de producción** y crea. (La ubicación no se puede cambiar después.)
4. En Firestore, pestaña **Reglas**: borra lo que hay, pega el contenido de [`firestore.rules`](firestore.rules) y toca **Publicar**.
5. Engranaje (arriba a la izquierda) → **Configuración del proyecto** → abajo, **Tus apps** → ícono **`</>`** (Web). Apodo: `cuaderno`. No marques Hosting. Toca **Registrar app**.
6. Copia el bloque `firebaseConfig` que aparece y pégalo en [`js/config.js`](js/config.js), reemplazando los valores vacíos.
7. **Authentication → Configuración → Dominios autorizados → Agregar dominio**: `TU-USUARIO.github.io`.

Esos valores no son secretos: identifican el proyecto. El acceso lo controlan las reglas y el código del link familiar.

## 2. Desplegar en GitHub Pages

El repo se publica desde la rama `main`, carpeta raíz (**Settings → Pages → Deploy from a branch**). Cada `git push` actualiza la app en uno o dos minutos:

```bash
git add -A && git commit -m "Actualiza la app" && git push
```

## 3. Crear el cuaderno e invitar a la familia

1. Abre la app publicada. La primera vez toca **Crear el cuaderno de la familia**: se genera un link con un código largo (`?f=...`).
2. Toca tu nombre y entra a **Agenda → Ajustes**:
   - **Remedios**: cárgalos desde el informe del alta (nombre, dosis, para qué, horarios).
   - **Rangos**: reemplaza los provisorios por los del médico.
   - **Datos de emergencia**: dirección, referencias, antecedentes, alergias, hospital y teléfonos.
3. **Ajustes → Invitar a la familia → Mandar por WhatsApp**. Cada persona abre el link en Safari, toca **Compartir → Agregar a inicio** y elige su nombre.

Importante: la app se debe agregar a inicio **desde el link con el código**. Así el ícono queda apuntando al cuaderno de la familia.

## 4. Seguridad, en una línea

Protege: nadie sin el link puede leer ni escribir, y los códigos no se pueden listar ni adivinar (28 caracteres al azar). No protege: quien tenga el link entra con acceso completo, así que el link es la llave y no se comparte fuera de la familia.

## 5. Respaldo

- Firestore guarda una copia en cada celular (por eso funciona sin señal) y otra en la nube.
- **Ajustes → Respaldo → Hacer respaldo ahora** genera un archivo `.json` con todo. Conviene hacerlo una vez por semana y guardarlo en el correo o en iCloud.
- **Recuperar desde un respaldo** repone los datos del archivo sin borrar lo que ya hay.

## 6. Modelo de datos

Todo vive bajo `/familias/{codigo}/`:

| Colección | Documento | Contenido |
|---|---|---|
| `config` | `app` | remedios, rangos, horas de medir, menú semanal y porciones, datos de emergencia, contactos |
| `config` | `plan-{fecha}` | copia del plan de ese día (remedios, comidas y horas de medir), para que cambiar la configuración no altere el historial |
| `tomas` | `{fecha}_{remedio}_{hora}` | quién dio el remedio y a qué hora (el id fijo evita anotar dos veces la misma toma) |
| `tomas` | `{fecha}_comida_{comida}` | qué comió (todo, una parte o nada), con `clase: 'comida'` |
| `mediciones` | id automático | tipo, valor, momento (azúcar), cómo se siente, nota, quién, hora |
| `compras` | id automático | producto, comprado |
| `turnos` | `{fecha}` | quién acompaña ese día |
| `citas` | id automático | qué es, día, hora, lugar, nota |

## 7. Estructura

```
index.html        armazón y los íconos
css/estilos.css   estilos (claro y oscuro)
js/app.js         arranque, navegación y eventos
js/db.js          Firebase: sesión anónima, Firestore, respaldo
js/datos.js       valores iniciales, rangos y clasificación por colores
js/nucleo.js      estado compartido y aviso "Deshacer"
js/util.js        fechas, actualización del DOM, copiar y compartir
js/plan.js        plan de cada día y copia para el historial
js/vistas/        hoy, medir, comidas, agenda, emergencia, ajustes, resumen (panel y reportes PDF)
sw.js             deja la app guardada para abrir sin señal
firestore.rules   reglas de seguridad
```

Los recordatorios no los hace la app: se usa un calendario compartido de iCloud o las alarmas del Reloj (guía en **Ajustes → Alarmas de los remedios**).

## 8. Resumen y reportes

- **Resumen** (desde Hoy o Medir, y en el menú del computador): panel acumulado con remedios, mediciones, comidas y lo más reciente.
- **Reporte en PDF**: elige un día o una semana y toca **Guardar como PDF**. Se arma en el navegador; no se envía a ningún servidor.
- En cada registro, `ts` es la hora real de lo ocurrido y `creado` es cuándo se anotó.
- Solo quien entra como **Fabián** ve las opciones de administración. Es para simplificar la pantalla a los demás, no una barrera de seguridad.
