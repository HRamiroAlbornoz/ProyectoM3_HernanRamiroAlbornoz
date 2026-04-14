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
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";


// ============================================================
// 1. SYSTEM PROMPT DE CLIPPY
// ============================================================

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


// ============================================================
// 2. CONFIGURACIÓN DE GEMINI
// ============================================================

/*
  MAX_HISTORY_MESSAGES: límite de mensajes del historial.
  Evita que el historial crezca demasiado y consuma
  demasiados tokens en conversaciones largas.
  Guardamos los últimos 20 mensajes (10 intercambios).
*/
const MAX_HISTORY_MESSAGES = 20;

/*
  MAX_RETRIES: cuántas veces reintentamos si hay error 429.
  Solo reintentamos una vez para no bloquear al usuario.
*/
const MAX_RETRIES = 1;

/*
  sleep(ms): espera ms milisegundos.
  Usada para esperar antes de reintentar tras un 429.
*/
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// ============================================================
// 3. FUNCIÓN PRINCIPAL: callGemini
// ============================================================

/*
  callGemini(messages, retryCount)
  ---------------------------------
  Llama a la API de Gemini con el historial de mensajes.
  Maneja el error 429 con retry automático.

  Parámetros:
    messages:    array — historial en formato Gemini
    retryCount:  number — cuántas veces reintentamos (default: 0)

  Retorna:
    Promise<string> — el texto de la respuesta de Clippy
*/
async function callGemini(messages, retryCount = 0) {
  /*
    Inicializamos el cliente de Gemini con la API key
    que vive en la variable de entorno GEMINI_API_KEY.
    Esta variable se configura en el dashboard de Vercel
    y en el archivo .env local.
    NUNCA hardcodeamos la API key en el código.
  */
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  /*
    Obtenemos el modelo Gemini 1.5 Flash con la configuración:

    systemInstruction: el system prompt que define a Clippy
    generationConfig:
      - temperature: 1.2 — respuestas creativas y variadas
        (0 = predecible, 2 = muy creativo)
      - maxOutputTokens: 300 — máximo ~200 palabras por respuesta
        Evita respuestas largas y controla el costo
  */
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 1.2,
      maxOutputTokens: 300,
    },
  });

  /*
    Recortamos el historial a los últimos MAX_HISTORY_MESSAGES.
    Esto controla la ventana de contexto y el costo de tokens.
    Siempre mantenemos los mensajes más recientes.
  */
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  /*
    Separamos el último mensaje del usuario del historial.
    Gemini espera:
      - chat.history: todos los mensajes ANTERIORES
      - sendMessage: el mensaje ACTUAL del usuario

    El último mensaje siempre es del usuario (role: "user").
  */
  const history = trimmedMessages.slice(0, -1);
  const lastMessage = trimmedMessages[trimmedMessages.length - 1];

  /*
    Iniciamos el chat con el historial previo
    y enviamos el último mensaje del usuario.
  */
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.parts[0].text);

  return result.response.text();
}


// ============================================================
// 4. HANDLER PRINCIPAL DE LA SERVERLESS FUNCTION
// ============================================================

export default async function handler(req, res) {

  // Solo aceptamos método POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido. Usá POST.",
    });
  }

  // Validamos que la API key esté configurada
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "API key no configurada.",
    });
  }

  // Extraemos y validamos los mensajes del body
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "El campo 'messages' es requerido y debe ser un array.",
    });
  }

  /*
    Intentamos llamar a Gemini con manejo de errores.
    Si hay un error 429 (rate limit), esperamos y reintentamos.
  */
  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    try {

      const reply = await callGemini(messages, retryCount);
      return res.status(200).json({ reply });

    } catch (error) {

      /*
        Error 429 — Too Many Requests (rate limit).
        Gemini nos dice cuántos segundos esperar en el
        header "Retry-After" o en el mensaje de error.
        Esperamos ese tiempo y reintentamos una vez.
      */
      const is429 = error.status === 429 ||
        (error.message && error.message.includes("429"));

      if (is429 && retryCount < MAX_RETRIES) {
        /*
          Intentamos leer el tiempo de espera del error.
          Si no está disponible, esperamos 60 segundos
          por defecto (límite estándar de Gemini).
        */
        const retryAfter = error.errorDetails?.find(
          (d) => d.reason === "rateLimitExceeded"
        )?.metadata?.retryDelay || "60s";

        /*
          Convertimos el tiempo de espera a milisegundos.
          El formato puede ser "60s" o "60000ms".
        */
        const waitMs = retryAfter.endsWith("ms")
          ? parseInt(retryAfter)
          : parseInt(retryAfter) * 1000;

        // Esperamos el tiempo indicado
        await sleep(waitMs);

        // Incrementamos el contador y reintentamos
        retryCount++;
        continue;
      }

      /*
        Si el error NO es 429, o si ya reintentamos
        y volvió a fallar, respondemos con error claro.
      */
      if (is429) {
        return res.status(429).json({
          error: "Demasiadas solicitudes. Por favor esperá unos segundos e intentá de nuevo.",
        });
      }

      /*
        Cualquier otro error de la API de Gemini
        o error inesperado del servidor.
      */
      return res.status(500).json({
        error: "Error al conectar con Clippy. Intentá de nuevo.",
      });
    }
  }
}