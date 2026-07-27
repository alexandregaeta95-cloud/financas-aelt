var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// src/lib/server.ts
var import_express = require("express");

// src/lib/pushService.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var KEYS_FILE = import_path.default.resolve(process.cwd(), ".vapid-keys.json");
var SUBS_FILE = import_path.default.resolve(process.cwd(), ".push-subscriptions.json");
var vapidKeys;
if (import_fs.default.existsSync(KEYS_FILE)) {
  try {
    vapidKeys = JSON.parse(import_fs.default.readFileSync(KEYS_FILE, "utf-8"));
  } catch (e) {
    vapidKeys = import_web_push.default.generateVAPIDKeys();
    import_fs.default.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys), "utf-8");
  }
} else {
  vapidKeys = import_web_push.default.generateVAPIDKeys();
  import_fs.default.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys), "utf-8");
}
import_web_push.default.setVapidDetails(
  "mailto:AlexandreGaeta95@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
function getPublicKey() {
  return vapidKeys.publicKey;
}
var subscriptions = [];
if (import_fs.default.existsSync(SUBS_FILE)) {
  try {
    subscriptions = JSON.parse(import_fs.default.readFileSync(SUBS_FILE, "utf-8"));
  } catch (e) {
    subscriptions = [];
  }
}
function addSubscription(sub) {
  const exists = subscriptions.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    subscriptions.push(sub);
    try {
      import_fs.default.writeFileSync(SUBS_FILE, JSON.stringify(subscriptions), "utf-8");
    } catch (e) {
      console.error("Failed to save push subscriptions to file:", e);
    }
  }
}
async function sendPushNotification(payload) {
  const payloadStr = JSON.stringify(payload);
  const unsuccessful = [];
  const promises = subscriptions.map(async (sub) => {
    try {
      await import_web_push.default.sendNotification(sub, payloadStr);
    } catch (error) {
      console.error("Error sending push notification:", error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        unsuccessful.push(sub);
      }
    }
  });
  await Promise.all(promises);
  if (unsuccessful.length > 0) {
    subscriptions = subscriptions.filter((s) => !unsuccessful.includes(s));
    try {
      import_fs.default.writeFileSync(SUBS_FILE, JSON.stringify(subscriptions), "utf-8");
    } catch (e) {
      console.error("Failed to update push subscriptions file after failure cleanup:", e);
    }
  }
}

// src/lib/server.ts
var router = (0, import_express.Router)();
var pendingWebhooks = [];
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
router.post("/api/webhooks/bank", (req, res) => {
  try {
    const { banco, valor, descricao, text, tipo } = req.body;
    if (!text && !descricao && !valor) {
      console.warn("[Webhook Bank] Rejected empty request payload");
      return res.status(400).json({
        success: false,
        error: "Missing transaction data. Please provide 'text', 'descricao', or 'valor'."
      });
    }
    let finalBanco = banco || "Banco";
    let finalValor = parseFloat(valor) || 0;
    let finalDescricao = descricao || text || "Transa\xE7\xE3o em Tempo Real";
    if (text) {
      const match = text.match(/R\$\s*([0-9]+(?:\.[0-9]+)*(?:,[0-9]{2})?)/i);
      if (match) {
        let valStr = match[1];
        valStr = valStr.replace(/\./g, "").replace(",", ".");
        const parsedVal = parseFloat(valStr);
        if (!isNaN(parsedVal)) {
          finalValor = parsedVal;
        }
      }
      const lowerText = text.toLowerCase();
      if (lowerText.includes("itau") || lowerText.includes("ita\xFA")) finalBanco = "Ita\xFA";
      else if (lowerText.includes("nubank")) finalBanco = "Nubank";
      else if (lowerText.includes("bradesco")) finalBanco = "Bradesco";
      else if (lowerText.includes("banco do brasil") || lowerText.includes("bb")) finalBanco = "Banco do Brasil";
      else if (lowerText.includes("inter")) finalBanco = "Inter";
      else if (lowerText.includes("c6")) finalBanco = "C6 Bank";
      else if (lowerText.includes("santander")) finalBanco = "Santander";
    }
    const newWebhook = {
      id: Date.now() + Math.floor(Math.random() * 1e3),
      bancoNome: finalBanco,
      valor: finalValor,
      descricao: finalDescricao,
      tipo: tipo && ["RECEITA", "DESPESA", "TRANSFERENCIA"].includes(tipo.toUpperCase()) ? tipo.toUpperCase() : "DETERMINAR",
      timestamp: Date.now()
    };
    pendingWebhooks.push(newWebhook);
    if (pendingWebhooks.length > 50) {
      pendingWebhooks.shift();
    }
    const pushPayload = {
      title: `Pix Recebido - R$ ${finalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      body: `Nova transa\xE7\xE3o no ${finalBanco}: "${finalDescricao}". Toque para classificar.`,
      valor: finalValor,
      descricao: finalDescricao,
      banco: finalBanco,
      tipo: tipo || "DETERMINAR",
      url: "/?tab=transactions&add=true"
    };
    sendPushNotification(pushPayload).catch((err) => {
      console.error("[Push Notification] Failed to broadcast push notification:", err);
    });
    console.log("[Webhook Bank] Real-time MacroDroid Webhook successfully validated and dispatched:", newWebhook);
    return res.status(200).json({
      success: true,
      message: "Webhook processed and integration event dispatched successfully",
      received: newWebhook
    });
  } catch (error) {
    console.error("[Webhook Bank] Error processing MacroDroid webhook:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process webhook"
    });
  }
});
router.get("/api/webhooks/pending", (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const fresh = pendingWebhooks.filter((w) => w.timestamp > since);
    return res.status(200).json({ webhooks: fresh });
  } catch (error) {
    console.error("[Webhook Bank] Error serving pending webhooks:", error);
    return res.status(500).json({ error: "Failed to fetch pending webhooks" });
  }
});
router.get("/api/webhooks/push-public-key", (req, res) => {
  try {
    return res.status(200).json({ publicKey: getPublicKey() });
  } catch (error) {
    console.error("[Push Service] Error retrieving public VAPID key:", error);
    return res.status(500).json({ error: "Failed to load public key" });
  }
});
router.post("/api/webhooks/push-subscribe", (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Missing subscription object" });
    }
    addSubscription(subscription);
    return res.status(200).json({ success: true, message: "Subscription added successfully" });
  } catch (error) {
    console.error("[Push Service] Error registering subscription:", error);
    return res.status(500).json({ error: "Failed to register subscription" });
  }
});
var server_default = router;

// server.ts
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.use(import_express2.default.json({ limit: "50mb" }));
  app.use(import_express2.default.urlencoded({ extended: true, limit: "50mb" }));
  app.post("/api/google-proxy", async (req, res) => {
    try {
      const { url, method, headers, body } = req.body;
      if (!url) {
        return res.status(400).json({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          error: "URL is required"
        });
      }
      const fetchHeaders = {};
      if (headers) {
        Object.entries(headers).forEach(([key, val]) => {
          fetchHeaders[key] = String(val);
        });
      }
      const fetchOptions = {
        method: method || "GET",
        headers: fetchHeaders
      };
      if (body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      const googleResponse = await fetch(url, fetchOptions);
      const responseText = await googleResponse.text();
      const responseHeaders = {};
      googleResponse.headers.forEach((val, key) => {
        if (["content-type"].includes(key.toLowerCase())) {
          responseHeaders[key] = val;
        }
      });
      res.status(googleResponse.status).json({
        ok: googleResponse.ok,
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        headers: responseHeaders,
        data: responseText
      });
    } catch (err) {
      console.error("Error in google-proxy:", err);
      res.status(500).json({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        error: err.message || String(err)
      });
    }
  });
  app.use(server_default);
  app.post("/api/ai/suggest-category", async (req, res) => {
    try {
      const { descricao, valor, bancoNome, historico } = req.body;
      if (!descricao) {
        return res.status(400).json({ error: "Descri\xE7\xE3o da transa\xE7\xE3o \xE9 obrigat\xF3ria." });
      }
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not defined, returning fallback category suggestion.");
        return res.json({
          categoria: "OUTROS",
          justificativa: "Intelig\xEAncia Artificial indispon\xEDvel (chave de API ausente).",
          fallback: true
        });
      }
      const ai = getGeminiClient();
      const prompt = `Sugira a categoria mais precisa para esta nova transa\xE7\xE3o financeira baseando-se no hist\xF3rico fornecido.

Nova Transa\xE7\xE3o:
Descri\xE7\xE3o: "${descricao}"
Valor: R$ ${valor || 0}
Banco: "${bancoNome || "Banco"}"

Hist\xF3rico de transa\xE7\xF5es passadas do usu\xE1rio (formato JSON):
${JSON.stringify(historico || [])}
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Voc\xEA \xE9 um assistente especialista em finan\xE7as pessoais e classificador de transa\xE7\xF5es. Analise as descri\xE7\xF5es, estabelecimentos, bancos e valores no hist\xF3rico do usu\xE1rio para sugerir a categoria ideal com m\xE1xima precis\xE3o. Prefira reutilizar as categorias que o usu\xE1rio j\xE1 possui no seu hist\xF3rico (como TRABALHO, CONSUMO, ABASTECIMENTO, CASA, OUTROS, SA\xDADE, VIAGEM, SUPERMERCADO, etc.) em letras mai\xFAsculas. Retorne obrigatoriamente no formato JSON fornecido pelo schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              categoria: {
                type: import_genai.Type.STRING,
                description: "A categoria sugerida baseada no hist\xF3rico ou sem\xE2ntica da transa\xE7\xE3o, em letras MAI\xDASCULAS."
              },
              justificativa: {
                type: import_genai.Type.STRING,
                description: "Breve explica\xE7\xE3o em portugu\xEAs sobre a recomenda\xE7\xE3o baseada no hist\xF3rico."
              }
            },
            required: ["categoria", "justificativa"]
          }
        }
      });
      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json({
        categoria: String(parsed.categoria || "OUTROS").toUpperCase(),
        justificativa: parsed.justificativa || "Sugerido com base na descri\xE7\xE3o.",
        fallback: false
      });
    } catch (err) {
      console.error("Error in suggest-category API:", err);
      res.json({
        categoria: "OUTROS",
        justificativa: "Erro no processamento da sugest\xE3o da IA: " + (err.message || String(err)),
        fallback: true
      });
    }
  });
  app.post("/api/ai/daily-tip", async (req, res) => {
    try {
      const { summary, recentTransactions } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not defined, returning fallback daily tip.");
        return res.json({
          titulo: "Mantenha o Foco no Equil\xEDbrio Financeiro",
          dica: "Acompanhe seus gastos diariamente para identificar pequenas taxas e consumos desnecess\xE1rios que acumulam ao longo do m\xEAs.",
          categoria_foco: "Geral",
          tipo_acao: "Otimiza\xE7\xE3o de Custos",
          acao_sugerida: "Revise suas assinaturas recorrentes hoje e cancele as que n\xE3o utiliza.",
          fallback: true
        });
      }
      const ai = getGeminiClient();
      const prompt = `Analise o resumo financeiro e as transa\xE7\xF5es recentes do usu\xE1rio e gere uma Dica do Dia de Gest\xE3o Financeira altamente personalizada, motivacional ou de otimiza\xE7\xE3o de custos.

Resumo Financeiro do Usu\xE1rio:
${JSON.stringify(summary || {}, null, 2)}

Transa\xE7\xF5es Recentes (Amostra):
${JSON.stringify(recentTransactions || [], null, 2)}
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "Voc\xEA \xE9 um especialista e mentor em finan\xE7as pessoais. Analise os dados do usu\xE1rio (total de receitas, despesas, saldo, maiores categorias de gastos) e crie uma Dica do Dia pr\xE1tica, inspiradora e acion\xE1vel em portugu\xEAs do Brasil. O tom deve ser encorajador, profissional e focado em bem-estar e otimiza\xE7\xE3o financeira. Retorne estritamente um JSON no formato definido pelo schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              titulo: {
                type: import_genai.Type.STRING,
                description: "T\xEDtulo curto e chamativo para a Dica do Dia (m\xE1ximo 60 caracteres)."
              },
              dica: {
                type: import_genai.Type.STRING,
                description: "A dica principal explicativa baseada no padr\xE3o de gastos do usu\xE1rio (2 a 4 frases)."
              },
              categoria_foco: {
                type: import_genai.Type.STRING,
                description: "A categoria ou \xE1rea principal a que a dica se refere (ex: Alimenta\xE7\xE3o, Lazer, Reserva de Emerg\xEAncia, Planejamento Geral)."
              },
              tipo_acao: {
                type: import_genai.Type.STRING,
                description: "Tipo do conselho (ex: Otimiza\xE7\xE3o de Custos, Motivacional, Alerta de Gastos, Planejamento)."
              },
              acao_sugerida: {
                type: import_genai.Type.STRING,
                description: "Micro-a\xE7\xE3o acion\xE1vel e simples recomendada para o usu\xE1rio realizar hoje (1 frase curta)."
              }
            },
            required: ["titulo", "dica", "categoria_foco", "tipo_acao", "acao_sugerida"]
          }
        }
      });
      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json({
        titulo: parsed.titulo || "Dica do Dia Finan\xE7as",
        dica: parsed.dica || "Acompanhe seus gastos regularmente para manter o controle total da sua sa\xFAde financeira.",
        categoria_foco: parsed.categoria_foco || "Geral",
        tipo_acao: parsed.tipo_acao || "Otimiza\xE7\xE3o de Custos",
        acao_sugerida: parsed.acao_sugerida || "Aproveite para categorizar todas as transa\xE7\xF5es pendentes de hoje.",
        fallback: false
      });
    } catch (err) {
      console.error("Error in daily-tip API:", err);
      res.json({
        titulo: "Construindo H\xE1bitos Financeiros Saud\xE1veis",
        dica: "A chave para uma vida financeira est\xE1vel \xE9 manter o h\xE1bito constante de registrar entradas e sa\xEDdas e revisar os totais por categoria.",
        categoria_foco: "Geral",
        tipo_acao: "Motivacional",
        acao_sugerida: "Defina uma meta simples de economia para este m\xEAs.",
        fallback: true
      });
    }
  });
  app.get("/manifest.json", (req, res) => {
    res.sendFile(import_path2.default.resolve(process.cwd(), "manifest.json"));
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      try {
        const fs2 = await import("fs");
        let html = fs2.readFileSync(import_path2.default.resolve(process.cwd(), "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
