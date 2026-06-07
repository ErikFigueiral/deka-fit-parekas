# Deka Fit Parejas

Cronometro web para Deka Fit por parejas, pensado para movil y escritorio, publicado como sitio estatico en GitHub Pages.

## Tutorial rapido para gente que no quiere lios

1. Abre el enlace de la web desde WhatsApp o Safari.
2. Si quieres, escribe los nombres de Persona 1 y Persona 2.
3. Puedes poner foto, pero no es obligatorio.
4. Revisa el recorrido. En cada prueba puedes marcar quien la hace: Persona 1, Persona 2, Ambos o nadie.
5. Pulsa **Empezar**.
6. La web abre `workout.html`, que es la pantalla limpia de cronometro.
7. Cuando termine cada prueba, pulsa **Pasar prueba**.
8. Si te equivocas, usa **Volver prueba** o **Editar tiempo**.
9. Si paras un momento, pulsa **Pausar**. El boton cambia de color para que se vea claro.
10. Al terminar salen el total, parciales, ritmo y picos, esfuerzo por persona, peso de cada prueba y comparativa si cargaste XML.
11. Pulsa **Guardar intento** para guardar tus tiempos y usarlos otro dia como comparativa.
12. Pulsa **PNG normal** o **PNG comparativo** si quieres mandar el resumen por WhatsApp.

## Como comparar con una sesion anterior

1. En una sesion terminada guarda el intento.
2. Otro dia abre la web.
3. Pulsa **Cargar anterior**.
4. Selecciona el archivo guardado.
5. Al acabar la nueva prueba veras donde mejoras y donde empeoras.
6. Tambien puedes pulsar **Comparar anterior** en el resumen si prefieres cargar el intento al final.
7. Las mejoras salen en verde y los empeoramientos en rojo.

## Como ver progreso con varios intentos

1. Guarda un intento cada vez que hagas la prueba.
2. Pulsa **Ver progreso**.
3. Selecciona varios archivos guardados a la vez.
4. La web los ordena por fecha y dibuja una grafica de progreso del total.

## Importante

Esta app no tiene backend ni base de datos. Eso es intencionado para que sea facil y privada:

- Los datos se guardan en el movil con `localStorage`.
- Si el movil se duerme o recargas durante la prueba, `workout.html` recupera la sesion y calcula el tiempo con reloj real.
- Las sesiones importantes se guardan descargando un archivo `.xml`.
- Las fotos no se suben a ningun servidor.
- Si cambias de movil, conserva el XML descargado.

## Estructura mantenible

```text
index.html          preparacion, nombres, recorrido y carga de XML
workout.html        cronometro y resumen
css/styles.css      todo el diseño responsive
js/data.js          estaciones y reglas de Deka
js/storage.js       guardado local
js/export.js        XML, PNG normal, PNG comparativo y texto
js/app.js           cronometro e interaccion
img/                logo, avatares e ilustraciones
```

## GitHub Pages

Para publicarlo:

1. Sube este repo a GitHub.
2. Ve a **Settings**.
3. Entra en **Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona rama `main` y carpeta `/root`.
6. Guarda.
7. GitHub te dara un enlace tipo `https://usuario.github.io/deka-fit-parekas/`.

Ese enlace es el que hay que mandar por WhatsApp, no el archivo `.html`.
