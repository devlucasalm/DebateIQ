import { auth, onAuthStateChanged, db, doc, getDoc } from '../firebase/firebase-config.js';

function formatMemberSinceDate(timestamp) {
    if (!timestamp) {
        return 'Janeiro 2023'; 
    }

    let date;

    if (typeof timestamp.toDate === 'function') { 
        date = timestamp.toDate();
    } else if (typeof timestamp.seconds === 'number') { 
        date = new Date(timestamp.seconds * 1000); 
    } else { 
        try {
            date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                 console.warn("Formato de data string inesperado para createdAt:", timestamp);
                return 'Data Indisponível';
            }
        } catch (e) {
             console.warn("Erro ao converter formato de data inesperado:", timestamp, e);
            return 'Data Indisponível';
        }
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('pt-BR', options);
}

// Função para pegar as iniciais do nome
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;

    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.log('Documento do usuário não encontrado.');
      return;
    }

    const userData = userDocSnap.data();

    // ELEMENTOS NO HEADER
    const profileImgHeader = document.querySelector('.logo-perfil img');
    const profileInitialsHeader = document.querySelector('.logo-perfil-info');
    const profileNameHeader = document.querySelector('.perfil-info .infos h2');
    const profileLevelHeader = document.querySelector('.perfil-info .infos p');

    // ELEMENTOS NO CONTAINER DE PERFIL
    const containerLogoInfos = document.querySelector('.perfil-container-infos .logo-infos');
    const containerProfileName = document.querySelector('.perfil-container-infos .perfil-titulos h2');
    const containerMemberSince = document.querySelector('.perfil-container-infos .perfil-titulos p');

    // Atualiza imagem e iniciais no header
    if (userData.photoURL) {
      profileImgHeader.src = userData.photoURL;
      profileImgHeader.style.display = 'block';
      profileInitialsHeader.style.display = 'none';
    } else {
      profileInitialsHeader.textContent = getInitials(userData.displayName || 'Debatedor Exemplar');
      profileImgHeader.style.display = 'none';
      profileInitialsHeader.style.display = 'flex';
    }

    // Nome e nível no header
    profileNameHeader.textContent = userData.displayName || 'Debatedor Exemplar';
    profileLevelHeader.textContent = `Nível ${userData.rank || 1} - Debatedor`;

    // Atualiza logo do container do perfil
    if (userData.photoURL) {
      containerLogoInfos.innerHTML = `<img src="${userData.photoURL}" alt="Foto de perfil" style="width: 75px; height: 75px; border-radius: 50%; object-fit: cover;">`;
    } else {
      containerLogoInfos.textContent = getInitials(userData.displayName || 'DE');
      Object.assign(containerLogoInfos.style, {
        backgroundColor: '#004d40',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '28px',
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      });
    }

    // Nome e membro desde
    containerProfileName.textContent = userData.displayName || 'Debatedor Exemplar';
containerMemberSince.textContent = `Membro desde ${formatMemberSinceDate(userData.createdAt)}`;    

    // Atualiza sequência, XP e nível
    const stricksP = document.querySelectorAll('.stricks-perfil .stricks-sub p');
    const stricksH4 = document.querySelectorAll('.stricks-perfil .stricks-sub h4');

    stricksP[0].textContent = 'Sequência';
    stricksH4[0].textContent = `${userData.streak || 0} Dias`;

    stricksP[1].textContent = 'Pontos';
    stricksH4[1].textContent = `${userData.xp || 0} XP`;

    stricksP[2].textContent = 'Nível';
    stricksH4[2].textContent = userData.level || 1;

    // Atualiza estatísticas
    const estatisticas = document.querySelectorAll('.estatisticas-todos .numero-estatistica');
    estatisticas[0].textContent = userData.debatesWon ?? 0;
    estatisticas[1].textContent = userData.debatesLost ?? 0;
    estatisticas[2].textContent = userData.debatesTied ?? 0;
    estatisticas[3].textContent = userData.category || 'Debatedor';
    estatisticas[4].textContent = `${userData.averageScore ?? 0}%`;

  } else {
    window.location.href = '/pages/login.html';
  }
});



function getRankTitle(level) {
  if (level < 5) return 'Iniciante';
  if (level < 10) return 'Debatedor';
  if (level < 15) return 'Experiente';
  return 'Mestre';
}

