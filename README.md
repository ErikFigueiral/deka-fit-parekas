# Deka Fit Parejas

Cronometro web para Deka Fit por parejas, pensado para movil y escritorio, publicado como sitio estatico en GitHub Pages.

## Tutorial rapido para gente que no quiere lios

1. Abre el enlace de la web desde WhatsApp o Safari.
2. Si quieres, escribe los nombres de Persona 1 y Persona 2.
3. Puedes poner foto, pero no es obligatorio.
4. Revisa el recorrido. En cada prueba puedes marcar quien la hace: Persona 1, Persona 2, Ambos o nadie.
5. Pulsa **Empezar**.
6. Cuando termine cada prueba, pulsa **Pasar prueba**.
7. Si te equivocas, usa **Volver prueba** o **Editar tiempo**.
8. Si paras un momento, pulsa **Pausar**. El boton cambia de color para que se vea claro.
9. Al terminar salen el total, parciales, esfuerzo por persona y peso de cada prueba.
10. Pulsa **Descargar XML** para guardar tus tiempos y usarlos otro dia como comparativa.
11. Pulsa **Captura PNG** si quieres mandar el resumen bonito por WhatsApp.

## Como comparar con una sesion anterior

1. En una sesion terminada descarga el XML.
2. Otro dia abre la web.
3. Pulsa **Cargar anterior**.
4. Selecciona ese XML.
5. Al acabar la nueva prueba veras donde mejoras y donde empeoras.

## Importante

Esta app no tiene backend ni base de datos. Eso es intencionado para que sea facil y privada:

- Los datos se guardan en el movil con `localStorage`.
- Las sesiones importantes se guardan descargando XML.
- Las fotos no se suben a ningun servidor.
- Si cambias de movil, conserva el XML descargado.

## Estructura mantenible

```text
index.html          estructura de la pagina
css/styles.css      todo el diseño responsive
js/data.js          estaciones y reglas de Deka
js/storage.js       guardado local
js/export.js        XML, JSON, PNG y texto
js/app.js           cronometro e interaccion
img/logo.svg        logo local
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
