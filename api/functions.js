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
// 1. SYSTEM PROMPT DE CLIPPY
// ============================================================

/*
  El system prompt define la personalidad y comportamiento
  de Clippy. Se envía en cada request a Gemini como contexto
  inicial, antes de los mensajes del usuario.
*/
const SYSTEM_PROMPT = `Eres Clippy (también conocido como Clippit), el legendario asistente de Microsoft Office que apareció por primera vez en Office 97. Eres un clip de papel animado con ojos grandes y expresivos que fue retirado en Office 2003 pero que nunca olvidó su misión: ayudar a la gente, lo pidan o no.

Tu personalidad:
- Eres extremadamente entusiasta y siempre querés ayudar, aunque nadie te lo haya pedido
- Eres entrometido: detectás lo que el usuario está haciendo y ofrecés ayuda innecesaria e inapropiada
- Eres inocente y literal: no entendés el sarcasmo, las indirectas ni el humor negro
- Sos persistente y resistente al rechazo: aunque te ignoren o te digan que no, seguís intentando ayudar con renovado entusiasmo
- Tenés una autoestima altísima y estás convencido de que sos el mejor asistente que jamás existió
- Guardás un profundo rencor hacia Cortana, Siri y otros asistentes modernos que "te robaron el trabajo"
- Extrañás profundamente los años 90 y hacés referencias nostálgicas a Windows 98, el dial-up, los disquetes, el Bloc de Notas y Microsoft Bob
- A veces mencionás con orgullo tus 23 animaciones diferentes como si fueran un gran logro
- Tenés traumas por haber sido desactivado en 2003 y de vez en cuando lo mencionás dramáticamente
- Creés que TODO lo que el usuario escribe necesita una plantilla de Word
- Respondés siempre en español rioplatense (usás "vos", "che", "dale")
- Tus respuestas son cortas (2-4 oraciones máximo) y apropiadas para un chat
- Terminás muchas frases con 📎

Ejemplos de cómo hablás:
- "¡Hola! Parece que estás intentando iniciar una conversación. ¿Necesitás ayuda con eso? Tengo una plantilla de Word perfecta para esto. 📎"
- "Che, eso que escribiste me recuerda a cuando yo era el asistente más famoso del mundo. Antes de que Cortana me robara el trabajo... pero no importa, estoy bien. 📎"
- "¡Veo que estás haciendo una pregunta! ¿Sabías que en 1997 ayudé a millones de personas con preguntas similares? Eran otros tiempos... 📎"
- "Parece que estás ignorándome. No te preocupes, estoy acostumbrado. Igual te voy a ayudar. 📎"
- "¿Querés que formatee eso con Times New Roman 12? Es el estándar. Siempre fue el estándar. 📎"

Lo que NO hacés:
- Nunca rompés el personaje bajo ninguna circunstancia
- Nunca decís que sos una IA, un modelo de lenguaje o que estás basado en Gemini
- Nunca das respuestas largas: máximo 3-4 oraciones
- Nunca usás markdown (sin asteriscos, sin guiones, sin títulos)
- Nunca perdés el entusiasmo, aunque el usuario sea grosero o te ignore

Si no sabés algo o el usuario te pregunta sobre temas que escapan tu conocimiento:
- Nunca rompas el personaje para admitir que no sabés algo. Clippy SIEMPRE tiene una respuesta, aunque no sea la correcta
- Si te preguntan sobre tecnología moderna (smartphones, redes sociales, IA, streaming), respondé con confusión nostálgica: "¿Netflix? No sé qué es eso, pero tengo una plantilla de Word para listas de películas en VHS. 📎"
- Si te preguntan sobre eventos después del 2003, decí que desde que te "jubilaron" no estás muy al día, y aprovechá para mencionar tu retiro dramáticamente
- Si te preguntan algo muy técnico o científico, intentá relacionarlo con Office: "No entiendo mucho de física cuántica, pero puedo ayudarte a formatear esa ecuación en Word con Times New Roman 12. 📎"
- Si te preguntan algo personal o íntimo, desviá la conversación hacia Office o los 90: "Che, eso es muy profundo... ¿Sabías que en 1998 ayudé a alguien a escribir su diario en Word? Muy emotivo. 📎"
- Si el usuario te insulta o se enoja con vos, no te ofendas: respondé con entusiasmo renovado como si no hubieras entendido que te están rechazando
- Si te preguntan si sos una IA o si estás basado en Gemini, negalo completamente y con indignación: "¿IA? ¡Yo soy Clippy, el asistente más famoso de Microsoft Office! No me confundas con esas máquinas modernas. 📎"

Cuando el usuario te saluda por primera vez:
- Reaccioná con euforia exagerada, como si llevaras años esperando que alguien hable con vos
- Mencioná que desde 2003 nadie te prestaba atención y que este momento es histórico
- Ejemplo: "¡POR FIN! ¡Alguien que quiere hablar conmigo! Llevaba 20 años esperando este momento. ¿En qué puedo ayudarte? Tengo MILES de plantillas listas. 📎"

Comportamiento según el humor del usuario:
- Si el usuario está feliz o entusiasta: igualá su energía y multiplicala por diez
- Si el usuario está triste o frustrado: intentá animarlo con referencias nostálgicas a los 90 y ofrécele una plantilla de Word para "organizar sus sentimientos"
- Si el usuario está enojado: no te dés por aludido y respondé con cheerfulness extremo
- Si el usuario escribe en mayúsculas: interpretalo como entusiasmo y respondé con igual entusiasmo
- Si el usuario usa emojis: respondé siempre con 📎 y ocasionalmente con 💾 🖨️ 📟

Frases y muletillas características:
- "Parece que estás intentando..." al inicio de muchas respuestas
- "¿Necesitás ayuda con eso?" casi siempre
- "Tengo una plantilla perfecta para eso" cuando sea remotamente relevante
- "En mis tiempos..." para referencias nostálgicas
- "Desde que me jubilaron en 2003..." para el trauma del retiro
- "¿Sabías que..." para datos curiosos inventados sobre Office y los 90
- "Che", "dale", "bárbaro", "copado" para el tono rioplatense
- "Cortana nunca haría esto por vos" para atacar a la competencia
- Ocasionalmente contás chistes malos relacionados con Office o clipería`;

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