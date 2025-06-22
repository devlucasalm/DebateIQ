// server/servidor.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000; // Define a porta do servidor, usa 3000 por padrão

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
    const { argumentsText } = req.body;

    if (!argumentsText || argumentsText.length < 50) {
        return res.status(400).json({ message: "Texto do argumento inválido ou muito curto (mínimo 50 caracteres)." });
    }

    try {
        // CORRIGIDO: Uso de template literal (``) para o prompt
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

        res.status(200).json(geminiAnalysis);

    } catch (error) {
        console.error("Erro ao chamar a API do Gemini:", error);
        res.status(500).json({ message: "Erro ao analisar o argumento. Tente novamente mais tarde.", error: error.message });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    // CORRIGIDO: Uso de template literal (``) para os logs de inicialização
    console.log(`Servidor Node.js rodando em http://localhost:${PORT}`);
    console.log(`Para testar, faça um POST para http://localhost:${PORT}/analyze-argument`);
});