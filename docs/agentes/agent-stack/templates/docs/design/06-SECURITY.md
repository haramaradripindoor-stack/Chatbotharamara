# 06 · Seguridad — {{PROJECT_NAME}}

**Fase:** Security · **Agente:** SecurityAgent · **No negociable antes de deploy.**

Roles: {{ROLES}}
Datos sensibles: {{SENSITIVE_DATA}}

## Vulnerabilidades (por severidad)
| Severidad (crítica/alta/media/baja) | Vulnerabilidad | Vector de ataque | Estado |
|---|---|---|---|
| | | | |

## Checklist de señales de alerta
- [ ] Cada tabla sensible tiene políticas RLS activas
- [ ] No hay `SELECT *` sin filtro de usuario
- [ ] No hay endpoints sin verificación de sesión
- [ ] Service key no se usa en el cliente
- [ ] `.env` está en `.gitignore`, sin keys hardcodeadas
- [ ] No hay escalación de privilegios posible
- [ ] Nada sensible llega al frontend que no deba
