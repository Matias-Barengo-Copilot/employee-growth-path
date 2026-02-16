# Role Permissions Guide - Copilot Work Companion

## Role Mapping

| App Replit (actual) | App Next.js (destino) | Descripcion |
|---|---|---|
| `admin` | `hr` | Administrador de RRHH. Control total sobre la gestion de personas, aprobaciones, y configuracion de la organizacion. |
| `manager` | `supervisor` | Supervisor directo. Ve informacion de sus reportes, aprueba solicitudes, y monitorea el progreso del equipo. |
| `member` | `employee` | Empleado base. Acceso a sus propios datos, puede participar en reconocimiento y feedback entre pares. |

---

## 1. Dashboard / Home

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver su propio dashboard (goals, snaps, XP) | Si | Si | Si |
| Widget de XP y nivel de temporada | Si | Si | Si |
| Cumpleanos proximos del equipo | Si | Si | Si |
| Actividad reciente de la compania | Si | Si | Si |
| Resumen de solicitudes pendientes por aprobar | Si | Si | No |
| Metricas globales de la organizacion (total goals, snaps, feedback) | Si | No | No |
| Panel de acciones administrativas rapidas | Si | No | No |

---

## 2. Team Directory

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver listado de todos los empleados | Si | Si | Si |
| Buscar y filtrar empleados por equipo | Si | Si | Si |
| Ver perfil completo de cualquier empleado | Si | Si | Si |
| Editar datos de cualquier empleado (rol, equipo, estado activo) | Si | No | No |
| Agregar nuevos empleados manualmente | Si | No | No |
| Desactivar/reactivar empleados | Si | No | No |
| Asignar/cambiar supervisor de un empleado | Si | No | No |
| Asignar/cambiar equipo de un empleado | Si | No | No |

---

## 3. Employee Profile

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver su propio perfil completo | Si | Si | Si |
| Editar su propio perfil (titulo, ubicacion, timezone, bio, etc.) | Si | Si | Si |
| Ver perfil de otros empleados | Si | Si | Si |
| Ver goals publicos (visibility: "team") de otros | Si | Si | Si |
| Ver goals con visibility "manager" de sus reportes directos | Si | Si (solo sus reportes) | No |
| Ver goals privados de cualquier empleado | Si | No | No |
| Enviar snap a otro empleado desde su perfil | Si | Si | Si |
| Enviar feedback a otro empleado desde su perfil | Si | Si | Si |
| Editar perfil de otro empleado (datos administrativos) | Si | No | No |

---

## 4. Goals & OKRs

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Crear sus propios goals | Si | Si | Si |
| Editar/actualizar sus propios goals | Si | Si | Si |
| Eliminar sus propios goals | Si | Si | Si |
| Cambiar progreso de sus goals | Si | Si | Si |
| Filtrar goals propios por categoria y estado | Si | Si | Si |
| Ver goals de sus reportes directos (visibility: manager/team) | Si | Si (solo sus reportes) | No |
| Ver goals de equipo (visibility: team) de cualquier empleado | Si | Si | Si |
| Ver todos los goals de toda la organizacion (reporte global) | Si | No | No |
| Crear goals para otros empleados | No | No | No |

---

## 5. Recognition Snaps

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Enviar snaps a cualquier companero | Si | Si | Si |
| Ver snaps recibidos propios | Si | Si | Si |
| Ver snaps enviados propios | Si | Si | Si |
| Ver feed global de snaps de la compania (tab "All") | Si | Si | Si |
| Ver estadisticas globales de reconocimiento | Si | No | No |

**Nota:** Los snaps son una herramienta de reconocimiento entre pares. No requieren aprobacion y todos los roles pueden participar por igual. El valor esta en la cultura de reconocimiento horizontal.

---

## 6. Peer Feedback

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Dar feedback a cualquier companero | Si | Si | Si |
| Solicitar feedback de cualquier companero | Si | Si | Si |
| Ver feedback recibido (propio) | Si | Si | Si |
| Ver feedback enviado (propio) | Si | Si | Si |
| Ver solicitudes de feedback pendientes (propias) | Si | Si | Si |
| Responder solicitudes de feedback | Si | Si | Si |
| Opcion de feedback anonimo | Si | Si | Si |
| Ver todo el feedback dado/recibido entre empleados (reporte) | Si | No | No |
| Ver feedback recibido de sus reportes directos | Si | Si (solo sus reportes) | No |

**Nota:** El feedback anonimo oculta la identidad del remitente al destinatario, pero HR puede ver el remitente real para fines de moderacion si es necesario.

---

## 7. Career Growth Journey

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver su propio career path (fase, XP, streak) | Si | Si | Si |
| Ver sus milestones y completar pasos | Si | Si | Si |
| Crear journal entries | Si | Si | Si |
| Realizar skill assessments | Si | Si | Si |
| Ver sus badges obtenidos | Si | Si | Si |
| Ver radar chart de sus habilidades | Si | Si | Si |
| Ver XP weekly breakdown propio | Si | Si | Si |
| Ver career path de sus reportes directos | Si | Si (solo sus reportes) | No |
| Ver career path de cualquier empleado | Si | No | No |
| Configurar milestones predeterminados para la organizacion | Si | No | No |

---

## 8. Time Off / Leave Management

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver sus propios balances de tiempo libre | Si | Si | Si |
| Crear solicitud de tiempo libre | Si | Si | Si |
| Ver sus propias solicitudes (historial) | Si | Si | Si |
| Cancelar su propia solicitud pendiente | Si | Si | Si |
| Ver tab de "Approvals" (solicitudes pendientes por aprobar) | Si | Si | No |
| Aprobar/rechazar solicitudes de sus reportes directos | Si | Si (solo sus reportes) | No |
| Aprobar/rechazar solicitudes de cualquier empleado | Si | No | No |
| Ver reporte global de ausencias de la organizacion | Si | No | No |
| Ajustar balances de tiempo libre de empleados | Si | No | No |
| Ver calendario de ausencias del equipo | Si | Si (su equipo) | Si (su equipo) |

---

## 9. Activity Feed

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ver feed de actividad de la compania | Si | Si | Si |
| Filtrar actividad por tipo | Si | Si | Si |
| Ver actividad de toda la organizacion | Si | Si | Si |

**Nota:** El activity feed es publico dentro de la organizacion. Todos ven las mismas actividades (snaps, goals completados, nuevos miembros, etc.). Esto fomenta la transparencia y la cultura.

---

## 10. Settings

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Editar su propio perfil | Si | Si | Si |
| Cambiar apariencia (dark/light mode) | Si | Si | Si |
| Configurar notificaciones personales | Si | Si | Si |
| Gestionar configuracion de la organizacion | Si | No | No |
| Gestionar equipos (crear, editar, eliminar) | Si | No | No |
| Gestionar roles de empleados | Si | No | No |

---

## 11. XP & Rewards System

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Ganar XP por acciones propias | Si | Si | Si |
| Ver su nivel de temporada y progreso | Si | Si | Si |
| Ver breakdown semanal de XP | Si | Si | Si |
| Ver bonos de variedad y consistencia | Si | Si | Si |
| Ver ranking/leaderboard de XP de la compania | Si | Si | Si |
| Ver reportes detallados de XP de cualquier empleado | Si | No | No |

---

## 12. AI Coach

| Accion / Elemento | HR (Admin) | Supervisor | Employee |
|---|---|---|---|
| Acceder al AI Coach contextual | Si | Si | Si |
| Recibir sugerencias personalizadas basadas en su rol y goals | Si | Si | Si |

**Nota:** El AI Coach es personal y contextual. Adapta sus respuestas segun el rol, los goals actuales, y la pagina donde se encuentra el usuario.

---

## Pantallas Exclusivas o Secciones por Rol

### Solo HR (Admin)

1. **Panel de Administracion de Empleados** - Gestionar roles, equipos, estado activo/inactivo
2. **Reportes Globales** - Metricas de toda la organizacion (goals, snaps, feedback, XP, ausencias)
3. **Gestion de Equipos** - CRUD de equipos
4. **Ajuste de Balances** - Modificar balances de tiempo libre
5. **Moderacion de Feedback** - Ver remitente real del feedback anonimo
6. **Configuracion Organizacional** - Parametros globales de la app

### Solo Supervisores (y HR)

1. **Tab de Aprobaciones en Time Off** - Aprobar/rechazar solicitudes de reportes directos
2. **Vista de Goals de Reportes** - Ver goals con visibility "manager" de sus reportes
3. **Vista de Career Path de Reportes** - Monitorear el progreso profesional de su equipo
4. **Vista de Feedback de Reportes** - Ver feedback recibido por sus reportes
5. **Solicitudes Pendientes en Dashboard** - Contador de items que requieren su atencion

### Todos los Usuarios (Employee, Supervisor, HR)

1. **Dashboard Personal** - Su propio resumen de actividad, goals y XP
2. **Directorio** - Buscar y ver perfiles de companeros
3. **Goals Propios** - Crear, editar, y trackear sus propios objetivos
4. **Snaps** - Dar y recibir reconocimiento entre pares
5. **Feedback** - Dar, recibir y solicitar feedback
6. **Career Growth** - Su journey personal con milestones, journal, skills y badges
7. **Time Off** - Solicitar tiempo libre y ver sus balances
8. **Perfil/Settings** - Editar su informacion personal y preferencias
9. **Activity Feed** - Ver la actividad de la compania
10. **AI Coach** - Asistente de carrera contextual
11. **Voice Input** - Entrada por voz en todos los campos de texto

---

## Reglas de Implementacion

### Principios Generales

1. **Least Privilege**: Cada rol solo ve y puede hacer lo minimo necesario para su funcion.
2. **Backend Enforcement**: Todas las restricciones de rol se validan en el backend (API routes/middleware). El frontend solo oculta elementos de UI pero NUNCA es la unica capa de seguridad.
3. **Graceful Degradation**: Si un usuario intenta acceder a algo sin permiso via URL directa, recibe un mensaje claro de "No autorizado" en lugar de un error generico.

### Mapeo de Roles para Migracion

Al migrar a la app Next.js con los roles `hr`, `supervisor`, `employee`:

```
Replit App Role  -->  Next.js App Role
admin            -->  hr
manager          -->  supervisor  
member           -->  employee
```

### Middleware de Autorizacion Recomendado

Crear funciones de middleware reutilizables en la app Next.js:

- `requireAuth()` - Requiere usuario autenticado (cualquier rol)
- `requireRole("hr")` - Requiere rol HR
- `requireRole("supervisor")` - Requiere rol supervisor o HR
- `requireSupervisorOf(employeeId)` - Requiere ser supervisor directo del empleado o HR
- `requireSelfOrSupervisor(employeeId)` - Requiere ser el empleado mismo, su supervisor, o HR

### Visibilidad de Goals

- `private`: Solo el empleado dueno y HR
- `manager`: El empleado, su supervisor directo, y HR  
- `team`: Visible para todos los miembros de la compania

### Jerarquia de Permisos

```
HR (admin) > Supervisor > Employee

HR hereda todos los permisos del Supervisor.
Supervisor hereda todos los permisos del Employee.
```

---

## Proximos Pasos

1. Implementar middleware de autorizacion en las API routes de Next.js
2. Agregar checks de rol en cada endpoint del backend
3. Adaptar componentes del frontend para mostrar/ocultar segun rol
4. Agregar tab de "Approvals" condicional en Time Off
5. Crear panel de administracion exclusivo para HR
6. Implementar filtrado de goals por visibilidad segun rol del viewer
7. Agregar vista de reportes directos para supervisores
8. Proteger rutas de Next.js con middleware de autorizacion
