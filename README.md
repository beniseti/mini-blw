# 🥑 Bocaditos BLW

Mini app web móvil (PWA) para hacer el seguimiento de la **alimentación complementaria con el método BLW** (Baby-Led Weaning) a partir de los 6 meses. Funciona sin conexión, se instala en el móvil y guarda todo **solo en tu dispositivo** (sin servidor ni cuentas).

> ⚠️ Esta app es una ayuda orientativa y no sustituye el consejo de tu pediatra.

<p align="center">
  <img src="docs/inicio.png" width="240" alt="Pantalla de inicio">
  <img src="docs/alimentos.png" width="240" alt="Catálogo de alimentos">
  <img src="docs/aviso-alergeno.png" width="240" alt="Aviso de alérgeno nuevo">
</p>

## Funcionalidades

- **Catálogo de ~100 alimentos** en 7 categorías (verduras, frutas, proteínas, cereales y féculas, lácteos, grasas y frutos secos, hierbas y especias). Cada uno tiene emoji, edad mínima orientativa (6, 7–8 o 9+ meses), consejo de preparación para BLW (y una variante para cuando ya hace la pinza), alérgenos y si es rico en hierro 🩸.
- **Registro de pruebas**: fecha, si le gustó (👍 / 😐 / 👎), reacción (ninguna / leve / preocupante) y notas. Se puede probar un alimento muchas veces, y editar o borrar cada prueba.
- **Estado visual** de cada alimento (no probado, probado, reacción leve o preocupante) con barras de progreso global y por categoría.
- **Control de alérgenos**: si registras un alérgeno nuevo a menos de 3 días de haber introducido otro, aparece un aviso (no bloqueante). En el inicio verás qué alérgenos ya se han introducido y hasta cuándo conviene esperar.
- **Sección «Evitar»**: alimentos a evitar antes del año, alimentos con riesgo de atragantamiento (con la forma segura de ofrecerlos) y consejos de seguridad.
- **Perfil del bebé**: nombre y fecha de nacimiento. La app calcula su edad y resalta los alimentos adecuados (borde lila), atenuando los que aún no tocan.
- **Buscador y filtros** por categoría, estado, alérgeno, «rico en hierro» y «adecuados para su edad».
- **Historial** cronológico agrupado por día.
- **Copia de seguridad**: exportar / importar en JSON y borrar todos los datos (con confirmación).
- **PWA**: instalable, funciona sin conexión y avisa cuando hay una versión nueva.

## Tecnologías

React 19 · Vite 8 · TypeScript · Tailwind CSS 4 · vite-plugin-pwa (Workbox) · Vitest · localStorage.

## Desarrollo local

Requisitos: **Node.js 20.19+ (recomendado 22)** y npm.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Para probar desde el móvil en la misma red: `npm run dev -- --host` y abre la IP que aparece.

Otros comandos:

| Comando           | Qué hace                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `npm test`        | Tests unitarios (regla de alérgenos, edad, progreso, importación, catálogo) |
| `npm run lint`    | Linter (oxlint)                                                   |
| `npm run build`   | Comprueba tipos y genera la versión de producción en `dist/`      |
| `npm run preview` | Sirve `dist/` en http://localhost:4173 (aquí sí funciona el service worker) |

> El service worker solo se activa en la versión compilada (`build` + `preview`), no en `npm run dev`.

## Despliegue con Docker

La imagen compila la app (ejecutando antes los tests) y la sirve con **nginx sin privilegios** en el puerto **8080**. La imagen final pesa unos 90 MB.

### Con Docker Compose (recomendado)

```bash
docker compose up -d --build
```

Abre http://localhost:8080. Para usar otro puerto:

```bash
PORT=3000 docker compose up -d --build
```

Actualizar tras cambiar el código o el catálogo:

```bash
docker compose up -d --build
```

Parar:

```bash
docker compose down
```

### Con Docker a secas

```bash
docker build -t bocaditos-blw .
```

```bash
docker run -d --name bocaditos-blw -p 8080:8080 --restart unless-stopped bocaditos-blw
```

El contenedor expone `/healthz` y tiene `HEALTHCHECK`, así que `docker ps` mostrará `(healthy)`.

### HTTPS (necesario para instalarla en el móvil)

Los navegadores solo permiten instalar una PWA y usar el service worker con **HTTPS** (o en `localhost`). Si vas a abrirla desde el móvil en tu propio servidor, ponle HTTPS delante. Opciones:

**a) Caddy incluido en el compose** (certificado de Let's Encrypt automático). Necesitas un dominio que apunte a tu servidor y los puertos 80 y 443 abiertos:

```bash
DOMAIN=bocaditos.midominio.com docker compose --profile https up -d --build
```

**b) Tu proxy inverso de siempre** (Nginx Proxy Manager, Traefik, Cloudflare Tunnel, Tailscale…): apúntalo a `http://<servidor>:8080`.

### Qué configura nginx (`nginx.conf`)

- `sw.js`, `index.html` y el manifiesto **sin caché**, para que las actualizaciones lleguen siempre.
- Ficheros de `/assets/` (con hash en el nombre) con caché de un año.
- Compresión gzip, tipo MIME correcto para `manifest.webmanifest` y cabeceras de seguridad (CSP, `X-Frame-Options`, `nosniff`…).

## Despliegue en Netlify o Vercel

La app es estática y usa rutas con `#`, así que no necesita reglas de redirección. Ya se incluyen `netlify.toml` y `vercel.json` con las cabeceras de caché del service worker. Ambos sirven con HTTPS, así que la app se puede instalar directamente.

### Netlify

- **Desde Git:** sube el proyecto a GitHub/GitLab, en Netlify elige *Add new site → Import an existing project* y selecciona el repositorio. La configuración (`npm run build`, carpeta `dist`, Node 22) se lee de `netlify.toml`.
- **Desde la terminal:**

```bash
npm run build
```

```bash
npx netlify-cli deploy --prod --dir=dist
```

### Vercel

- **Desde Git:** en Vercel elige *Add New → Project*, importa el repositorio y despliega (detecta Vite automáticamente).
- **Desde la terminal:**

```bash
npx vercel --prod
```

## Instalar en el móvil

1. Abre la URL (con HTTPS) en el móvil.
2. **iPhone (Safari):** botón Compartir → «Añadir a pantalla de inicio».
3. **Android (Chrome):** menú ⋮ → «Instalar aplicación» (o el botón «Instalar app» de la pestaña Perfil).

Tras la primera visita funciona sin conexión.

## Editar el catálogo de alimentos

Todo el catálogo está en **`src/data/foods.ts`**. Cada alimento es un objeto así:

```ts
{
  id: 'platano',                 // único, en minúsculas; no lo cambies si ya hay pruebas guardadas
  name: 'Plátano',
  emoji: '🍌',
  category: 'frutas',            // verduras | frutas | proteinas | cereales | lacteos | grasas | hierbas
  minAge: 6,                     // 6 (6 m), 7 (7–8 m) o 9 (9+ m)
  prep: 'Maduro, por la mitad con parte de la piel como mango…',
  prep9m: 'Rodajas o trocitos.', // opcional: cuando ya hace la pinza
  allergens: ['gluten'],         // opcional: huevo | pescado | gluten | lacteos | cacahuete | frutos_secos | sesamo | soja | marisco
  iron: true,                    // opcional: rico en hierro
  note: '…',                     // opcional: advertencia
}
```

Otros datos editables:

- `src/data/avoid.ts`: listas de «Evitar antes del año», «Riesgo de atragantamiento» y consejos de seguridad.
- `src/data/categories.ts`: nombres, emojis y colores pastel de las categorías.
- `src/data/allergens.ts`: alérgenos y días de espera entre alérgenos nuevos (`ALLERGEN_WAIT_DAYS = 3`).

Después de editar, ejecuta `npm test`: un test comprueba que los ids no se repiten y que categorías, edades y alérgenos son válidos.

## Datos y privacidad

- Todo se guarda en el `localStorage` del navegador (clave `bocaditos-blw:v1`), solo en ese dispositivo. No se envía nada a ningún servidor.
- La app pide al navegador almacenamiento persistente para que no borre los datos automáticamente. Aun así, **exporta una copia de vez en cuando** (Perfil → Exportar datos).
- Si borras los datos del navegador, o usas otro navegador o móvil, no verás tus datos hasta importar la copia.

Formato del archivo de copia:

```json
{
  "app": "bocaditos-blw",
  "exportedAt": "2026-11-07T10:00:00.000Z",
  "version": 1,
  "profile": { "name": "Lucía", "birthDate": "2026-04-01" },
  "trials": [
    {
      "id": "…",
      "foodId": "huevo",
      "date": "2026-11-06",
      "liked": "like",
      "reaction": "none",
      "notes": "Tortilla francesa en tiras",
      "createdAt": "2026-11-06T10:00:00.000Z"
    }
  ]
}
```

Importar **sustituye** todos los datos actuales, y la app pide confirmación antes. Los registros no válidos se descartan y se avisa de cuántos.

## Estructura del proyecto

```
├─ Dockerfile, nginx.conf, docker-compose.yml, deploy/Caddyfile
├─ netlify.toml, vercel.json
├─ public/                 iconos de la PWA y favicon
└─ src/
   ├─ data/                catálogo editable (foods.ts), categorías, alérgenos, «Evitar»
   ├─ lib/                 lógica pura y testeada: edad, estado/progreso, regla de alérgenos, fechas, filtros
   ├─ store/               persistencia en localStorage + estado global (Context + useReducer)
   ├─ hooks/               enrutado por hash, instalación de la PWA
   ├─ components/          ui/, layout/, foods/, trials/, progress/
   └─ pages/               Inicio, Alimentos, Ficha del alimento, Historial, Evitar, Perfil
```

## Fuentes

Los consejos se han redactado a partir de recomendaciones generales de alimentación complementaria y seguridad en BLW (Asociación Española de Pediatría, AESAN y guías divulgativas de BLW). Las edades son orientativas: cada bebé tiene su ritmo. Ante cualquier duda o reacción, consulta con tu pediatra. En una emergencia, llama al **112**.
