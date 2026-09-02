# Lineamientos para Claude Code — "Secret Chat" (mensajería anónima efímera)

> Pegar este documento completo como primer prompt en Claude Code. Está pensado para que Claude Code no arranque escribiendo código de una, sino que primero proponga arquitectura y plan.

---

## 0. Instrucción inicial para Claude Code

Antes de escribir código: leé todo el documento, proponé la estructura de carpetas (frontend/backend), confirmá el plan de fases, y esperá mi OK antes de avanzar a la Fase 2. No sobre-ingenierices la v1.

---

## 1. Concepto del producto

Aplicación web mobile-first de **mensajería anónima y efímera**.

- Sin email, contraseña, teléfono ni cuentas tradicionales.
- Al abrir la app, el backend genera un ID de identidad temporal aleatorio.
- El usuario comparte ese ID manualmente con otra persona (no hay búsqueda ni contactos).
- El ID es válido solo durante la sesión; al terminar, se invalida.
- Chats y mensajes son efímeros y se borran según reglas de expiración configurables.
- Soporte para texto, imágenes, audio y video.
- Estética: privada, minimalista, moderna, confiable — "utilidad segura", no red social.

## 2. Referencia visual

Uso las imágenes adjuntas (mockup de 9 pantallas) como referencia de dirección visual (dark mode, tarjetas redondeadas, bordes sutiles, acentos violeta/púrpura, tipografía clara, navegación compacta). **No copiar literal** — usarlas como inspiración y mejorar la UX donde tenga sentido.

### 2.1 Detalles específicos del mockup a respetar

- **Formato de ID temporal:** alfanumérico con guión, ej. `7K3M-Q9L2` (no UUID crudo). Fácil de leer y dictar en voz alta.
- **Bottom nav de 3 tabs:** Home / Chats / Settings.
- **Preview de media:** acciones "Download", "View once", "Delete" — "View once" es una opción explícita además de descargar/borrar.
- **Menú de attach:** Photo, Video, Audio, Document, Camera.
- **Pantalla de Settings** con secciones:
  - *Privacy:* "Auto-delete chats" (configurable, ej. 5 min) y "Clear all data".
  - *About:* "How it works", "About Secret Chat".
  - Acción destructiva separada: "Log out & erase identity".
- **Lista de chats:** badge de mensajes no leídos, preview del último mensaje, timestamp.
- **Indicadores de chat:** estado online/offline con punto de color, doble check de leído en mensajes propios.

> ⚠️ **Importante — corrección respecto al mockup:** la pantalla "New Chat" del mockup incluye el texto *"Chats are end-to-end encrypted and disappear when you leave"*. **No usar ese texto tal cual.** Ver sección 6 (Requisitos de seguridad) — la v1 no implementa E2EE real, así que ese copy debe cambiarse a algo honesto, por ejemplo: *"Chats are private and disappear when you leave"*. Esto aplica a cualquier pantalla del mockup que mencione "end-to-end encrypted".

## 3. Pantallas principales (mínimo viable)

| # | Pantalla | Elementos clave |
|---|----------|------------------|
| 1 | Welcome / Session | Explicación "sin cuenta", CTA "Start private session", ID temporal generado, copiar/compartir ID |
| 2 | Home | ID actual, CTA "New chat", conversaciones activas, estado de expiración de sesión |
| 3 | New Chat | Input "Enter recipient ID", validación server-side, sin búsqueda/descubrimiento |
| 4 | Chat | Texto, imagen, audio, video/archivo, timestamps, indicador de "efímero", typing indicator, online/offline |
| 5 | Media Preview | Preview antes de enviar, cancelar/enviar |
| 6 | Session End | Explicar que el ID fue invalidado, qué pasa con la conversación, CTA "Start new session" |

## 4. Principios de UX

- Mobile-first, onboarding ultra rápido, cero formularios innecesarios.
- Privacidad explicada en lenguaje simple, sin jerga técnica.
- Nada de features tipo red social (sin feed, sin perfiles públicos).
- Animaciones mínimas y funcionales, no decorativas.
- El comportamiento destructivo/de expiración debe ser explícito en la UI, nunca silencioso.

## 5. Stack técnico sugerido

**Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query.

**Backend:** Node.js + NestJS + Socket.IO (realtime) + REST (gestión de sesión/chat).

**Persistencia (MVP):** en memoria o Redis para datos efímeros. Postgres solo si aporta valor claro — no agregar por defecto.

**Media:** almacenamiento de objetos de vida corta con expiración/borrado automático. Nada de storage permanente.

## 6. Requisitos de seguridad (no negociables)

- IDs de sesión generados con RNG criptográficamente seguro — **nunca secuenciales**.
- No exponer IDs internos de base de datos.
- **Nunca loguear** contenido de mensajes ni de media subida.
- Minimizar metadata almacenada.
- Validar recipient ID en el servidor, no solo en cliente.
- Rate limiting en creación de sesiones y de chats.
- Proteger conexiones WebSocket (auth por token de sesión, no solo por ID).
- Validar tipo y tamaño de archivos subidos.
- Expiración automática de datos efímeros (job/TTL, no manual).
- **No afirmar "end-to-end encrypted" a menos que realmente se implemente E2EE.** Decisión tomada: la v1 **no** implementa E2EE real. Todo copy de UI que mencione cifrado extremo a extremo (incluido el que aparece en el mockup de referencia) debe reemplazarse por lenguaje honesto sobre privacidad y efimeridad — ej. "Private and disappears when you leave" — sin prometer E2EE. E2EE real queda como posible feature futuro, fuera de scope del MVP.

## 7. Plan de desarrollo por fases

1. Estructura del proyecto (monorepo o carpetas separadas frontend/backend).
2. Design system y componentes UI reutilizables.
3. Flujo Welcome/Session + generación de identidad temporal.
4. Flujo New Chat.
5. Mensajería de texto en tiempo real (WebSocket).
6. Ciclo de vida de mensaje/sesión efímera (expiración, borrado).
7. UI de subida de media (imagen/audio/video).
8. Responsive mobile/desktop.
9. Tests (unitarios + al menos un e2e del flujo principal).
10. Manejo de errores production-ready.

**Regla:** antes de un cambio de arquitectura importante, explicar brevemente el trade-off y elegir la solución más simple que sea robusta.

## 8. Criterios de aceptación por fase

Para que Claude Code no "declare terminado" algo a medias, pedirle que cada fase cumpla:

- Fase 3-4: puedo generar dos sesiones en dos pestañas y conectar un chat usando el ID manualmente.
- Fase 5: los mensajes llegan en tiempo real sin refrescar, con reconexión si se cae el socket.
- Fase 6: un mensaje/sesión vencida desaparece de la UI y no es accesible vía API aunque tenga el ID.
- Fase 7-8: funciona correctamente en un viewport de 375px y en desktop.
- Fase 9: tests corren con un solo comando y pasan en CI local.

## 9. Cierre

Al final de cada fase (o del proyecto), pedirle un resumen conciso de:
- Qué se implementó.
- Decisiones de arquitectura tomadas y por qué.
- Cómo correr el proyecto localmente (frontend + backend + Redis si aplica).
- Qué queda pendiente o fuera de scope del MVP.
