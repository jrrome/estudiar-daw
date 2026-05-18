# Formato de ejercicios

Ejemplo minimo:

```json
{
  "id": "html-lista-semantica",
  "topic": "html",
  "type": "build",
  "title": "Lista semantica",
  "difficulty": "base",
  "estimatedMinutes": 8,
  "publishedAt": "2026-05-18T15:36:22+02:00",
  "prompt": "Crea una lista de recursos con nav, ul, li y enlaces.",
  "notes": ["Usa enlaces reales o # si estas practicando."],
  "starterCode": {
    "html": "<main></main>",
    "css": "",
    "javascript": ""
  },
  "validation": {
    "mode": "all",
    "successMessage": "Lista creada.",
    "rules": [
      {
        "type": "domSelector",
        "selector": "nav ul li a[href]",
        "minCount": 3,
        "message": "Incluye al menos tres enlaces dentro de una lista en nav."
      }
    ]
  }
}
```

Para ejercicios `visual-match`, anade `targetCode`:

```json
{
  "targetCode": {
    "html": "<article class=\"card\">Objetivo</article>",
    "css": ".card { padding: 24px; background: white; }",
    "javascript": ""
  }
}
```

Para preguntas teoricas o de examen que no necesitan iframe, usa
`written-answer`. La respuesta se guarda en los mismos campos `starterCode`,
pero puedes cambiar las etiquetas y el lenguaje de cada pestana:

```json
{
  "type": "written-answer",
  "editor": {
    "labels": {
      "html": "Respuesta",
      "css": "Esquema",
      "javascript": "Notas"
    },
    "languages": {
      "html": "plain",
      "css": "plain",
      "javascript": "plain"
    }
  }
}
```

Para tablas de respuesta cerrada, usa `table-answer` junto con
`tableQuestion`. La tabla se serializa internamente en `starterCode.html`
como JSON, por eso el valor inicial recomendado es `{}`:

```json
{
  "type": "table-answer",
  "tableQuestion": {
    "columns": ["div > p", "div + p"],
    "rows": ["USC", "ETSE"],
    "options": ["N", "R"]
  },
  "starterCode": {
    "html": "{}",
    "css": "",
    "javascript": ""
  }
}
```

Los ejercicios pueden incluir imagenes de referencia en `assets`. Las rutas
relativas se resuelven desde `public/`:

```json
{
  "assets": [
    {
      "src": "exercises/assets/examen25-page-01.jpg",
      "title": "Enunciado original",
      "alt": "Pagina escaneada del examen"
    }
  ]
}
```

Si necesitas simular varios ficheros que alimentan una misma preview, usa
`preview`. Por ejemplo, un ejercicio con `cssBasico.css` en `starterCode.css`
y `cssPos.css` en `starterCode.javascript` puede combinar ambos como CSS y
no ejecutar JavaScript:

```json
{
  "preview": {
    "cssFields": ["css", "javascript"],
    "javascriptFields": []
  }
}
```

## Reglas de validacion

Valores de `topic` soportados:

- `html`
- `css`
- `javascript`
- `jsp`
- `servlets`
- `examen`

Valores de `type` soportados:

- `build`
- `visual-match`
- `written-answer`
- `table-answer`

`publishedAt` es opcional. Si contiene una fecha ISO valida, la app muestra
la badge `Nuevo` durante las primeras 24 horas desde esa fecha.

Los ejercicios de JSP y Servlets usan los mismos campos `starterCode.html`, `starterCode.css` y `starterCode.javascript`, pero la interfaz cambia las etiquetas para que funcionen como archivos de practica. Por ejemplo, en Servlets se usan como `JSP`, `web.xml` y `Servlet.java`. Tambien se desactiva la preview de iframe y se muestra un panel estructural porque el laboratorio no arranca un contenedor Java.

```json
{ "type": "contains", "field": "css", "value": "display: grid", "message": "Usa display grid." }
```

```json
{ "type": "regex", "field": "javascript", "pattern": "addEventListener\\(", "message": "Usa addEventListener." }
```

```json
{ "type": "domSelector", "selector": "form label[for]", "minCount": 3, "message": "Asocia labels a campos." }
```

```json
{ "type": "consoleIncludes", "value": "FizzBuzz", "message": "La consola debe incluir FizzBuzz." }
```

```json
{
  "type": "keywords",
  "field": "html",
  "values": ["JSP", "Java", "JSTL", "taglib"],
  "minMatches": 3,
  "message": "Incluye al menos tres conceptos clave."
}
```

```json
{
  "type": "tableAnswer",
  "answers": {
    "USC": {
      "div > p": "R",
      "div + p": "N"
    }
  },
  "message": "Completa correctamente la tabla."
}
```
