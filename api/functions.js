// ============================================================
// api/functions.js — Serverless Function
// ============================================================
// Este archivo es una Vercel Serverless Function.
// Actúa como intermediario (proxy) entre el frontend y Gemini.
//
// ¿Por qué existe este archivo?
//   Si llamáramos a Gemini directamente desde el frontend,
//   la API key quedaría visible en el código del navegador
//   y cualquiera podría robarla. Al hacerlo desde acá,
//   la API key vive solo en el servidor.
//
// Flujo completo:
//   Frontend → POST /api/functions → Gemini → respuesta → Frontend
//
// ESTADO ACTUAL: MOCK (simulación)
//   Las respuestas son predefinidas para poder probar
//   la interfaz sin conectar la API real de Gemini.
//   Cuando todo funcione bien, reemplazamos el mock
//   por la llamada real a Gemini.
// ============================================================


// ============================================================
// 1. RESPUESTAS MOCK DE CLIPPY
// ============================================================

/*
  Lista de respuestas predefinidas que Clippy puede dar.
  Son respuestas típicas del personaje: entrometido,
  excesivamente entusiasta y siempre queriendo ayudar.

  Cuando conectemos Gemini, estas respuestas serán
  generadas dinámicamente por la IA.
*/
const MOCK_RESPONSES = [
    "¡Hola! Parece que estás intentando iniciar una conversación. ¿Necesitás ayuda con eso? 📎",
    "¡Veo que escribiste algo! ¿Querés que te ayude a reformularlo? Tengo varias sugerencias. 📎",
    "Mmm... Parece que estás pensando en algo importante. ¿Necesitás ayuda para organizarlo? 📎",
    "¡Interesante pregunta! Aunque... ¿estás seguro de que eso es lo que querés preguntar? 📎",
    "Parece que estás escribiendo un mensaje. ¿Querés que te ayude a mejorarlo? 📎",
    "¡Oh! Eso me recuerda a cuando ayudé a alguien con un documento en 1997. ¿Querés que te cuente? 📎",
    "Entiendo lo que decís. ¿Sabías que tengo 23 animaciones diferentes? ¡Es un dato importante! 📎",
    "¡Excelente punto! Aunque... ¿lo revisaste con el corrector ortográfico? 📎",
    "Parece que necesitás ayuda. ¡Estoy aquí para eso! Aunque nadie me lo pidió... 📎",
    "¡Wow! Eso es fascinante. ¿Querés que abra el Asistente de Office para ayudarte mejor? 📎",
    "Hmm... Parece que estás teniendo una conversación. ¿Necesitás una plantilla para eso? 📎",
    "¡Genial! Por cierto, ¿sabías que podés formatear ese texto con Ctrl+B? Solo un consejo. 📎",
];

/*
  getRandomMockResponse(lastResponse)
  ------------------------------------
  Devuelve una respuesta mock aleatoria, asegurándose
  de no repetir la última respuesta dada.

  Parámetros:
    lastResponse: string — la última respuesta dada

  Retorna:
    string — una respuesta mock aleatoria
*/
function getRandomMockResponse(lastResponse) {
    const available = MOCK_RESPONSES.filter(
        (response) => response !== lastResponse
    );
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
}


// ============================================================
// 2. SIMULACIÓN DE DELAY DE RED
// ============================================================

/*
  sleep(ms)
  ---------
  Simula el tiempo de espera de una llamada a la API real.
  Sin esto, la respuesta llegaría instantáneamente y
  no podríamos probar el estado "loading" de la UI.

  Parámetros:
    ms: number — milisegundos a esperar

  Retorna:
    Promise — se resuelve después de ms milisegundos
*/
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


// ============================================================
// 3. HANDLER PRINCIPAL DE LA SERVERLESS FUNCTION
// ============================================================

/*
  handler(req, res)
  -----------------
  Esta es la función principal que Vercel ejecuta cuando
  el frontend hace un POST a /api/functions.

  En Vercel, cada archivo en la carpeta /api/ se convierte
  automáticamente en un endpoint HTTP. El nombre del archivo
  define la ruta: functions.js → /api/functions

  Parámetros:
    req: objeto con la información del request
         (método HTTP, headers, body, etc.)
    res: objeto para enviar la respuesta al frontend

  Vercel inyecta estos dos parámetros automáticamente.
*/
export default async function handler(req, res) {

    // --- 3a. Solo aceptamos método POST ---
    /*
      Si alguien intenta acceder a esta función con GET
      u otro método, respondemos con 405 (Method Not Allowed).
    */
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido. Usá POST.",
        });
    }

    // --- 3b. Extraemos los mensajes del body ---
    /*
      El frontend nos envía el historial de mensajes
      en el body del request, en formato JSON.
      Lo desestructuramos para obtener el array messages.
    */
    const { messages } = req.body;

    // Validamos que messages exista y sea un array
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
            error: "El campo 'messages' es requerido y debe ser un array.",
        });
    }

    try {

        // --- 3c. Simulamos el delay de la API ---
        /*
          Esperamos entre 1 y 2 segundos para simular
          el tiempo real que tarda Gemini en responder.
          Esto nos permite probar el estado "loading" de la UI.
        */
        const delay = Math.floor(Math.random() * 1000) + 1000; // 1000-2000ms
        await sleep(delay);

        // --- 3d. Obtenemos la última respuesta del historial ---
        /*
          Buscamos la última respuesta del modelo en el historial
          para no repetirla en la respuesta mock.
        */
        const lastModelMessage = [...messages]
            .reverse()
            .find((msg) => msg.role === "model");

        const lastResponse = lastModelMessage
            ? lastModelMessage.parts[0].text
            : "";

        // --- 3e. Generamos la respuesta mock ---
        const reply = getRandomMockResponse(lastResponse);

        // --- 3f. Enviamos la respuesta al frontend ---
        /*
          Respondemos con status 200 (OK) y un objeto JSON
          con la respuesta de Clippy.
          El frontend espera exactamente esta estructura:
            { reply: "..." }
        */
        return res.status(200).json({ reply });

    } catch (error) {
        /*
          Si algo sale mal, respondemos con status 500
          (Internal Server Error) y un mensaje de error.
        */
        return res.status(500).json({
            error: "Error interno del servidor.",
        });
    }
}