# CLAUDE.md — {{PROJECT_NAME}}

> Manual operativo del proyecto para agentes de IA. Léelo antes de tocar nada.
> Regla #1 del framework: **no se programa sin diseño aprobado.**

## Qué es esto
- **Problema:** {{PROBLEM}}
- **MVP:** {{MVP}}
- **Para:** {{CLIENT_OR_PERSONAL}} · **Entrega:** {{DEADLINE}}
- **Usuario:** {{USER}} (nivel técnico: {{USER_LEVEL}}, frecuencia: {{FREQUENCY}})
- **Acción principal:** {{MAIN_ACTION}}
- **Plataforma:** {{PLATFORM}}

## Stack
{{STACK}}

## Reglas del proyecto (no negociables)
- Imports de Supabase solo desde `@/lib/supabase-client.ts` (cliente) o `@/lib/supabase-server.ts` (servidor).
- En servidor usar `createServerSupabase()`; `createAdminSupabase()` solo cuando se necesitan permisos admin.
- Params de rutas dinámicas son **async** en Next.js 14+.
- No usar `window.location.href`; usar `router.push()` o `window.location.assign()`.
- Naming: **snake_case** en BD, **camelCase** en TS, **PascalCase** en componentes, hooks con prefijo `use`.
- Validar inputs **siempre** antes de consultar la BD. Errores **tipados**, nunca strings genéricos.
- RLS desde el inicio, nunca como afterthought. Nada de `SELECT *` sin filtro de usuario.
- Estados `loading / error / empty / success` presentes en **toda** operación async.
- `.env` **nunca** se commitea. Sin keys en el código ni expuestas al cliente.
- Colores del sistema: {{COLOR_PRIMARY}} / {{COLOR_SECONDARY}}.

## Dónde vive cada cosa
- **Datos / SQL / RLS** → DataArchitectAgent. (`docs/design/02-DATA-MODEL.md`)
- **Lógica de negocio / APIs** → BackendAgent (server). (`docs/design/04-API-SPEC.md`)
- **Presentación / componentes** → FrontendAgent (sin lógica de negocio). (`docs/design/03-UX-FLOWS.md`)
- **Reglas del dominio** → {{DOMAIN}} (DomainBot).

## El equipo de agentes
Pensar → Datos → UX → Backend → Frontend → QA → Security → Performance.
Un prompt, un rol, un output. El output de un agente alimenta al siguiente.
Prompts en `docs/design/agents/`. Orquestación en `docs/design/agents/MASTER-PROMPT.md`.

## Reglas de oro
1. Nunca programar sin diseño aprobado.
2. Nunca mezclar roles en un prompt.
3. No saltarse QA y Security antes de deploy.
4. Pasar el output entre agentes (contexto acumulado).

## Deuda técnica
_(Anota aquí lo que dejas pendiente. Marca en código con `// TODO: revisar con CTOAgent`.)_
