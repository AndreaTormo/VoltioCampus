# API Cargadores Centro Educativo

Backend para reservar los cargadores de coches eléctricos de un centro educativo.

## Tecnologías
- Node.js + Express
- PostgreSQL
- bcrypt, jsonwebtoken

## Instalación

Los comandos de npm se ejecutan desde la raíz del proyecto (`1_Projecte_Final/`), donde está el único `package.json`.

1. Instalar dependencias
```bash
npm install
```

2. Configurar variables de entorno
Copiar `.env.example` a `.env` y configurar los datos de PostgreSQL y JWT_SECRET

3. Crear base de datos
```sql
CREATE DATABASE cargadores_db;
```

4. Crear tablas
```bash
psql -U usuario -d cargadores_db -f Projecte/backend/db/init.sql
```

5. Insertar datos de prueba
```bash
psql -U usuario -d cargadores_db -f Projecte/backend/db/seed.sql
```

En una base de dades existent, aplica també la migració dels horaris setmanals:
```bash
psql -U usuario -d cargadores_db -f Projecte/backend/db/migrate_horarios_usuario.sql
```

## Configuración local en Windows

En este equipo PostgreSQL 18 está instalado en `C:\Program Files\PostgreSQL\18`.
La configuración local usa el usuario `postgres` y la base `cargadores_db`.

```bash

`.env` local de referencia:

```env
PORT=3051
DB_USER=postgres
DB_HOST=localhost
DB_NAME=""
DB_PASSWORD=""
DB_PORT=5432
JWT_SECRET=""
```

## Arrancar servidor

Desde la raíz del proyecto (`1_Projecte_Final/`):
```bash
npm start
```

El frontend se sirve en `http://localhost:3051/html/login.html` (o desde la raíz en `http://localhost:3051/`). Las páginas están en `frontend/html/`, los estilos en `frontend/css/` y los módulos JavaScript en `frontend/js/`. Las rutas antiguas de las páginas principales redirigen a las nuevas.

## Usuarios de prueba
Por si quieres utilizarlo, todos usan la contraseña `admin123`.

| Email | Rol |
| --- | --- |
| `admin@centro.edu` | admin |
| `jperez@centro.edu` | profesor |
| `mlopez@centro.edu` | profesor |
| `cmartin@centro.edu` | alumno |
| `afernandez@centro.edu` | alumno |

Estas credenciales son solo para desarrollo local.

## Rutas principales

### Auth
- POST `/api/auth/registro` - Registro
- POST `/api/auth/login` - Login (devuelve token JWT Bearer)

### Usuarios (solo admin)
- GET `/api/usuarios` - Listar usuarios
- POST `/api/usuarios` - Crear usuario
- DELETE `/api/usuarios/:id` - Eliminar usuario

### Horarios de presencia
- GET/PUT `/api/horarios/me` - Consultar o guardar el horario semanal propio
- GET/PUT `/api/horarios/usuarios/:id` - Consultar o guardar el horario de un usuario (solo admin)
- Los intervalos son recurrentes de lunes a viernes; cada bloque de reserva debe quedar completamente dentro de un intervalo.

### Cargadores
- GET `/api/cargadores` - Ver cargadores (autenticado)
- POST `/api/cargadores` - Añadir cargador (solo admin)
- PUT `/api/cargadores/:id/activar` - Activar (solo admin)
- PUT `/api/cargadores/:id/desactivar` - Desactivar (solo admin)

### Festivos
- GET `/api/festivos` - Ver festivos (autenticado)
- POST `/api/festivos` - Añadir festivo (solo admin)
- DELETE `/api/festivos/:id` - Eliminar festivo (solo admin)

### Reservas
- POST `/api/reservas` - Crear reserva (autenticado, con validaciones)
- GET `/api/reservas/mis-reservas` - Mis reservas (autenticado)

## Reglas
- 4 cargadores: 2 profesores, 2 alumnos
- Horarios: Bloque 1 08:00-11:00, recreo 11:00-11:30, Bloque 2 11:30-14:00
- Lunes-Viernes. Fines de semana y festivos desactivados
- Un único bloque por día
- Preferencia grupo propio, uso cruzado si no hay libre
- Prioridad: quien nunca ha creado reserva primero. Desempate: más tiempo sin cargar
- Reinicio curso: borrar BD manualmente con psql (no se borran cargadores)
- JWT con Authorization: Bearer
