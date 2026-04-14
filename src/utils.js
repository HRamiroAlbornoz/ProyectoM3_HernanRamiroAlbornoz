// ============================================================
// utils.js — Funciones utilitarias reutilizables
// ============================================================
// Este archivo contiene funciones pequeñas que se usan en
// distintas partes de la aplicación.
// Al tenerlas acá separadas, el código es más ordenado y
// más fácil de testear con Vitest.
// ============================================================


// ============================================================
// 1. ROTACIÓN DE GIFs DE CLIPPY
// ============================================================

/*
  Lista con los nombres de todos los GIFs de Clippy.
  Están guardados en la carpeta src/assets/.
*/
export const CLIPPY_GIFS = [
  "/assets/clippy-white-1.gif",
  "/assets/clippy-white-2.gif",
  "/assets/clippy-white-3.gif",
  "/assets/clippy-white-4.gif",
  "/assets/clippy-white-5.gif",
  "/assets/clippy-white-6.gif",
  "/assets/clippy-white-7.gif",
  "/assets/clippy-white-8.gif",
  "/assets/clippy-white-9.gif",
  "/assets/clippy-white-10.gif",
  "/assets/clippy-white-11.gif",
  "/assets/clippy-white-12.gif",
  "/assets/clippy-white-13.gif",
  "/assets/clippy-white-14.gif",
  "/assets/clippy-white-15.gif",
  "/assets/clippy-white-16.gif",
  "/assets/clippy-white-17.gif",
  "/assets/clippy-white-18.gif",
  "/assets/clippy-white-19.gif",
  "/assets/clippy-white-20.gif",
  "/assets/clippy-white-21.gif",
  "/assets/clippy-white-22.gif",
  "/assets/clippy-white-23.gif",
];

/*
  getRandomGif(currentSrc)
  ------------------------
  Devuelve un GIF aleatorio de la lista, asegurándose de que
  no sea el mismo que se está mostrando actualmente.

  Parámetros:
    currentSrc: string — la ruta del GIF que se está mostrando

  Retorna:
    string — la ruta del nuevo GIF a mostrar
*/
export function getRandomGif(currentSrc) {
  /*
    Extraemos solo el nombre del archivo de la URL actual.
    Por ejemplo:
      "http://127.0.0.1:5500/assets/clippy-white-3.gif"
      → "clippy-white-3.gif"

    Así la comparación funciona correctamente sin importar
    el dominio o la ruta completa.
  */
  const currentFileName = currentSrc.split("/").pop();

  // Filtramos la lista excluyendo el GIF actual
  const available = CLIPPY_GIFS.filter(
    (gif) => !gif.includes(currentFileName)
  );

  // Elegimos un índice al azar entre los disponibles
  const randomIndex = Math.floor(Math.random() * available.length);

  return available[randomIndex];
}

/*
  startClippyRotation(imgElement, intervalMs)
  -------------------------------------------
  Inicia la rotación automática de GIFs en un elemento <img>.
  Cada "intervalMs" milisegundos cambia el GIF por uno al azar.

  Parámetros:
    imgElement: HTMLImageElement — el elemento <img> de Clippy
    intervalMs: number — cada cuántos milisegundos cambia el GIF
                         (por defecto: 4000 = 4 segundos)

  Retorna:
    number — el ID del intervalo (para poder detenerlo si hace falta)
*/
/*
  preloadGifs(gifList, limit)
  ----------------------------
  Precarga los GIFs en segundo plano para que estén
  listos en memoria cuando sea su turno de mostrarse.
  Evita el parpadeo o delay entre animaciones.

  Parámetros:
    gifList: array — lista de rutas de GIFs a precargar
    limit:   number — cuántos GIFs precargar (por defecto: todos)
*/
export function preloadGifs(gifList, limit = gifList.length) {
  /*
    Tomamos los primeros "limit" GIFs de la lista.
    Creamos un objeto Image() por cada uno y asignamos
    el src. El navegador los descarga en segundo plano
    sin bloquear la interfaz.
  */
  gifList.slice(0, limit).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export function startClippyRotation(imgElement, intervalMs = 4000) {
  if (!imgElement) return null;

  preloadGifs(CLIPPY_GIFS, 6);
  setTimeout(() => preloadGifs(CLIPPY_GIFS), 2000);

  /*
    Usamos una sola imagen con fade simple.
    mix-blend-mode: multiply en el CSS disimula
    el fondo blanco del GIF fundiéndolo con el fondo gris.

    El flujo es:
      1. Fade out (opacity 0)
      2. Cambiamos el src cuando ya es invisible
      3. Fade in (opacity 1)

    El parpadeo es mínimo porque mix-blend-mode
    suaviza la transición visualmente.
  */
  const FADE_DURATION = 300;

  imgElement.style.transition = `opacity ${FADE_DURATION}ms ease`;

  const intervalId = setInterval(() => {
    const newGif = getRandomGif(imgElement.src);

    // Fase 1: fade out
    imgElement.style.opacity = "0";

    setTimeout(() => {
      // Fase 2: cambiamos el src cuando es invisible
      imgElement.src = newGif;

      // Fase 3: fade in cuando la imagen cargó
      imgElement.onload = () => {
        imgElement.style.opacity = "1";
      };

    }, FADE_DURATION);

  }, intervalMs);

  return intervalId;
}


// ============================================================
// 2. UTILIDADES DE MENSAJES
// ============================================================

/*
  formatMessage(role, text)
  --------------------------
  Crea un objeto de mensaje con estructura estándar.
  Esta estructura es la que usamos tanto para mostrar
  mensajes en pantalla como para enviarlos a la API de Gemini.

  Parámetros:
    role: string — "user" o "model" (así lo espera Gemini)
    text: string — el contenido del mensaje

  Retorna:
    objeto con { role, text, timestamp }
*/
export function formatMessage(role, text) {
  return {
    role,       // "user" o "model"
    text,       // el contenido del mensaje
    timestamp: Date.now(), // cuándo se creó el mensaje
  };
}

/*
  sanitizeText(text)
  ------------------
  Limpia el texto del usuario antes de mostrarlo en pantalla.
  Elimina espacios al principio y al final.

  Parámetros:
    text: string — el texto a limpiar

  Retorna:
    string — el texto limpio
*/
export function sanitizeText(text) {
  return text.trim();
}

/*
  isEmptyMessage(text)
  --------------------
  Verifica si un mensaje está vacío o solo tiene espacios.
  Útil para no enviar mensajes en blanco.

  Parámetros:
    text: string — el texto a verificar

  Retorna:
    boolean — true si está vacío, false si tiene contenido
*/
export function isEmptyMessage(text) {
  return !text || text.trim().length === 0;
}


// ============================================================
// 3. UTILIDADES DE LA API
// ============================================================

/*
  buildApiMessages(history)
  --------------------------
  Transforma el historial de mensajes de nuestra app al formato
  que espera la API de Gemini.

  Gemini espera un array de objetos con esta forma:
    { role: "user" | "model", parts: [{ text: "..." }] }

  Nuestra app guarda los mensajes así:
    { role: "user" | "model", text: "...", timestamp: 123 }

  Esta función hace la conversión.

  Parámetros:
    history: array — el historial de mensajes de nuestra app

  Retorna:
    array — los mensajes en el formato que espera Gemini
*/
export function buildApiMessages(history) {
  return history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));
}