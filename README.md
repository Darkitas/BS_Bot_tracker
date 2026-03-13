# BS Bot Tracker

Bot de seguimiento para comunidades de WhatsApp orientado a moderacion por inactividad.

## Objetivo

El proyecto busca identificar miembros inactivos (sin mensajes en un periodo configurable) y generar reportes para que el admin tome decisiones manuales.

## Alcance actual

- Registro de actividad por usuario y grupo (quien escribe y cuando).
- Reporte de inactivos por ventana de tiempo (por ejemplo, 60 dias).
- Mensajes automaticos de bienvenida para nuevos miembros en grupos definidos.
- Operacion sin expulsiones automaticas (las acciones son manuales por seguridad).

## Lo que no mide

- No identifica de forma fiable quien solo lee mensajes.
- El criterio principal de actividad es escritura en chat.

## Stack tecnico

- Node.js + TypeScript
- Baileys (`@whiskeysockets/baileys`)
- SQLite (`better-sqlite3`)
- `dotenv` para configuracion
- `pino` para logging

## Estructura base

- `src/config`: configuracion y logger
- `src/core`: arranque de aplicacion
- `src/services`: servicios de dominio (tracking/reportes)
- `auth/`: sesion de WhatsApp (local)
- `data/`: base de datos SQLite
- `reports/`: salidas de reportes

## Estado del proyecto

Estado: esqueleto inicial listo.

Ya existe:

- Configuracion base (`.env.example`).
- Script de desarrollo, build y typecheck.
- Bootstrap inicial y servicios placeholder.

Pendiente:

- Conexion real a WhatsApp con Baileys.
- Persistencia de eventos de mensajes en SQLite.
- Generacion de reportes de inactivos.
- Flujo de bienvenida por entrada al grupo.

## Configuracion rapida

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
copy .env.example .env
```

3. Elegir modo de ejecucion en `.env`:

- `RUNTIME_MODE=local` para pruebas sin WhatsApp.
- `RUNTIME_MODE=whatsapp` para escuchar eventos reales.

Si usas vinculacion por codigo, configura tambien:

- `USE_PAIRING_CODE=true`
- `PAIRING_PHONE_NUMBER=CODIGOPAISNUMERO` (solo digitos, sin `+`)

Opcional para bienvenida y comandos:

- `WELCOME_ENABLED=true`
- `WELCOME_GROUP_IDS=12345@g.us,67890@g.us` (vacio = todos los grupos)
- `WELCOME_TEMPLATE=Texto de bienvenida...` (usa `\\n` para saltos de linea)
- `COMMAND_PREFIX=!`
- `REPORT_COMMAND_KEYWORD=reporte`

4. Validar tipos:

```bash
npm run typecheck
```

5. Ejecutar en desarrollo:

```bash
npm run dev
```

## Como probar sin celular

Puedes validar el core del bot (tracking + reporte) con datos simulados locales.

1. Ejecutar prueba local completa:

```bash
npm run check:local
```

2. Revisar resultados generados:

- Base de datos: `data/tracker.db`
- Reportes: `reports/inactive_*.txt` y `reports/inactive_*.csv`

Este flujo no requiere WhatsApp ni vinculacion de numero, y sirve para verificar que el proyecto guarda actividad y genera reporte de inactivos correctamente.

## Scripts disponibles

- `npm run dev`: desarrollo con recarga
- `npm run build`: compila a `dist/`
- `npm run start`: ejecuta compilado
- `npm run typecheck`: chequeo de tipos
- `npm run clean`: elimina `dist/`
- `npm run simulate`: genera datos simulados y reporte local
- `npm run check:local`: typecheck + simulacion local

## Comandos en WhatsApp

Cuando `RUNTIME_MODE=whatsapp` este activo, el bot escucha en grupos:

- `reporte`
- `reporte 60`
- `!reporte`
- `!reporte 30`

El bot responde con resumen y adjunta el reporte en CSV y TXT.

## Bienvenida automatica

Cuando entra una persona al grupo (`group-participants.update` con accion `add`):

- El bot envia mensaje de bienvenida con menciones.
- Incluye la plantilla configurada en `WELCOME_TEMPLATE`.
- Si `WELCOME_GROUP_IDS` tiene valores, solo se aplica en esos grupos.

## Notas operativas

- Usar numero dedicado para la sesion del bot.
- Mantener respaldos de `auth/` y `data/`.
- No automatizar expulsiones masivas para reducir riesgo operativo.

## Roadmap corto

1. Implementar capa de base de datos y migracion inicial.
2. Conectar eventos de mensajes y participantes.
3. Crear comando de reporte (inactivos por N dias).
4. Exportar reporte a archivo de texto/CSV.
5. Ajustar mensajes de bienvenida por grupo.
