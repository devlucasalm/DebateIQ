const apiKey = "AIzaSyBc2YGvRduRKm3Vk5YdYzLj7tQ_XIQj3-4";

async function gerarRespostaGemini(mensagem) {
const resposta = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
    "Content-Type": "application/json"
    },
    body: JSON.stringify({
    contents: [
        { role: "user", parts: [{ text: mensagem }] }
    ]
    })
});

const dados = await resposta.json();
console.log(dados.candidates?.[0]?.content?.parts?.[0]?.text || "Nenhuma resposta");
}
