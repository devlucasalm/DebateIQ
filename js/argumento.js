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

let userId = null;  // declara aqui para usar em todo o arquivo

document.addEventListener('DOMContentLoaded', () => {
    // Usa onAuthStateChanged para pegar o usuário atual
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log("Usuário não autenticado, redirecionando para login");
            window.location.href = 'login.html';
            return;
        }

        userId = user.uid;  // atribui o userId aqui dentro, onde user existe

        try {
            await loadUserData(user);
            await loadDailyChallenge();
        } catch (error) {
            console.error("Erro ao carregar dados da dashboard:", error);
        }
    });
});

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
                levelElement.textContent = `Nível ${userData.level || 1} - ${getRankTitle(userData.level || 1)}`;
            }
        } else {
            console.warn("Dados do usuário não encontrados no Firestore");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
    }
}

async function loadDailyChallenge() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const q = query(
            collection(db, 'dailyChallenges'),
            where('date', '==', today),
            limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const challengeDoc = querySnapshot.docs[0];
            const challenge = challengeDoc.data();
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
                if (timeElement) timeElement.textContent = `⏱️ ${challenge.time || 10} minutos`;

                if (startBtn) {
                    startBtn.onclick = () => window.location.href = `/pages/argumento.html?challenge=${challengeDoc.id}`;
                }
            }
        } else {
            console.log("Nenhum desafio diário encontrado para hoje");
        }
    } catch (error) {
        console.error("Erro ao carregar desafio diário:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('campoArgumento');
    const contador = document.getElementById('contador');
    const botaoEnviar = document.getElementById('enviarArgumento');

    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        contador.textContent = `${length} caracteres (mínimo 50)`;
    });

    botaoEnviar.addEventListener('click', async () => {
        if (!userId) {
            alert('Usuário não autenticado. Por favor, faça login novamente.');
            return;
        }

        const texto = textarea.value.trim();

        if (texto.length < 50) {
            alert('Seu argumento deve conter pelo menos 50 caracteres.');
            return;
        }

        try {
            await addDoc(collection(db, 'arguments'), {
                userId: userId,
                content: texto,
                createdAt: serverTimestamp(),
            });

            alert('Argumento enviado com sucesso!');
            textarea.value = '';
            contador.textContent = '0 caracteres (mínimo 50)';
        } catch (error) {
            console.error('Erro ao enviar argumento:', error);
            alert('Erro ao enviar argumento. Tente novamente.');
        }
    });
});


