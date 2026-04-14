// ============================================================
// tests/utils.test.js — Tests unitarios de utils.js
// ============================================================
// Versión mejorada con:
//   - Edge cases extremos (Mejora 1)
//   - Tests de comportamiento temporal (Mejora 2)
//   - Tests de snapshot (Mejora 4)
// ============================================================

import { describe, it, expect } from "vitest";
import {
    sanitizeText,
    isEmptyMessage,
    formatMessage,
    buildApiMessages,
    getRandomGif,
    CLIPPY_GIFS,
} from "../src/utils.js";


// ============================================================
// 1. TESTS DE sanitizeText
// ============================================================

describe("sanitizeText", () => {

    it("elimina espacios al principio y al final", () => {
        expect(sanitizeText("  hola  ")).toBe("hola");
    });

    it("no modifica un texto sin espacios extras", () => {
        expect(sanitizeText("hola")).toBe("hola");
    });

    it("elimina espacios solo al principio", () => {
        expect(sanitizeText("  hola")).toBe("hola");
    });

    it("elimina espacios solo al final", () => {
        expect(sanitizeText("hola  ")).toBe("hola");
    });

    it("devuelve string vacío si solo hay espacios", () => {
        expect(sanitizeText("   ")).toBe("");
    });

    // --- Mejora 1: Edge cases extremos ---

    it("maneja caracteres especiales y emojis correctamente", () => {
        /*
          El texto con emojis y caracteres especiales no debe
          modificarse, solo se eliminan los espacios externos
        */
        expect(sanitizeText("  ¡Hola! 📎  ")).toBe("¡Hola! 📎");
    });

    it("maneja texto muy largo correctamente", () => {
        /*
          sanitizeText debe funcionar con textos muy largos
          sin errores ni truncamiento
        */
        const longText = "  " + "a".repeat(1000) + "  ";
        expect(sanitizeText(longText)).toBe("a".repeat(1000));
    });

    it("maneja texto con múltiples espacios internos", () => {
        /*
          Los espacios internos NO deben eliminarse,
          solo los del principio y el final
        */
        expect(sanitizeText("  hola   mundo  ")).toBe("hola   mundo");
    });

    it("maneja texto con saltos de línea", () => {
        /*
          trim() también elimina saltos de línea (\n) y tabs (\t)
          en los extremos del texto
        */
        expect(sanitizeText("\nhola\n")).toBe("hola");
    });

    it("maneja texto con tabs", () => {
        expect(sanitizeText("\thola\t")).toBe("hola");
    });

    it("maneja string vacío", () => {
        expect(sanitizeText("")).toBe("");
    });

});


// ============================================================
// 2. TESTS DE isEmptyMessage
// ============================================================

describe("isEmptyMessage", () => {

    it("devuelve true para string vacío", () => {
        expect(isEmptyMessage("")).toBe(true);
    });

    it("devuelve true para string con solo espacios", () => {
        expect(isEmptyMessage("   ")).toBe(true);
    });

    it("devuelve true para null", () => {
        expect(isEmptyMessage(null)).toBe(true);
    });

    it("devuelve true para undefined", () => {
        expect(isEmptyMessage(undefined)).toBe(true);
    });

    it("devuelve false para un mensaje válido", () => {
        expect(isEmptyMessage("Hola Clippy")).toBe(false);
    });

    it("devuelve false para un mensaje con un solo caracter", () => {
        expect(isEmptyMessage("a")).toBe(false);
    });

    // --- Mejora 1: Edge cases extremos ---

    it("devuelve true para tabs y saltos de línea", () => {
        /*
          Un mensaje con solo tabs y saltos de línea
          se considera vacío después del trim()
        */
        expect(isEmptyMessage("\t\n")).toBe(true);
    });

    it("devuelve true para combinación de espacios y tabs", () => {
        expect(isEmptyMessage("  \t  \n  ")).toBe(true);
    });

    it("devuelve false para un mensaje con solo un emoji", () => {
        /*
          Un emoji es contenido válido
        */
        expect(isEmptyMessage("📎")).toBe(false);
    });

    it("devuelve false para un mensaje muy largo", () => {
        expect(isEmptyMessage("a".repeat(1000))).toBe(false);
    });

    it("devuelve false para un número como string", () => {
        expect(isEmptyMessage("0")).toBe(false);
    });

});


// ============================================================
// 3. TESTS DE formatMessage
// ============================================================

describe("formatMessage", () => {

    it("crea un objeto con role, text y timestamp", () => {
        const msg = formatMessage("user", "Hola Clippy");
        expect(msg).toHaveProperty("role");
        expect(msg).toHaveProperty("text");
        expect(msg).toHaveProperty("timestamp");
    });

    it("asigna el role correctamente", () => {
        const msg = formatMessage("user", "Hola");
        expect(msg.role).toBe("user");
    });

    it("asigna el text correctamente", () => {
        const msg = formatMessage("user", "Hola Clippy");
        expect(msg.text).toBe("Hola Clippy");
    });

    it("asigna el role 'model' correctamente", () => {
        const msg = formatMessage("model", "¡Hola! 📎");
        expect(msg.role).toBe("model");
    });

    it("el timestamp es un número", () => {
        const msg = formatMessage("user", "Hola");
        expect(typeof msg.timestamp).toBe("number");
    });

    it("el timestamp es mayor a 0", () => {
        const msg = formatMessage("user", "Hola");
        expect(msg.timestamp).toBeGreaterThan(0);
    });

    // --- Mejora 1: Edge cases extremos ---

    it("maneja texto con emojis correctamente", () => {
        const msg = formatMessage("user", "¡Hola! 📎💾🖨️");
        expect(msg.text).toBe("¡Hola! 📎💾🖨️");
    });

    it("maneja texto muy largo correctamente", () => {
        const longText = "a".repeat(1000);
        const msg = formatMessage("user", longText);
        expect(msg.text).toHaveLength(1000);
    });

    it("maneja texto vacío sin errores", () => {
        const msg = formatMessage("user", "");
        expect(msg.text).toBe("");
    });

    // --- Mejora 2: Tests de comportamiento temporal ---

    it("timestamps de dos mensajes consecutivos son iguales o crecientes", () => {
        /*
          El timestamp del segundo mensaje debe ser mayor o igual
          al del primero. Nunca puede ser anterior.
        */
        const msg1 = formatMessage("user", "primer mensaje");
        const msg2 = formatMessage("user", "segundo mensaje");
        expect(msg2.timestamp).toBeGreaterThanOrEqual(msg1.timestamp);
    });

    it("el timestamp es cercano a Date.now()", () => {
        /*
          El timestamp debe ser un valor reciente.
          Lo comparamos con Date.now() con un margen de 1 segundo.
        */
        const before = Date.now();
        const msg = formatMessage("user", "Hola");
        const after = Date.now();

        expect(msg.timestamp).toBeGreaterThanOrEqual(before);
        expect(msg.timestamp).toBeLessThanOrEqual(after);
    });

    // --- Mejora 4: Tests de snapshot ---

    it("la estructura del mensaje coincide con el snapshot", () => {
        /*
          toMatchSnapshot guarda la estructura del objeto la primera
          vez que se corre el test. En ejecuciones posteriores,
          verifica que la estructura no haya cambiado.
    
          Usamos un timestamp fijo (123) para que el snapshot
          sea determinístico (siempre igual).
        */
        const msg = { ...formatMessage("user", "Hola Clippy"), timestamp: 123 };
        expect(msg).toMatchSnapshot();
    });

});


// ============================================================
// 4. TESTS DE buildApiMessages
// ============================================================

describe("buildApiMessages", () => {

    it("transforma el historial al formato de Gemini", () => {
        const history = [
            { role: "user", text: "Hola", timestamp: 123 },
        ];

        const result = buildApiMessages(history);

        expect(result[0]).toEqual({
            role: "user",
            parts: [{ text: "Hola" }],
        });
    });

    it("transforma múltiples mensajes correctamente", () => {
        const history = [
            { role: "user", text: "Hola", timestamp: 1 },
            { role: "model", text: "¡Hola! 📎", timestamp: 2 },
        ];

        const result = buildApiMessages(history);

        expect(result).toHaveLength(2);
        expect(result[0].role).toBe("user");
        expect(result[1].role).toBe("model");
    });

    it("cada mensaje tiene la propiedad parts con un array", () => {
        const history = [
            { role: "user", text: "Hola", timestamp: 1 },
        ];

        const result = buildApiMessages(history);

        expect(Array.isArray(result[0].parts)).toBe(true);
    });

    it("el texto del mensaje se preserva correctamente", () => {
        const history = [
            { role: "user", text: "¿Cómo estás?", timestamp: 1 },
        ];

        const result = buildApiMessages(history);

        expect(result[0].parts[0].text).toBe("¿Cómo estás?");
    });

    it("devuelve array vacío si el historial está vacío", () => {
        const result = buildApiMessages([]);
        expect(result).toHaveLength(0);
    });

    it("no incluye el timestamp en el resultado", () => {
        const history = [
            { role: "user", text: "Hola", timestamp: 999 },
        ];

        const result = buildApiMessages(history);

        expect(result[0]).not.toHaveProperty("timestamp");
    });

    // --- Mejora 1: Edge cases extremos ---

    it("maneja mensajes con emojis correctamente", () => {
        const history = [
            { role: "user", text: "Hola 📎", timestamp: 1 },
        ];

        const result = buildApiMessages(history);

        expect(result[0].parts[0].text).toBe("Hola 📎");
    });

    it("maneja texto muy largo correctamente", () => {
        const longText = "a".repeat(1000);
        const history = [
            { role: "user", text: longText, timestamp: 1 },
        ];

        const result = buildApiMessages(history);

        expect(result[0].parts[0].text).toHaveLength(1000);
    });

    it("preserva el orden de los mensajes", () => {
        /*
          El orden del historial es crítico para Gemini.
          Un mensaje fuera de orden haría que Clippy
          perdiera el contexto de la conversación.
        */
        const history = [
            { role: "user", text: "mensaje 1", timestamp: 1 },
            { role: "model", text: "mensaje 2", timestamp: 2 },
            { role: "user", text: "mensaje 3", timestamp: 3 },
        ];

        const result = buildApiMessages(history);

        expect(result[0].parts[0].text).toBe("mensaje 1");
        expect(result[1].parts[0].text).toBe("mensaje 2");
        expect(result[2].parts[0].text).toBe("mensaje 3");
    });

    // --- Mejora 4: Tests de snapshot ---

    it("el formato de transformación coincide con el snapshot", () => {
        /*
          Guardamos el formato exacto que esperamos para Gemini.
          Si alguien modifica buildApiMessages accidentalmente,
          este test fallará y avisará del cambio.
        */
        const history = [
            { role: "user", text: "Hola", timestamp: 1 },
            { role: "model", text: "¡Hola! 📎", timestamp: 2 },
        ];

        expect(buildApiMessages(history)).toMatchSnapshot();
    });

});


// ============================================================
// 5. TESTS DE getRandomGif
// ============================================================

describe("getRandomGif", () => {

    it("devuelve un string", () => {
        const gif = getRandomGif("/assets/clippy-white-1.gif");
        expect(typeof gif).toBe("string");
    });

    it("no devuelve el mismo GIF que el actual", () => {
        const current = "/assets/clippy-white-1.gif";
        const next = getRandomGif(current);
        expect(next).not.toContain("clippy-white-1.gif");
    });

    it("devuelve un GIF que existe en la lista CLIPPY_GIFS", () => {
        const current = "/assets/clippy-white-1.gif";
        const next = getRandomGif(current);

        const isValid = CLIPPY_GIFS.some((gif) =>
            next.includes(gif.split("/").pop())
        );

        expect(isValid).toBe(true);
    });

    it("CLIPPY_GIFS tiene 23 elementos", () => {
        expect(CLIPPY_GIFS).toHaveLength(23);
    });

    // --- Mejora 1: Edge cases extremos ---

    it("funciona con cualquier GIF de la lista como actual", () => {
        /*
          Probamos que getRandomGif funciona correctamente
          sin importar cuál es el GIF actual
        */
        CLIPPY_GIFS.forEach((currentGif) => {
            const next = getRandomGif(currentGif);
            const currentFileName = currentGif.split("/").pop();
            expect(next).not.toContain(currentFileName);
        });
    });

    it("siempre devuelve un GIF diferente en múltiples llamadas consecutivas", () => {
        /*
          Hacemos 10 llamadas consecutivas y verificamos que
          ninguna devuelve el mismo GIF que se le pasó como actual
        */
        const current = "/assets/clippy-white-1.gif";

        for (let i = 0; i < 10; i++) {
            const next = getRandomGif(current);
            expect(next).not.toContain("clippy-white-1.gif");
        }
    });

    it("todos los GIFs de CLIPPY_GIFS tienen el formato correcto", () => {
        /*
          Verificamos que todas las rutas siguen el patrón
          /assets/clippy-white-N.gif
        */
        CLIPPY_GIFS.forEach((gif) => {
            expect(gif).toMatch(/\/assets\/clippy-white-\d+\.gif/);
        });
    });

    // --- Mejora 4: Tests de snapshot ---

    it("CLIPPY_GIFS coincide con el snapshot", () => {
        /*
          Si alguien agrega o elimina GIFs accidentalmente,
          este test fallará y avisará del cambio.
        */
        expect(CLIPPY_GIFS).toMatchSnapshot();
    });

});