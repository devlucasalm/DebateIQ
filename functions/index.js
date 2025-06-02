// functions/index.js

// Imports ESSENCIAIS para Firebase Cloud Functions e Admin SDK
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(); // Inicializa o Admin SDK

// Import para o Google Generative AI (Gemini)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- A SUA CLOUD FUNCTION analyzeArguments ---
// Usamos "onCall" porque seu frontend está chamando com httpsCallable
exports.analyzeArguments = functions.https.onCall(async (data, context) => {
    // A chave do Gemini DEVE vir das configurações do Firebase Functions.
    // NUNCA use process.env.GEMINI_API_KEY diretamente em uma função implantada.
    // Se você usa o Firebase Emulator localmente e definiu GEMINI_API_KEY_ENV
    // em functions/.env, use isso.
    const geminiApiKey = functions.config().gemini?.key ||
                         process.env.GEMINI_API_KEY_ENV;

    if (!geminiApiKey) {
        console.error("ERRO: Chave da API Gemini não configurada! " +
                      "Verifique firebase functions:config:set e/ou functions/.env para emulação.");
        throw new functions.https.HttpsError(
            "internal",
            "Chave da API Gemini não configurada no servidor.",
        );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Verificação de autenticação (MUITO IMPORTANTE para funções sensíveis)
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "A requisição requer autenticação. Por favor, faça login.",
        );
    }

    const argumentsText = data.argumentsText; // Os dados enviados do frontend vêm em 'data'

    if (!argumentsText || typeof argumentsText !== "string") {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O texto do argumento é obrigatório e deve ser uma string.",
        );
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // O prompt para o Gemini
        const prompt = `Analise os seguintes argumentos e forneça:
        1. Pontos fortes (listar 3-5)
        2. Pontos fracos (listas 3-5)
        3. Pontos a melhorar (listar 3-5)
        4. Uma pontuação de 0 a 10 (apenas o número)
        5. Um valor de XP (apenas o número, entre 50 e 500)

        Formato de saída esperado (JSON):
        {
            "pontosFortes": [],
            "pontosFracos": [],
            "pontosMelhorar": [],
            "pontuacao": 0,
            "xp": 0
        }

        Argumentos para análise:
        "${argumentsText}"`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text(); // O texto gerado pelo Gemini

        // Tenta parsear o texto como JSON
        let geminiOutput;
        try {
            geminiOutput = JSON.parse(text);
        } catch (parseError) {
            console.error("Erro ao fazer parse do JSON do Gemini:", parseError);
            console.error("Texto bruto do Gemini recebido do Gemini:", text);
            // Lança um erro HttpsError para o frontend se o JSON for inválido
            throw new functions.https.HttpsError(
                "internal",
                "Erro ao processar a resposta do Gemini. Formato inválido.",
                { rawResponse: text }, // Envia a resposta bruta para depuração
            );
        }

        // Retorna o objeto JSON do Gemini para o frontend
        return geminiOutput;
    } catch (error) {
        console.error("Erro geral na Cloud Function analyzeArguments:", error);
        // Lança um erro HttpsError para o frontend em caso de falha
        throw new functions.https.HttpsError(
            "internal",
            "Erro ao processar a requisição com o Gemini.",
            error.message || "Erro desconhecido", // Envia a mensagem de erro para o frontend
        );
    }
});
