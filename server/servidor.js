// server/servidor.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000; // Define a porta do servidor, usa 3000 por padrão

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Agora você pode usar db.collection(...) etc.

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
// Permite que seu frontend (rodando em outro domínio/porta) acesse este servidor
app.use(cors({
    origin: '*', // Permite todas as origens. Para produção, substitua '*' pelo domínio do seu frontend (ex: 'http://localhost:8080' ou 'https://seusite.com')
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
}));

// Middleware para fazer o parse do corpo das requisições JSON
app.use(express.json());

// Inicializa a API do Gemini
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error("ERRO: A variável de ambiente GEMINI_API_KEY não está definida no arquivo .env");
    process.exit(1); // Encerra o processo se a chave não estiver configurada
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });



// Rota para analisar argumentos com a API do Gemini
app.post('/analyze-argument', async (req, res) => {
    const { argumentsText, userId } = req.body;

    if (!argumentsText || argumentsText.length < 50) {
        return res.status(400).json({ message: "Texto do argumento inválido ou muito curto (mínimo 50 caracteres)." });
    }

    try {
        // CORRIGIDO: Uso de template literal (``) para o prompt
        const prompt = `Analise os seguintes argumentos e forneça uma avaliação detalhada baseada em:
1.  **Clareza e Coerência:** Quão fácil é entender o argumento e suas conexões lógicas.
2.  **Relevância:** O quanto o argumento se mantém focado no tópico e na questão central.
3.  **Poder de Persuasão:** A capacidade do argumento de convencer o leitor, mesmo sem dados externos.
4.  **Profundidade:** O nível de desenvolvimento das ideias e a exploração do tema.

Com base nesta análise, forneça:

1. Pontos fortes (listar 2-3)
2. Pontos fracos (listas 2-3)
3. Pontos a melhorar (listar 2-3)
4. Uma pontuação de 0 a 10 (apenas o número), **onde 0 indica um argumento ineficaz e 10 indica um argumento excepcionalmente bem construído, claro e persuasivo.**
5. Um valor de XP (apenas o número, entre 50 e 500) **que deve ser diretamente proporcional à pontuação. Argumentos com pontuações mais altas devem receber significativamente mais XP.**

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
        const response = await result.response;
        const text = response.text(); // Pega o texto bruto da resposta do Gemini

        console.log("Resposta bruta do Gemini recebida:", text);

        let geminiAnalysis;
        try {
            // CORRIGIDO: Regex para extrair o JSON de um bloco de código Markdown (```json...```)
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                geminiAnalysis = JSON.parse(jsonMatch[1]);
            } else {
                // Se não for um bloco de código, tenta fazer o parse direto
                geminiAnalysis = JSON.parse(text);
            }
        } catch (jsonParseError) {
            console.error("Erro ao fazer parse do JSON da resposta do Gemini:", jsonParseError);
            console.error("Texto que tentou ser parseado:", text);
            return res.status(500).json({ message: "Erro interno: Resposta do Gemini em formato inválido." });
        }

        if ((geminiAnalysis.xp || 0) > 320 && userId) {
            try {
                const userDocRef = db.collection('users').doc(userId);
                const userDocSnap = await userDocRef.get();

                let displayName = 'Anônimo';
                if (userDocSnap.exists) {
                    const userData = userDocSnap.data();
                    displayName = userData.displayName || 'Anônimo';
                }

                await db.collection('communityArgument').add({
                    userId,
                    autor: displayName,
                    content: argumentsText,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    pontuacao: geminiAnalysis.pontuacao || 0,
                    xp: geminiAnalysis.xp || 0
                });
                console.log("Argumento com mais de 200 XP salvo em 'communityArgument'.");
            } catch (err) {
                console.error("Erro ao salvar em 'communityArgument':", err);
            }
        }

        res.status(200).json(geminiAnalysis);

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        res.status(500).json({ message: "Erro ao analisar o argumento. Tente novamente mais tarde.", error: error.message });
    }
});

// Nova rota para salvar XP do usuário no Firestore
app.post('/save-xp', async (req, res) => {
    const { userId, xp } = req.body;

    if (!userId || typeof xp !== 'number') {
        return res.status(400).json({ message: "Parâmetros inválidos. Esperado: userId e xp (número)." });
    }

    try {
        const userRef = db.collection('users').doc(userId);

        // Incrementa o campo 'xp' no documento do usuário
        await userRef.set({
            xp: admin.firestore.FieldValue.increment(xp)
        }, { merge: true });

        res.status(200).json({ message: "XP salvo com sucesso!" });

    } catch (error) {
        console.error("Erro ao salvar XP:", error);
        res.status(500).json({ message: "Erro ao salvar XP.", error: error.message });
    }
});



app.post('/complete-challenge', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "O ID do usuário (userId) é obrigatório." });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const today = new Date().toISOString().split('T')[0];

    await userRef.set({
      completedChallenges: admin.firestore.FieldValue.increment(1),
      lastChallengeDate: today,  // salva a data do último desafio concluído
    }, { merge: true });

    console.log(`'completedChallenges' incrementado e lastChallengeDate atualizado para o usuário ${userId}`);
    res.status(200).json({ message: "Progresso atualizado com sucesso!" });

  } catch (error) {
    console.error("Erro ao incrementar completedChallenges:", error);
    res.status(500).json({ message: "Erro ao atualizar progresso.", error: error.message });
  }
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${PORT}`);
    console.log(`Para testar, faça um POST para http://localhost:${PORT}/analyze-argument`);
});