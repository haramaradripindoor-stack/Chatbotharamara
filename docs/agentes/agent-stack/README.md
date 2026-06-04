# Agent Stack — diseño antes que código

Sistema para arrancar proyectos (tipo SaaS web: Next.js + Supabase) generando **todo el
diseño en markdown** y los **prompts de tus 11 agentes** ya rellenados, antes del primer commit.

Tres formas de usarlo, una misma fuente de verdad:

## 1. App generadora  (`app/generador.html`)
Ábrela en el navegador (doble clic, funciona offline). Llena el contexto del proyecto **una vez**
y obtienes: los documentos `.md` de diseño, los prompts de cada agente rellenados, el prompt
maestro y el checklist del día de arranque. Botones para copiar cada bloque, **descargar el `.zip`**
con la estructura de carpetas, y **exportar/importar** la configuración (`project.config.json`).

## 2. Pack de plantillas + scaffold  (este repo)
```
agent-stack/
├─ scaffold.mjs                 # genera un proyecto nuevo desde templates/
├─ scaffold.sh                  # wrapper (node scaffold.mjs)
├─ project.config.example.json  # variables del proyecto (forma = export de la app)
├─ MASTER-PROMPT.md             # prompt maestro de orquestación
├─ app/generador.html           # copia de la app
└─ templates/
   ├─ CLAUDE.md  README.md  .gitignore  .env.example
   └─ docs/design/
      ├─ 00-CONTEXT … 07-PERFORMANCE, DESIGN-DECISIONS, ROADMAP, CHANGELOG
      └─ agents/  (cto.md … orchestrator.md, MASTER-PROMPT.md)
```
**Crear un proyecto:**
```bash
cp project.config.example.json project.config.json   # edítalo
#  …o exporta project.config.json desde la app generadora
./scaffold.sh project.config.json
# crea ../<slug-del-proyecto>/ con todos los .md rellenados
```

## 3. Prompt maestro  (`MASTER-PROMPT.md`)
Para cuando solo quieres pegar y arrancar: un prompt que pone al CTOAgent a orquestar
el pipeline completo. Diseño por fases, aprobación requerida, sin código hasta aprobar.

## El método (de tus 3 documentos)
- **Pipeline 7 fases:** Pensar → Datos → UX → Backend → Frontend → QA → Security → Performance.
- **11 agentes** en 4 niveles + 1 coordinador. Un prompt, un rol, un output.
- **Reglas de oro:** no programar sin diseño aprobado · no mezclar roles · QA y Security no se saltan · pasar el output entre agentes.

> Regla #1: el costo de cambiar un diseño es cero; el de reescribir código mal diseñado es enorme.
