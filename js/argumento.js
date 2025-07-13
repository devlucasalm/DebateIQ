// /js/argumento.js

// Imports do Firebase (manter o que ainda usa)
import {
    auth,
    db,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    collection,
    limit,
    orderBy,
    updateDoc,
    addDoc,
    serverTimestamp,
    onAuthStateChanged
} from '../firebase/firebase-config.js';

let userId = null; // Declarado aqui para ser acessível globalmente no módulo
let currentDailyChallenge = null; // Adicionado para armazenar o desafio encontrado

const NODE_SERVER_URL = 'https://debateiq-backend.onrender.com';

// Único listener para DOMContentLoaded - garante que o DOM está completamente carregado
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO DE AUTENTICAÇÃO E CARREGAMENTO DE DADOS ---
    // Monitora o estado de autenticação do usuário
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("Usuário não autenticado, redirecionando para login");
            window.location.href = 'login.html'; // Redireciona se o usuário não estiver logado
            return;
        }

        userId = user.uid; // Atribui o ID do usuário logado

        try {
            // Carrega os dados do usuário e o desafio diário após autenticação
            await loadUserData(user);
          //  await loadDailyChallenge();
        } catch (error) {
            console.error("Erro ao carregar dados da dashboard em argumento.html:", error);
        }
    });

    // --- 2. REFERÊNCIAS DOS ELEMENTOS DO DOM ---
    // Obtém referências a todos os elementos HTML necessários usando seus IDs
    const btnFavor = document.getElementById('btnFavor');
    const btnContra = document.getElementById('btnContra');
    const buttons = [btnFavor, btnContra]; // Array para facilitar a manipulação dos botões de posição

    const textarea = document.getElementById('campoArgumento');
    const contador = document.getElementById('contador');
    const botaoEnviar = document.getElementById('enviarArgumento');

    // Referências para o modal de feedback e seus elementos internos
    const modal = document.querySelector('.modal'); // O modal principal que você já tem
    const btnContinuar = document.getElementById('btnContinuarModal'); // O botão "Continuar" dentro do modal
    const toastContainer = document.getElementById('toast-container'); // Se você ainda estiver usando um toast

    // Elementos dentro do modal para exibir o feedback do Gemini
    // geminiDynamicContent engloba loading, error e resultsContent
    const geminiDynamicContent = document.getElementById('geminiDynamicContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const resultsContent = document.getElementById('resultsContent'); // O contêiner para os resultados reais (pontuação, listas)

    const resultadoPontuacao = document.getElementById('resultadoPontuacao');
    const resultadoXP = document.getElementById('resultadoXP');
    const listaPontosFortes = document.getElementById('listaPontosFortes');
    const listaPontosFracos = document.getElementById('listaPontosFracos'); // Usado para 'Pontos adicionais a considerar'
    const listaPontosMelhorar = document.getElementById('listaPontosMelhorar'); // Usado para 'Sugestões de melhoria'

    // --- 3. LISTENERS DE EVENTOS ---

    // Listener para os botões "A Favor" e "Contra"
    if (btnFavor && btnContra) {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('ativo')); // Remove a classe 'ativo' de todos
                btn.classList.add('ativo'); // Adiciona a classe 'ativo' ao botão clicado
            });
        });
    }

    // Listener para o contador de caracteres do textarea
    if (textarea && contador) {
        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            // CORRIGIDO: Uso de template literal
            contador.textContent = `${length} caracteres (mínimo 50)`;
        });
    }

    // Listener para o botão "Enviar Argumento" - principal lógica de submissão e análise
    if (botaoEnviar) {
        botaoEnviar.addEventListener('click', async () => {
            // Verifica se o usuário está autenticado
            if (!userId) {
                alert('Usuário não autenticado. Por favor, faça login novamente.');
                return;
            }

            const texto = textarea.value.trim();

            // Validação mínima do argumento
            if (texto.length < 50) {
                alert('Seu argumento deve conter pelo menos 50 caracteres.');
                return;
            }

            // ABRIR O MODAL E PREPARAR PARA CARREGAMENTO
            if (modal) modal.style.display = 'flex'; // Abre o modal

            // Mostra a seção de conteúdo dinâmico do Gemini dentro do modal
            if (geminiDynamicContent) geminiDynamicContent.style.display = 'block';
            // Exibe a mensagem de carregamento e esconde as outras seções
            if (loadingMessage) loadingMessage.style.display = 'block';
            if (errorMessage) errorMessage.style.display = 'none';
            if (resultsContent) resultsContent.style.display = 'none';

            // Limpa os campos de resultado antes de uma nova análise
            if (listaPontosFortes) listaPontosFortes.innerHTML = '';
            if (listaPontosFracos) listaPontosFracos.innerHTML = '';
            if (listaPontosMelhorar) listaPontosMelhorar.innerHTML = '';
            if (resultadoPontuacao) resultadoPontuacao.textContent = '--/10';
            if (resultadoXP) resultadoXP.textContent = '0';

            try {
                // 1. Salva o argumento no Firestore
                await addDoc(collection(db, 'arguments'), {
                    userId: userId,
                    content: texto,
                    createdAt: serverTimestamp(),
                });
                console.log('Argumento salvo no Firestore.');

                // 2. Chama o seu servidor Node.js para análise do Gemini
                const response = await fetch(`${NODE_SERVER_URL}/analyze-argument`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                    },
                    body: JSON.stringify({ argumentsText: texto, userId })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
                }

                const geminiAnalysis = await response.json(); // Os dados retornados pelo servidor Node.js

                try {
                    const argumentosRef = collection(db, 'arguments');

                    // Busca o último argumento adicionado pelo usuário
                    const q = query(argumentosRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(1));
                    const snapshot = await getDocs(q);

                    if (!snapshot.empty) {
                        const docRef = snapshot.docs[0].ref;
                        await updateDoc(docRef, {
                            xp: geminiAnalysis.xp || 0,
                            pontuacao: geminiAnalysis.pontuacao || 0
                        });
                        console.log('Documento atualizado com XP e pontuação.');
                    } else {
                        console.warn('Nenhum argumento encontrado para atualizar.');
                    }
                } catch (updateError) {
                    console.error('Erro ao atualizar argumento com XP/pontuação:', updateError);
                }

                try {
                    const xp = geminiAnalysis.xp || 0;

                    const xpSaveResponse = await fetch(`${NODE_SERVER_URL}/save-xp`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                        },
                        body: JSON.stringify({
                            userId,
                            xp
                        })
                    });

                    const xpSaveResult = await xpSaveResponse.json();
                    console.log('XP salvo no backend:', xpSaveResult.message || xpSaveResult);

                    try {
                        const completeChallengeResponse = await fetch(`${NODE_SERVER_URL}/complete-challenge`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                            },
                            body: JSON.stringify({ userId })
                        });

                        const completeResult = await completeChallengeResponse.json();
                        console.log('Desafio marcado como concluído:', completeResult.message || completeResult);
                    } catch (challengeError) {
                        console.error('Erro ao marcar desafio como concluído:', challengeError);
                    }
                } catch (xpError) {
                    console.error('Erro ao salvar XP no backend:', xpError);
                }

                // Ocultar mensagem de carregamento e exibir os resultados
                if (loadingMessage) loadingMessage.style.display = 'none';
                if (resultsContent) resultsContent.style.display = 'block';

                // Preenche os campos de pontuação e XP
                if (resultadoPontuacao) resultadoPontuacao.textContent = `${geminiAnalysis.pontuacao || '--'}/10`;
                if (resultadoXP) resultadoXP.textContent = geminiAnalysis.xp || '0';

                // Função auxiliar para preencher as listas de feedback
                const populateList = (ulElement, items) => {
                    if (!ulElement) return; // Garante que o elemento existe antes de tentar manipulá-lo
                    ulElement.innerHTML = ''; // Limpa a lista antes de adicionar itens
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        ulElement.appendChild(li);
                    });
                };

                // Preenche as listas com os dados da análise do Gemini
                populateList(listaPontosFortes, geminiAnalysis.pontosFortes || []);
                populateList(listaPontosMelhorar, geminiAnalysis.pontosMelhorar || []);
                populateList(listaPontosFracos, geminiAnalysis.pontosFracos || []);

                // Limpa o campo de texto e o contador após o envio bem-sucedido
                textarea.value = '';
                contador.textContent = '0 caracteres (mínimo 50)';

            } catch (error) {
                // Lidar com erros durante o processo de envio/análise
                console.error('Erro no processo de envio/análise:', error);
                if (loadingMessage) loadingMessage.style.display = 'none'; // Esconde o carregamento
                if (errorMessage) {
                    errorMessage.style.display = 'block'; // Mostra a mensagem de erro
                    errorMessage.textContent = `Erro: ${error.message || 'Ocorreu um erro desconhecido.'} Por favor, tente novamente.`;
                    // Não há error.details diretamente da API fetch, mas pode vir do corpo da resposta de erro
                    if (error.response && error.response.data) {
                        console.error("Detalhes do erro do servidor:", error.response.data);
                        errorMessage.textContent += ` Detalhes: ${JSON.stringify(error.response.data)}`;
                    }
                }
                if (resultsContent) resultsContent.style.display = 'none'; // Garante que os resultados não apareçam com erro
            }
        });
    } else {
        console.error('ERRO CRÍTICO: Botão "Enviar Argumento" (id="enviarArgumento") NÃO ENCONTRADO para anexar listener.');
    }


    // Listener para o botão "Continuar" dentro do modal (fecha o modal)
    if (btnContinuar) {
        btnContinuar.addEventListener('click', () => {
            if (modal) modal.style.display = 'none'; // Fecha o modal
        });
    }

    // Listener para fechar o modal clicando fora do conteúdo
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Verifica se o clique foi no fundo do modal (fora do conteúdo)
                modal.style.display = 'none';
            }
        });
    }

}); // Fim do DOMContentLoaded
let lastChallengeDate = null;

// Carrega dados do usuário (nome, nível, foto de perfil)
async function loadUserData(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();

            const profileImg = document.querySelector('.logo-perfil img');
            const profileInitials = document.querySelector('.logo-perfil-info');

            if (profileImg && profileInitials) {
                if (userData.photoURL) {
                    profileImg.src = userData.photoURL;
                    profileImg.style.display = 'block';
                    profileInitials.style.display = 'none';
                } else {
                    profileInitials.textContent = getInitials(userData.displayName || 'Debatedor Exemplar');
                    profileImg.style.display = 'none';
                    profileInitials.style.display = 'block';
                }
            }

            const nameElement = document.querySelector('.infos h2');
            const levelElement = document.querySelector('.infos p');

            if (nameElement) {
                nameElement.textContent = userData.displayName || 'Debatedor Exemplar';
            }

            if (levelElement) {
                const level = getLevelFromXP(userData.xp || 0);
                levelElement.textContent = `Nível ${level} - ${getRankTitle(level)}`;
            }

            const today = new Date().toISOString().split('T')[0];
            const botaoEnviar = document.getElementById('enviarArgumento');
            if (botaoEnviar) {
                if (lastChallengeDate === today) {
                    botaoEnviar.disabled = true;
                    botaoEnviar.textContent = 'Desafio de hoje já concluído ✅';
                    botaoEnviar.style.backgroundColor = '#999';
                    botaoEnviar.style.cursor = 'not-allowed';
                } else {
                    botaoEnviar.disabled = false;
                    botaoEnviar.textContent = 'Enviar Argumento';
                    botaoEnviar.style.backgroundColor = ''; 
                    botaoEnviar.style.cursor = 'pointer';
                }
            }

        } else {
            console.warn("Dados do usuário não encontrados no Firestore");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

// Carrega o desafio diário
async function loadDailyChallenge() {
    try {
        const today = new Date().toISOString().split('T')[0]; // Obtém a data de hoje no formato AAAA-MM-DD
        const q = query(
            collection(db, 'dailyChallenges'),
            where('date', '==', today),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const challengeDoc = querySnapshot.docs[0];
            const challenge = challengeDoc.data();
            // Define currentDailyChallenge aqui para que o ID possa ser usado no addDoc
            currentDailyChallenge = { id: challengeDoc.id, ...challenge };

            const challengeSection = document.querySelector('.desafio-diario');

            if (challengeSection) {
                const titleElement = challengeSection.querySelector('h2');
                const descriptionElement = challengeSection.querySelector('.descricao');
                const xpElement = challengeSection.querySelector('.xp');
                const timeElement = challengeSection.querySelector('.tempo');
                const startBtn = challengeSection.querySelector('.btn-iniciar');

                if (titleElement) titleElement.textContent = challenge.title || 'Desafio Diário';
                if (descriptionElement) descriptionElement.textContent = challenge.description || 'Participe do desafio de hoje!';
                if (xpElement) xpElement.textContent = `${challenge.xpReward || 50} XP`;
                // CORRIGIDO: Uso de template literal
                if (timeElement) timeElement.textContent = `⏱️ ${challenge.time || 10} minutos`;

                if (startBtn) {
                    startBtn.onclick = () => window.location.href = `/pages/argumento.html`;
                }
            }
        } else {
            console.log("Nenhum desafio diário encontrado para hoje");
            // Se nenhum desafio for encontrado, garanta que currentDailyChallenge seja nulo
            currentDailyChallenge = null;
            const challengeSection = document.querySelector('.desafio-diario');

        }
    } catch (error) {
        console.error("Erro ao carregar desafio diário:", error);
        currentDailyChallenge = null; // Em caso de erro, também define como nulo
    }
}

// Retorna as iniciais de um nome
function getInitials(name) {
    // Adiciona verificação para garantir que o nome não é nulo/vazio
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

// Retorna o título do rank com base no nível
function getLevelFromXP(xp) {
    if (xp < 100) return 1;
    if (xp < 300) return 2;
    if (xp < 600) return 3;
    if (xp < 1000) return 4;
    if (xp < 1500) return 5;
    if (xp < 2100) return 6;
    if (xp < 2800) return 7;
    if (xp < 3600) return 8;
    if (xp < 4500) return 9;
    if (xp < 5500) return 10;
    if (xp < 6600) return 11;
    if (xp < 7800) return 12;
    if (xp < 9100) return 13;
    if (xp < 10500) return 14;
    if (xp < 12000) return 15;
    if (xp < 13600) return 16;
    if (xp < 15300) return 17;
    if (xp < 17100) return 18;
    if (xp < 19000) return 19;
    return 40;
}

function getRankTitle(level) {
    if (level < 10) return 'Iniciante';
    if (level < 15) return 'Debatedor';
    if (level < 20) return 'Experiente';
    return 'Mestre';
}

