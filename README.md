# DAW Practice Lab

Aplicacion web para practicar HTML, CSS, JavaScript, JSP, Servlets y examenes con ejercicios interactivos.

Puedes usarla online aqui:

https://estudiar-daw.onrender.com/

## Que incluye

- Filtro de ejercicios por HTML, CSS, JavaScript, JSP, Servlets y Examen.
- Editor separado por archivos de trabajo. En JSP/Servlets las pestanas se adaptan a `JSP`, `Servlet.java`, `web.xml` o fragmentos relacionados.
- Preview en vivo dentro de un iframe aislado.
- Panel de validacion estructural para ejercicios de JSP y Servlets.
- Ejercicios de construccion, comparacion visual, respuesta escrita y tablas de examen.
- Validaciones automaticas declaradas en JSON.
- Persistencia local del codigo y progreso con `localStorage`.
- Subida de ejercicios JSON desde la interfaz.

## Ejemplo

![Ejemplo de DAW Practice Lab](docs/assets/daw-practice-lab-example-2.png)

## Ejecutar en local

Necesitas Node.js y npm.

```bash
npm install
npm run dev
```

Vite abrira la app en:

```txt
http://127.0.0.1:5173
```

Para generar una build de produccion:

```bash
npm run build
```

## Usar la app

1. Elige un ejercicio en la barra lateral.
2. Escribe tu solucion en las pestanas de HTML, CSS y JavaScript.
3. Pulsa `Ejecutar` para refrescar la preview.
4. Pulsa `Comprobar` para validar tu respuesta.
5. Si el ejercicio tiene objetivo visual, compara tu resultado con el panel de objetivo.

El codigo que escribas y tu progreso se guardan en el navegador. Si cambias de navegador, dispositivo o limpias los datos del sitio, ese progreso local puede desaparecer.

Los ejercicios de JSP y Servlets no se ejecutan en un contenedor Java desde la app. Se practican como codigo estructural y se validan con reglas sobre los archivos escritos.

## Subir ejercicios desde la interfaz

El boton `Subir` permite importar uno o varios archivos `.json` con el formato de ejercicio de la app.

Los ejercicios subidos se guardan en IndexedDB, en una base local del navegador llamada `daw-practice-lab`. No se comparten entre usuarios ni dispositivos.

## Donde van los ejercicios del proyecto

Los ejercicios incluidos en el repositorio viven en:

```txt
public/exercises
```

Cada archivo JSON define un ejercicio. Para que aparezca en la app, anade su nombre a:

```txt
public/exercises/manifest.json
```

La app soporta estos tipos:

- `build`: ejercicio por enunciado, sin objetivo visual obligatorio.
- `visual-match`: ejercicio con preview de tu codigo y preview objetivo lado a lado.
- `written-answer`: pregunta teorica o de codigo sin iframe.
- `table-answer`: pregunta con tabla de opciones cerradas.

## Formato basico de ejercicio

```json
{
  "id": "tema-nombre-corto",
  "topic": "html",
  "type": "build",
  "title": "Titulo breve",
  "difficulty": "base",
  "estimatedMinutes": 15,
  "publishedAt": "2026-05-18T15:36:22+02:00",
  "prompt": "Enunciado del ejercicio",
  "notes": ["Pista opcional"],
  "starterCode": {
    "html": "",
    "css": "",
    "javascript": ""
  },
  "validation": {
    "mode": "all",
    "successMessage": "Ejercicio completado.",
    "rules": []
  }
}
```

`targetCode` es opcional y se usa principalmente en ejercicios `visual-match`.

Valores soportados:

- `topic`: `html`, `css`, `javascript`, `jsp`, `servlets`, `examen`
- `type`: `build`, `visual-match`, `written-answer`, `table-answer`
- `difficulty`: `base`, `media`, `reto`
- `publishedAt`: opcional; muestra la badge `Nuevo` durante 24 horas desde esa fecha ISO.

## Validaciones disponibles

- `contains`: comprueba que un archivo contiene cierto texto.
- `notContains`: comprueba que un archivo no contiene cierto texto.
- `regex`: comprueba un patron con expresion regular.
- `domSelector`: comprueba que el HTML contiene un selector.
- `consoleIncludes`: comprueba texto emitido por `console.log`.
- `keywords`: comprueba conceptos clave en respuestas escritas.
- `tableAnswer`: comprueba celdas de una tabla de respuesta.

Ejemplo:

```json
{
  "type": "domSelector",
  "selector": "h1",
  "message": "Incluye un h1."
}
```

Hay mas ejemplos de esquema en:

```txt
docs/formato-ejercicios.md
```
