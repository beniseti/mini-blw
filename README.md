# 🥑 Bocaditos BLW

Mini app web móvil (PWA) para hacer el seguimiento de la **alimentación complementaria con el método BLW** (Baby-Led Weaning) a partir de los 6 meses.

Los datos se guardan en una **base de datos SQLite en tu propio servidor** (por ejemplo, tu NAS) y se comparten entre todos los dispositivos de casa. La app se instala en el móvil y **sigue funcionando sin conexión**: los cambios se envían solos al servidor cuando vuelve la red.

> ⚠️ Esta app es una ayuda orientativa y no sustituye el consejo de tu pediatra.

<p align="center">
  <img src="docs/inicio.png" width="200" alt="Pantalla de inicio">
  <img src="docs/plan.png" width="200" alt="Plan de comidas">
  <img src="docs/alimentos.png" width="200" alt="Catálogo de alimentos">
  <img src="docs/aviso-alergeno.png" width="200" alt="Aviso de alérgeno nuevo">
</p>

## Funcionalidades

- **Catálogo de ~100 alimentos** en 7 categorías, con emoji, edad mínima orientativa (6, 7–8 o 9+ meses), consejo de preparación para BLW (y otro para cuando ya hace la pinza), alérgenos y si es rico en hierro 🩸.
- **Plan de comidas**: 1 o 2 alimentos nuevos al día, con los alérgenos solos y separados, respetando su edad. Si un día no se puede, se **aplaza** y el resto del plan se mueve.
- **Registro de pruebas**: fecha, si le gustó (👍 / 😐 / 👎), reacción (ninguna / leve / preocupante) y notas. Se pueden editar y borrar.
- **Estado visual** de cada alimento y **barras de progreso** global y por categoría.
- **Control de alérgenos**: aviso (no bloqueante) si introduces un alérgeno nuevo a menos de 3 días de otro.
- **Sección «Evitar»**: alimentos a evitar antes del año, riesgo de atragantamiento y consejos de seguridad.
- **Perfil del bebé**: calcula su edad y resalta los alimentos adecuados.
- **Buscador y filtros**, **historial** cronológico y **copia de seguridad** en JSON (exportar / importar / borrar todo).
- **Base de datos SQLite** en el servidor, **sincronizada entre dispositivos**, con indicador de estado (☁️ Guardado · ⏳ Pendiente · 📴 Sin conexión).
- **PWA** instalable y usable sin conexión.

## Plan de comidas

En la pestaña **Plan** (y en la tarjeta «Plan de hoy» del inicio):

1. **Crea el plan** eligiendo **1 o 2 alimentos nuevos al día** y la fecha de inicio. Se planifican todos los alimentos que aún no ha probado:
   - primero los recomendados para empezar (ricos en hierro, verduras y frutas), y después el resto alternando categorías;
   - **cada alérgeno nuevo va solo ese día** y con **al menos 3 días** de separación de otro alérgeno nuevo (incluidos los que ya hayas introducido);
   - cada alimento aparece cuando el bebé tiene la **edad mínima** (las uvas, por ejemplo, a partir de los 9 meses). Si aún no tiene 6 meses, el plan empieza cuando los cumpla.
2. **Registra** cada alimento desde el plan: se abre la ficha con el formulario listo. Cualquier prueba de ese alimento, hecha desde donde sea, lo marca como hecho.
3. **¿Hoy no se puede?** Pulsa **«Hoy no puedo: aplazar a mañana»**. Los alimentos pendientes de ese día pasan al siguiente y **todo el plan se mueve un día**, así se mantiene la separación entre alérgenos. También puedes aplazar un día futuro.
4. **¿Te has saltado varios días?** Aparece un aviso con **«Empezar lo pendiente hoy»**, que mueve todo lo pendiente para que continúe desde hoy.
5. Puedes **quitar** un alimento del plan (✕), **rehacerlo** desde hoy (por ejemplo, para pasar de 2 a 1 al día) o **borrarlo**. Las pruebas registradas nunca se borran.

Si un alérgeno del plan coincide con otro introducido hace menos de 3 días (por ejemplo, porque lo diste fuera del plan), el plan te avisa para que lo aplaces.

El orden de los primeros alimentos se puede cambiar en **`src/data/plan.ts`**.

## Cómo funciona

```
 Móvil / PC (navegador)                    Servidor (Docker en tu PC o NAS)
┌──────────────────────────┐   /api/sync   ┌──────────────────────────────────┐
│ App React (PWA)          │ ────────────▶ │ Node + Hono                      │
│ · caché local + cola de  │ ◀──────────── │ · sirve la app                   │
│   cambios sin conexión   │  estado total │ · SQLite (node:sqlite) en /data  │
└──────────────────────────┘               └──────────────────────────────────┘
```

- Cada cambio se aplica al instante en pantalla y se guarda en una **cola local**. La app la envía al servidor en cuanto puede: al momento, al recuperar la conexión, al volver a la app y cada minuto.
- El servidor aplica los cambios en una **transacción SQLite**, sin repetir los que ya recibió, y devuelve el estado completo.
- Si una prueba se borró en un dispositivo, otro que estaba sin conexión no la «resucita».
- Si ya usabas la versión anterior (datos solo en el navegador), la primera vez esos datos **se suben solos** al servidor.

## Probarlo en tu PC

### Opción A: con Docker (igual que en el NAS)

Necesitas **Docker Desktop** abierto.

```bash
git clone https://github.com/beniseti/mini-blw.git
```
```bash
cd mini-blw
```
```bash
docker compose up -d --build
```

Abre **http://localhost:8080**. La primera vez que arranca, el servidor **crea la base de datos y la rellena con datos de ejemplo**: un bebé «Lucía (demo)» de 7 meses y unas 17 pruebas con fechas recientes. Puedes verlo en los logs:

```bash
docker compose logs bocaditos
```
```
🆕 Base de datos creada en /data/bocaditos.db (esquema v1)
🧪 Rellenada con datos de ejemplo (SEED_DEMO_DATA=true)
🥑 Bocaditos BLW escuchando en http://localhost:8080
```

- **Parar** (los datos se conservan):

```bash
docker compose down
```

- **Empezar de cero con datos de ejemplo nuevos.** La opción `-v` borra el volumen con la base de datos:

```bash
docker compose down -v
```
```bash
docker compose up -d
```

Para probar la sincronización, abre la app en dos navegadores (o en el PC y en el móvil, con `http://IP-de-tu-PC:8080`): lo que registres en uno aparece en el otro.

### Opción B: con Node.js (para modificar el código)

Necesitas **Node.js 22.13 o superior** (recomendado: la versión LTS de https://nodejs.org).

```bash
npm install
```
```bash
npm run dev
```

Abre **http://localhost:5173**. Esto arranca dos cosas a la vez:

- **La app con Vite**, con recarga en caliente.
- **El servidor API** en el puerto 8787. Crea `data/bocaditos.db` con datos de ejemplo la primera vez y se reinicia solo al editar `server/`.

Para empezar de cero, borra la carpeta `data/`.

Para probar la versión compilada (igual que en producción, en http://localhost:8080):

```bash
npm run build
```
```bash
npm run start:demo
```

| Comando              | Qué hace                                                                   |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run dev`        | App (Vite) + servidor API con base de datos de ejemplo                     |
| `npm test`           | Tests (servidor, base de datos, sincronización, alérgenos, edad, catálogo…) |
| `npm run lint`       | Linter (oxlint)                                                            |
| `npm run build`      | Comprueba tipos y compila la app (`dist/`) y el servidor (`dist-server/`)  |
| `npm start`          | Arranca la versión compilada (base de datos vacía si es nueva)             |
| `npm run start:demo` | Igual, pero con datos de ejemplo si la base de datos es nueva              |

## Desplegar en el NAS (Docker)

> 🔒 **La app no tiene contraseña**: cualquiera que llegue a la URL puede ver y modificar los datos. Úsala **solo dentro de tu red de casa o a través de una VPN** (Tailscale, WireGuard, la VPN del NAS…). **No abras el puerto 8080 a Internet** ni la publiques con un proxy inverso abierto al exterior.

1. **Copia el proyecto al NAS**, por ejemplo en `/volume1/docker/bocaditos`. Puedes usar `git clone` por SSH, o descargar el ZIP desde GitHub y subirlo con File Station.
2. **Desactiva los datos de ejemplo**: en `docker-compose.yml` cambia `SEED_DEMO_DATA: "true"` por **`"false"`**. Solo afecta a cuando se crea la base de datos; si se te olvida, puedes vaciarla desde la app con *Perfil → Borrar todo*.
3. **Arráncalo**:
   - **Synology (Container Manager):** *Proyecto → Crear*, elige la carpeta del paso 1 y la app detecta el `docker-compose.yml`. Pulsa *Siguiente → Hecho*. La primera vez compila la imagen (unos minutos).
   - **QNAP, Unraid, TrueNAS u otro con SSH:** entra por SSH en la carpeta y ejecuta:

```bash
docker compose up -d --build
```

4. Abre **http://IP-del-NAS:8080** (por ejemplo `http://192.168.1.20:8080`). Si el 8080 está ocupado, cambia `"${PORT:-8080}:8080"` por, por ejemplo, `"8095:8080"`.

**Actualizar** a una versión nueva del código. Los datos están en el volumen y se conservan:

```bash
git pull
```
```bash
docker compose up -d --build
```

### HTTPS: para instalarla en el móvil y usarla sin conexión

Por `http://IP-del-NAS:8080` la app funciona y sincroniza, pero los navegadores **solo permiten instalar la PWA y usar el modo sin conexión con HTTPS**. Opciones:

- **Synology:** *Panel de control → Portal de inicio de sesión → Avanzado → Proxy inverso*. Crea una regla de `https://bocaditos.tu-dominio` a `http://localhost:8080` y asígnale un certificado de Let's Encrypt (*Seguridad → Certificado*). Si es para usarla solo en casa, no abras ese puerto en el router.
- **Tailscale:** con `tailscale serve` obtienes HTTPS dentro de tu red privada, sin abrir puertos.
- **Caddy incluido en el compose** (necesita un dominio que apunte al NAS):

```bash
DOMAIN=bocaditos.midominio.com docker compose --profile https up -d --build
```

### Variables de entorno

| Variable         | Por defecto (Docker) | Descripción                                                              |
| ---------------- | -------------------- | ------------------------------------------------------------------------ |
| `SEED_DEMO_DATA` | `true` en el compose | Rellena con datos de ejemplo **solo al crear** la base de datos           |
| `PORT`           | `8080`               | Puerto interno del servidor                                              |
| `DATA_DIR`       | `/data`              | Carpeta de la base de datos                                              |
| `DB_FILE`        | `bocaditos.db`       | Nombre del archivo SQLite                                                |
| `TZ`             | `Europe/Madrid`      | Zona horaria (para las fechas de los datos de ejemplo y los logs)        |

## La base de datos

- Es un único archivo, **`bocaditos.db`**, dentro del volumen Docker `bocaditos_data` (montado en `/data`). Sobrevive a reinicios y actualizaciones del contenedor.
- **Se crea sola** la primera vez que arranca el servidor. Las tablas se crean y actualizan con migraciones versionadas (`server/db.ts`), así que futuras versiones pueden cambiar el esquema sin perder datos.
- Tablas: `profile` (el bebé), `trials` (las pruebas), `plan_items` (el plan de comidas), `deleted_trials` (borrados, para la sincronización), `applied_ops` (cambios ya recibidos) y `meta`.
- Al actualizar a una versión con cambios en el esquema (por ejemplo, la que añadió el plan de comidas), la base de datos existente **se migra sola** al arrancar, sin perder datos.
- Usa el SQLite integrado en Node (`node:sqlite`): no hay dependencias nativas que compilar, así que funciona igual en NAS con procesador Intel/AMD o ARM.

### Copias de seguridad

- **Desde la app:** *Perfil → Exportar datos (JSON)*. Para restaurar, *Importar copia*.
- **El archivo de la base de datos**, con el contenedor parado para que la copia sea coherente:

```bash
docker compose stop
```
```bash
docker compose cp bocaditos:/data/bocaditos.db ./bocaditos-copia.db
```
```bash
docker compose start
```

- **Para que Hyper Backup (u otra herramienta del NAS) copie la base de datos**, guárdala en una carpeta del NAS en lugar del volumen. En `docker-compose.yml` cambia `- bocaditos_data:/data` por `- ./data:/data`, y antes de arrancar da permisos al usuario del contenedor (UID 1000):

```bash
mkdir -p data && sudo chown -R 1000:1000 data
```

## Editar el catálogo de alimentos

Todo el catálogo está en **`src/data/foods.ts`** (el catálogo no se guarda en la base de datos: solo las pruebas). Cada alimento es un objeto así:

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

- `src/data/plan.ts`: orden de los primeros alimentos del plan de comidas.
- `src/data/avoid.ts`: listas de la sección «Evitar» y consejos de seguridad.
- `src/data/categories.ts`: categorías y sus colores pastel.
- `src/data/allergens.ts`: alérgenos y días de espera (`ALLERGEN_WAIT_DAYS = 3`).
- `server/demo.ts`: datos de ejemplo.

Después de editar, ejecuta `npm test`: un test comprueba que el catálogo sigue siendo coherente. Para aplicar los cambios en Docker: `docker compose up -d --build`.

## Estructura del proyecto

```
├─ Dockerfile, docker-compose.yml, deploy/Caddyfile
├─ server/                 servidor Node: API (app.ts), SQLite (db.ts), datos de ejemplo (demo.ts)
├─ scripts/dev.mjs         arranca app + API en desarrollo
├─ public/                 iconos de la PWA
└─ src/
   ├─ data/                catálogo editable (foods.ts), categorías, alérgenos, «Evitar»
   ├─ shared/              validación común a la app y al servidor
   ├─ lib/                 lógica pura y testeada: plan de comidas, edad, progreso, alérgenos, operaciones, fechas
   ├─ store/               estado global, caché local, cola de sincronización y cliente de la API
   ├─ hooks/               enrutado por hash, instalación de la PWA
   ├─ components/          ui/, layout/, foods/, trials/, progress/, plan/
   └─ pages/               Inicio, Plan, Alimentos, Ficha, Historial, Evitar, Perfil
```

## Fuentes

Los consejos se han redactado a partir de recomendaciones generales de alimentación complementaria y seguridad en BLW (Asociación Española de Pediatría, AESAN y guías divulgativas de BLW). Las edades son orientativas: cada bebé tiene su ritmo. Ante cualquier duda o reacción, consulta con tu pediatra. En una emergencia, llama al **112**.
