#!/usr/bin/env node
/* scaffold.mjs — crea un proyecto nuevo desde templates/ usando un config JSON.
 * Uso:  node scaffold.mjs [project.config.json] [carpeta-destino]
 * El config tiene la MISMA forma que exporta la app generadora (botón "Exportar config").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS = [{"token": "PROJECT_NAME", "field": "projectName", "hint": "nombre-del-proyecto", "isList": false}, {"token": "SLUG", "field": null, "hint": "nombre-del-proyecto", "isList": false}, {"token": "DATE", "field": null, "hint": "AAAA-MM-DD", "isList": false}, {"token": "PROBLEM", "field": "problem", "hint": "una frase — el dolor que resuelves", "isList": false}, {"token": "MVP", "field": "mvp", "hint": "resultado mínimo que ya entrega valor", "isList": false}, {"token": "CLIENT_OR_PERSONAL", "field": "clientOrPersonal", "hint": "cliente / personal / interno", "isList": false}, {"token": "DEADLINE", "field": "deadline", "hint": "fecha concreta (sin fecha = nunca)", "isList": false}, {"token": "USER", "field": "user", "hint": "quién lo usa y en qué contexto", "isList": false}, {"token": "USER_LEVEL", "field": "userLevel", "hint": "bajo / medio / alto", "isList": false}, {"token": "FREQUENCY", "field": "frequency", "hint": "cada cuánto vuelve el usuario", "isList": false}, {"token": "MAIN_ACTION", "field": "mainAction", "hint": "la acción del 80% de las visitas", "isList": false}, {"token": "PLATFORM", "field": "platform", "hint": "mobile / desktop / ambas", "isList": false}, {"token": "ENTITIES", "field": "entities", "hint": "usuarios, proyectos, …", "isList": true}, {"token": "ROLES", "field": "roles", "hint": "admin, operador, …", "isList": true}, {"token": "SENSITIVE_DATA", "field": "sensitiveData", "hint": "RUT, datos financieros, …", "isList": false}, {"token": "VOLUME", "field": "volume", "hint": "filas/usuarios estimados", "isList": false}, {"token": "VOLUME_PROJECTION", "field": "volumeProjection", "hint": "proyección a 12 meses", "isList": false}, {"token": "DOMAIN", "field": "domain", "hint": "el dominio del negocio", "isList": false}, {"token": "DOMAIN_KNOWLEDGE", "field": "domainKnowledge", "hint": "reglas / normativa del dominio", "isList": true}, {"token": "STACK", "field": "stack", "hint": "Next.js 14 + Supabase + TypeScript + Tailwind + Vercel", "isList": false}, {"token": "COLOR_PRIMARY", "field": "colorPrimary", "hint": "#primario", "isList": false}, {"token": "COLOR_SECONDARY", "field": "colorSecondary", "hint": "#secundario", "isList": false}, {"token": "RISKS", "field": "risks", "hint": "lo que podría romperse primero", "isList": true}, {"token": "FEATURE", "field": "feature", "hint": "el módulo que desarrollas ahora", "isList": false}];
const LIST = new Set(TOKENS.filter(t => t.isList && t.field).map(t => t.field));

const cfgPath = process.argv[2] || 'project.config.json';
if (!fs.existsSync(cfgPath)) {
  console.error('No encuentro ' + cfgPath + '. Copia project.config.example.json o expórtalo desde la app.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

function slugify(s='') {
  return (s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()) || 'proyecto';
}
const slug = cfg.slug || slugify(cfg.projectName || '');
const today = new Date().toISOString().slice(0,10);

function val(field) {
  let v = (cfg[field] ?? '').toString().trim();
  if (LIST.has(field) && v) v = v.split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean).join(', ');
  return v;
}
function tokens() {
  const m = {};
  for (const t of TOKENS) {
    if (t.token === 'SLUG') m.SLUG = slug;
    else if (t.token === 'DATE') m.DATE = today;
    else { const v = val(t.field); m[t.token] = v || '_(pendiente)_'; }
  }
  return m;
}
function fill(str, m) {
  return str.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => (k in m ? m[k] : '{{'+k+'}}'));
}

const dest = process.argv[3] || path.join(process.cwd(), '..', slug);
const srcTpl = path.join(__dirname, 'templates');
const M = tokens();

function walk(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) walk(s, d);
    else {
      let body = fs.readFileSync(s, 'utf8');
      if (/\.(md|txt|json)$/.test(entry.name) || entry.name.startsWith('.env')) body = fill(body, M);
      fs.writeFileSync(d, body);
    }
  }
}
walk(srcTpl, dest);
console.log('\n✓ Proyecto creado en: ' + dest);
console.log('  Siguiente: lee CLAUDE.md, ejecuta el Prompt Maestro y NO programes sin diseño aprobado.\n');
