import { auth, onAuthStateChanged, db, doc, getDoc } from '../firebase/firebase-config.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        const uid = user.uid;

        // Pega referência do documento do usuário no Firestore
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

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

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            // Atualiza a página com os dados do usuário
            document.querySelector('.logo-perfil-info').textContent = userData.initials || 'DE';
            document.querySelector('.perfil-info h2').textContent = userData.displayName || 'Debatedor Exemplar';
            document.querySelector('.perfil-info p').textContent = `Nível ${userData.level || 1} - Debatedor`;

            document.querySelector('.perfil-titulos h2').textContent = userData.displayName || 'Debatedor Exemplar';
            document.querySelector('.perfil-titulos p').textContent = `Membro desde ${userData.memberSince || 'Janeiro 2023'}`;

            document.querySelectorAll('.stricks-perfil .stricks-sub p')[0].textContent = 'Sequência';
            document.querySelectorAll('.stricks-perfil .stricks-sub h4')[0].textContent = `${userData.streak || 0} Dias`;

            document.querySelectorAll('.stricks-perfil .stricks-sub p')[1].textContent = 'Pontos';
            document.querySelectorAll('.stricks-perfil .stricks-sub h4')[1].textContent = `${userData.xp || 0} XP`;

            document.querySelectorAll('.stricks-perfil .stricks-sub p')[2].textContent = 'Nível';
            document.querySelectorAll('.stricks-perfil .stricks-sub h4')[2].textContent = userData.level || 1;

            // Estatísticas
            document.querySelector('.estatisticas-todos:nth-child(1) .numero-estatistica').textContent = userData.debatesWon ?? 0;
            document.querySelector('.estatisticas-todos:nth-child(2) .numero-estatistica').textContent = userData.debatesLost ?? 0;
            document.querySelector('.estatisticas-todos:nth-child(3) .numero-estatistica').textContent = userData.debatesTied ?? 0;
            document.querySelector('.estatisticas-todos:nth-child(4) .numero-estatistica').textContent = userData.category || 'Tecnologia';
            document.querySelector('.estatisticas-todos:nth-child(5) .numero-estatistica').textContent = `${userData.averageScore ?? 0}%`;


            // Progresso tópicos
            document.querySelector('.completos p span').textContent = userData.topicsCompleted || 0;
            document.querySelector('.em-progresso p span').textContent = userData.topicsInProgress || 0;

            // Conquistas (se quiser, dá pra popular dinamicamente também)
        } else {
            console.log('Documento do usuário não encontrado.');
            // Pode redirecionar para página de cadastro ou mostrar mensagem
        }
    } else {
        // Usuário não está logado, redirecionar para login
        window.location.href = '/pages/login.html';
    }
});
