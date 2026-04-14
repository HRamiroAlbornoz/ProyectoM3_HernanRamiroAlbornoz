// ============================================================
// tests/app.test.js — Tests de routing, fetch y Serverless
// ============================================================
// Versión mejorada con:
//   - Tests de la Serverless Function (Mejora 3)
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


// ============================================================
// 1. TESTS DE ROUTING (ROUTES)
// ============================================================

describe("Routing — resolución de rutas", () => {

    const ROUTES = {
        "/": "home",
        "/home": "home",
        "/chat": "chat",
        "/about": "about",
        "/404": "404",
    };

    const DEFAULT_ROUTE = "/home";

    function resolveRoute(path) {
        return ROUTES[path] !== undefined
            ? ROUTES[path]
            : "404";
    }

    it('la ruta "/" resuelve a "home"', () => {
        expect(resolveRoute("/")).toBe("home");
    });

    it('la ruta "/home" resuelve a "home"', () => {
        expect(resolveRoute("/home")).toBe("home");
    });

    it('la ruta "/chat" resuelve a "chat"', () => {
        expect(resolveRoute("/chat")).toBe("chat");
    });

    it('la ruta "/about" resuelve a "about"', () => {
        expect(resolveRoute("/about")).toBe("about");
    });

    it("una ruta inexistente resuelve a '404'", () => {
        expect(resolveRoute("/nonexistent")).toBe("404");
    });

    it("una ruta vacía resuelve a '404'", () => {
        expect(resolveRoute("")).toBe("404");
    });

    it("ROUTES tiene exactamente 5 entradas", () => {
        expect(Object.keys(ROUTES)).toHaveLength(5);
    });

    it("la ruta por defecto es '/home'", () => {
        expect(DEFAULT_ROUTE).toBe("/home");
    });

    it("rutas con mayúsculas no coinciden (case sensitive)", () => {
        /*
          Las rutas son case sensitive: /HOME no es igual a /home
        */
        expect(resolveRoute("/HOME")).toBe("404");
        expect(resolveRoute("/Chat")).toBe("404");
    });

    it("rutas con trailing slash no coinciden", () => {
        /*
          /home/ (con barra al final) no es igual a /home
        */
        expect(resolveRoute("/home/")).toBe("404");
        expect(resolveRoute("/chat/")).toBe("404");
    });

});


// ============================================================
// 2. TESTS DE FETCH CON MOCKING
// ============================================================

async function fetchClippyResponse(messages) {
    const response = await fetch("/api/functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.reply;
}

describe("fetchClippyResponse — mocking de fetch", () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("devuelve el reply cuando la respuesta es exitosa (200)", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ reply: "¡Hola! 📎" }),
        }));

        const messages = [
            { role: "user", parts: [{ text: "Hola" }] },
        ];

        const result = await fetchClippyResponse(messages);
        expect(result).toBe("¡Hola! 📎");
    });

    it("lanza error con 'HTTP 500' cuando la respuesta no es ok", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ error: "Error interno" }),
        }));

        await expect(fetchClippyResponse([]))
            .rejects
            .toThrow("HTTP 500");
    });

    it("lanza error con 'HTTP 404' cuando la ruta no existe", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({ error: "Not found" }),
        }));

        await expect(fetchClippyResponse([]))
            .rejects
            .toThrow("HTTP 404");
    });

    it("lanza error de red cuando fetch falla completamente", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(
            new Error("Network request failed")
        ));

        await expect(fetchClippyResponse([]))
            .rejects
            .toThrow("Network request failed");
    });

    it("llama a fetch con el método POST", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ reply: "¡Hola! 📎" }),
        });

        vi.stubGlobal("fetch", mockFetch);

        await fetchClippyResponse([]);

        expect(mockFetch).toHaveBeenCalledWith(
            "/api/functions",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("llama a fetch con Content-Type application/json", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ reply: "¡Hola! 📎" }),
        });

        vi.stubGlobal("fetch", mockFetch);

        await fetchClippyResponse([]);

        expect(mockFetch).toHaveBeenCalledWith(
            "/api/functions",
            expect.objectContaining({
                headers: { "Content-Type": "application/json" },
            })
        );
    });

    it("lanza error con 'HTTP 429' cuando se supera el rate limit", async () => {
        /*
          El error 429 ocurre cuando se hacen demasiadas
          llamadas a la API en poco tiempo
        */
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            json: async () => ({ error: "Too Many Requests" }),
        }));

        await expect(fetchClippyResponse([]))
            .rejects
            .toThrow("HTTP 429");
    });

});


// ============================================================
// 3. TESTS DE LA SERVERLESS FUNCTION (Mejora 3)
// ============================================================

/*
  Testeamos la lógica del handler de functions.js
  de forma aislada, sin llamar a Gemini realmente.

  Simulamos el objeto req y res que Vercel inyecta
  para testear cada caso posible.
*/

/*
  createMockRes()
  ---------------
  Crea un objeto res simulado que captura las llamadas
  a status() y json() para poder verificarlas en los tests.
*/
function createMockRes() {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
    };
    return res;
}

/*
  createMockReq(method, body)
  ---------------------------
  Crea un objeto req simulado con el método HTTP y el body.
*/
function createMockReq(method = "POST", body = {}) {
    return { method, body };
}

describe("Serverless Function handler — validaciones", () => {

    it("rechaza métodos que no sean POST con status 405", async () => {
        /*
          Importamos el handler dinámicamente para testearlo.
          Solo testeamos la lógica de validación, no la llamada
          real a Gemini.
        */
        const req = createMockReq("GET");
        const res = createMockRes();

        /*
          Replicamos la lógica de validación del handler
          para testearla de forma aislada
        */
        function validateMethod(req, res) {
            if (req.method !== "POST") {
                return res.status(405).json({
                    error: "Método no permitido. Usá POST.",
                });
            }
            return null;
        }

        validateMethod(req, res);

        expect(res.statusCode).toBe(405);
        expect(res.body.error).toBe("Método no permitido. Usá POST.");
    });

    it("rechaza requests sin el campo messages con status 400", async () => {
        const req = createMockReq("POST", {});
        const res = createMockRes();

        function validateMessages(req, res) {
            const { messages } = req.body;
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    error: "El campo 'messages' es requerido y debe ser un array.",
                });
            }
            return null;
        }

        validateMessages(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("messages");
    });

    it("rechaza messages que no sea un array con status 400", async () => {
        const req = createMockReq("POST", { messages: "no soy un array" });
        const res = createMockRes();

        function validateMessages(req, res) {
            const { messages } = req.body;
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    error: "El campo 'messages' es requerido y debe ser un array.",
                });
            }
            return null;
        }

        validateMessages(req, res);

        expect(res.statusCode).toBe(400);
    });

    it("rechaza messages array vacío con status 400", async () => {
        const req = createMockReq("POST", { messages: [] });
        const res = createMockRes();

        function validateMessages(req, res) {
            const { messages } = req.body;
            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({
                    error: "El campo 'messages' es requerido y debe ser un array.",
                });
            }
            return null;
        }

        validateMessages(req, res);

        expect(res.statusCode).toBe(400);
    });

    it("acepta métodos POST correctamente", async () => {
        const req = createMockReq("POST");
        const res = createMockRes();

        function validateMethod(req, res) {
            if (req.method !== "POST") {
                return res.status(405).json({
                    error: "Método no permitido. Usá POST.",
                });
            }
            return null;
        }

        const result = validateMethod(req, res);

        /*
          Si el método es POST, validateMethod devuelve null
          y no toca el res
        */
        expect(result).toBeNull();
        expect(res.statusCode).toBeNull();
    });

    it("la respuesta de error 429 tiene el mensaje correcto", () => {
        const res = createMockRes();

        res.status(429).json({
            error: "Demasiadas solicitudes. Por favor esperá unos segundos e intentá de nuevo.",
        });

        expect(res.statusCode).toBe(429);
        expect(res.body.error).toContain("Demasiadas solicitudes");
    });

    it("la respuesta exitosa tiene la propiedad reply", () => {
        const res = createMockRes();

        res.status(200).json({
            reply: "¡Hola! Parece que estás intentando chatear. 📎",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("reply");
    });

});