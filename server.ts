import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Route for Google proxy
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

      // Safe headers copy
      const fetchHeaders: Record<string, string> = {
        'Accept': 'application/json, text/plain, */*'
      };
      if (headers) {
        Object.entries(headers).forEach(([key, val]) => {
          fetchHeaders[key] = String(val);
        });
      }

      const reqMethod = (method || "GET").toUpperCase();
      const reqBody = body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;

      // 1. Send initial request with manual redirect handling to prevent fetch from converting POST -> GET on 302
      let googleResponse = await fetch(url, {
        method: reqMethod,
        headers: fetchHeaders,
        body: reqMethod !== "GET" && reqMethod !== "HEAD" ? reqBody : undefined,
        redirect: 'manual'
      });

      // 2. Handle Google Apps Script 301, 302, 303, 307, 308 redirects manually
      // Note: Google Apps Script Web App redirects to script.googleusercontent.com/macros/echo?...
      // That redirected endpoint MUST ALWAYS be fetched with method GET and NO body!
      if ([301, 302, 303, 307, 308].includes(googleResponse.status)) {
        const redirectUrl = googleResponse.headers.get('location');
        if (redirectUrl) {
          googleResponse = await fetch(redirectUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json, text/plain, */*'
            }
          });
        }
      }

      const responseText = await googleResponse.text();

      // Forward response headers that are safe
      const responseHeaders: Record<string, string> = {};
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
        data: responseText,
      });
    } catch (err: any) {
      console.error("Error in google-proxy:", err);
      res.status(500).json({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        error: err.message || String(err),
      });
    }
  });

  // AI API to suggest category based on past transaction history
  app.post("/api/ai/suggest-category", async (req, res) => {
    try {
      const { descricao, valor, bancoNome, historico } = req.body;
      
      if (!descricao) {
        return res.status(400).json({ error: "Descrição da transação é obrigatória." });
      }

      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not defined, returning fallback category suggestion.");
        return res.json({
          categoria: "OUTROS",
          justificativa: "Inteligência Artificial indisponível (chave de API ausente).",
          fallback: true
        });
      }

      const ai = getGeminiClient();
      
      const prompt = `Sugira a categoria mais precisa para esta nova transação financeira baseando-se no histórico fornecido.

Nova Transação:
Descrição: "${descricao}"
Valor: R$ ${valor || 0}
Banco: "${bancoNome || 'Banco'}"

Histórico de transações passadas do usuário (formato JSON):
${JSON.stringify(historico || [])}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um assistente especialista em finanças pessoais e classificador de transações. Analise as descrições, estabelecimentos, bancos e valores no histórico do usuário para sugerir a categoria ideal com máxima precisão. Prefira reutilizar as categorias que o usuário já possui no seu histórico (como TRABALHO, CONSUMO, ABASTECIMENTO, CASA, OUTROS, SAÚDE, VIAGEM, SUPERMERCADO, etc.) em letras maiúsculas. Retorne obrigatoriamente no formato JSON fornecido pelo schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categoria: {
                type: Type.STRING,
                description: "A categoria sugerida baseada no histórico ou semântica da transação, em letras MAIÚSCULAS."
              },
              justificativa: {
                type: Type.STRING,
                description: "Breve explicação em português sobre a recomendação baseada no histórico."
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
        justificativa: parsed.justificativa || "Sugerido com base na descrição.",
        fallback: false
      });
    } catch (err: any) {
      console.warn("AI suggest-category fallback used:", err?.message || String(err));
      res.json({
        categoria: "OUTROS",
        justificativa: "Erro no processamento da sugestão da IA: " + (err.message || String(err)),
        fallback: true
      });
    }
  });

  // AI API to generate "Dica do Dia" based on user spending history
  app.post("/api/ai/daily-tip", async (req, res) => {
    try {
      const { summary, recentTransactions } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not defined, returning fallback daily tip.");
        return res.json({
          titulo: "Mantenha o Foco no Equilíbrio Financeiro",
          dica: "Acompanhe seus gastos diariamente para identificar pequenas taxas e consumos desnecessários que acumulam ao longo do mês.",
          categoria_foco: "Geral",
          tipo_acao: "Otimização de Custos",
          acao_sugerida: "Revise suas assinaturas recorrentes hoje e cancele as que não utiliza.",
          fallback: true
        });
      }

      const ai = getGeminiClient();

      const prompt = `Analise o resumo financeiro e as transações recentes do usuário e gere uma Dica do Dia de Gestão Financeira altamente personalizada, motivacional ou de otimização de custos.

Resumo Financeiro do Usuário:
${JSON.stringify(summary || {}, null, 2)}

Transações Recentes (Amostra):
${JSON.stringify(recentTransactions || [], null, 2)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um especialista e mentor em finanças pessoais. Analise os dados do usuário (total de receitas, despesas, saldo, maiores categorias de gastos) e crie uma Dica do Dia prática, inspiradora e acionável em português do Brasil. O tom deve ser encorajador, profissional e focado em bem-estar e otimização financeira. Retorne estritamente um JSON no formato definido pelo schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titulo: {
                type: Type.STRING,
                description: "Título curto e chamativo para a Dica do Dia (máximo 60 caracteres)."
              },
              dica: {
                type: Type.STRING,
                description: "A dica principal explicativa baseada no padrão de gastos do usuário (2 a 4 frases)."
              },
              categoria_foco: {
                type: Type.STRING,
                description: "A categoria ou área principal a que a dica se refere (ex: Alimentação, Lazer, Reserva de Emergência, Planejamento Geral)."
              },
              tipo_acao: {
                type: Type.STRING,
                description: "Tipo do conselho (ex: Otimização de Custos, Motivacional, Alerta de Gastos, Planejamento)."
              },
              acao_sugerida: {
                type: Type.STRING,
                description: "Micro-ação acionável e simples recomendada para o usuário realizar hoje (1 frase curta)."
              }
            },
            required: ["titulo", "dica", "categoria_foco", "tipo_acao", "acao_sugerida"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      res.json({
        titulo: parsed.titulo || "Dica do Dia Finanças",
        dica: parsed.dica || "Acompanhe seus gastos regularmente para manter o controle total da sua saúde financeira.",
        categoria_foco: parsed.categoria_foco || "Geral",
        tipo_acao: parsed.tipo_acao || "Otimização de Custos",
        acao_sugerida: parsed.acao_sugerida || "Aproveite para categorizar todas as transações pendentes de hoje.",
        fallback: false
      });
    } catch (err: any) {
      console.warn("AI daily-tip fallback used:", err?.message || String(err));
      res.json({
        titulo: "Construindo Hábitos Financeiros Saudáveis",
        dica: "A chave para uma vida financeira estável é manter o hábito constante de registrar entradas e saídas e revisar os totais por categoria.",
        categoria_foco: "Geral",
        tipo_acao: "Motivacional",
        acao_sugerida: "Defina uma meta simples de economia para este mês.",
        fallback: true
      });
    }
  });

  // Serve manifest.json explicitly from the root directory
  app.get("/manifest.json", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "manifest.json"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html for non-API routes in dev mode
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      try {
        const fs = await import("fs");
        let html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
