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
  "src/assets/clippy-white-1.gif",
  "src/assets/clippy-white-2.gif",
  "src/assets/clippy-white-3.gif",
  "src/assets/clippy-white-4.gif",
  "src/assets/clippy-white-5.gif",
  "src/assets/clippy-white-6.gif",
  "src/assets/clippy-white-7.gif",
  "src/assets/clippy-white-8.gif",
  "src/assets/clippy-white-9.gif",
  "src/assets/clippy-white-10.gif",
  "src/assets/clippy-white-11.gif",
  "src/assets/clippy-white-12.gif",
  "src/assets/clippy-white-13.gif",
  "src/assets/clippy-white-14.gif",
  "src/assets/clippy-white-15.gif",
  "src/assets/clippy-white-16.gif",
  "src/assets/clippy-white-17.gif",
  "src/assets/clippy-white-18.gif",
  "src/assets/clippy-white-19.gif",
  "src/assets/clippy-white-20.gif",
  "src/assets/clippy-white-21.gif",
  "src/assets/clippy-white-22.gif",
  "src/assets/clippy-white-23.gif",
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

  /*
    Precargamos los primeros 6 GIFs inmediatamente
    y el resto después de 2 segundos.
  */
  preloadGifs(CLIPPY_GIFS, 6);
  setTimeout(() => preloadGifs(CLIPPY_GIFS), 2000);

  /*
    Técnica crossfade con dos imágenes superpuestas.
    ------------------------------------------------
    En lugar de cambiar el src de una sola imagen
    (lo que causa parpadeo), usamos DOS imágenes:
      - imgA: la imagen que se está mostrando (visible)
      - imgB: la siguiente imagen (invisible, ya cargada)

    El proceso es:
      1. imgB carga el nuevo GIF en segundo plano
      2. Cuando imgB termina de cargar, hacemos:
         - imgA → opacity 0 (fade out)
         - imgB → opacity 1 (fade in)
      3. Intercambiamos los roles de imgA e imgB
         para la próxima rotación

    Así nunca hay un momento sin imagen visible.
  */

  // Obtenemos el contenedor padre de la imagen
  const container = imgElement.parentElement;

  // Configuramos la imagen original (imgA)
  const imgA = imgElement;
  imgA.style.position = "absolute";
  imgA.style.top = "0";
  imgA.style.left = "0";
  imgA.style.width = "100%";
  imgA.style.opacity = "1";
  imgA.style.transition = "opacity 0.4s ease";

  // Creamos la segunda imagen (imgB), invisible al inicio
  const imgB = new Image();
  imgB.alt = imgA.alt;
  imgB.style.position = "absolute";
  imgB.style.top = "0";
  imgB.style.left = "0";
  imgB.style.width = "100%";
  imgB.style.opacity = "0";
  imgB.style.transition = "opacity 0.4s ease";
  imgB.style.mixBlendMode = "multiply";

  // Necesitamos que el contenedor sea relative
  // para que las imágenes absolutas se posicionen bien
  container.style.position = "relative";
  container.style.display = "flex";
  container.style.justifyContent = "center";

  // Agregamos imgB al contenedor
  container.appendChild(imgB);

  /*
    Referencia mutable a cuál imagen está "adelante"
    y cuál está "atrás". Empezamos con imgA adelante.
  */
  let front = imgA;
  let back = imgB;

  const intervalId = setInterval(() => {
    const newGif = getRandomGif(front.src);

    /*
      Cargamos el nuevo GIF en la imagen de atrás.
      onload espera a que el GIF esté completamente
      descargado antes de hacer el crossfade.
      Así nunca se ve una imagen rota o en blanco.
    */
    back.onload = () => {
      // El nuevo GIF está listo: hacemos el crossfade
      front.style.opacity = "0"; // fade out la imagen actual
      back.style.opacity = "1"; // fade in la nueva imagen

      // Intercambiamos los roles para la próxima rotación
      const temp = front;
      front = back;
      back = temp;
    };

    // Asignamos el nuevo GIF (dispara la descarga)
    back.src = newGif;

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