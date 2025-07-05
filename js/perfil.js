import {
  auth,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from '../firebase/firebase-config.js';

function formatMemberSinceDate(timestamp) {
  if (!timestamp) return 'Janeiro 2023';

  let date;
  if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (typeof timestamp.seconds === 'number') {
    date = new Date(timestamp.seconds * 1000);
  } else {
    try {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Data Indisponível';
    } catch (e) {
      return 'Data Indisponível';
    }
  }

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('pt-BR', options);
}

function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2);
}

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

async function calcularMediaPontuacaoDoUsuario(userId) {
  try {
    const argumentosRef = collection(db, 'arguments');
    const q = query(argumentosRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    let somaXP = 0;
    let total = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.xp) {
        somaXP += data.xp;
        total++;
      }
    });

    if (total === 0) return 0;

    const mediaPontuacao = somaXP / total / 10;
    return mediaPontuacao.toFixed(1); // Ex: "7.5"
  } catch (error) {
    console.error('Erro ao calcular média do Gemini:', error);
    return 0;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/pages/login.html';
    return;
  }

  const uid = user.uid;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    console.log('Documento do usuário não encontrado.');
    return;
  }

  const userData = userDocSnap.data();

  // Header
  const profileImgHeader = document.querySelector('.logo-perfil img');
  const profileInitialsHeader = document.querySelector('.logo-perfil-info');
  const profileNameHeader = document.querySelector('.perfil-info .infos h2');
  const profileLevelHeader = document.querySelector('.perfil-info .infos p');

  if (userData.photoURL) {
    profileImgHeader.src = userData.photoURL;
    profileImgHeader.style.display = 'block';
    profileInitialsHeader.style.display = 'none';
  } else {
    profileInitialsHeader.textContent = getInitials(userData.displayName || 'Debatedor Exemplar');
    profileImgHeader.style.display = 'none';
    profileInitialsHeader.style.display = 'flex';
  }

  profileNameHeader.textContent = userData.displayName || 'Debatedor Exemplar';
  const level = getLevelFromXP(userData.xp || 0);
  profileLevelHeader.textContent = `Nível ${level} - ${getRankTitle(level)}`;

  // Container perfil
  const containerLogoInfos = document.querySelector('.perfil-container-infos .logo-infos');
  const containerProfileName = document.querySelector('.perfil-container-infos .perfil-titulos h2');
  const containerMemberSince = document.querySelector('.perfil-container-infos .perfil-titulos p');

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

  containerProfileName.textContent = userData.displayName || 'Debatedor Exemplar';
  containerMemberSince.textContent = `Membro desde ${formatMemberSinceDate(userData.createdAt)}`;

  // Stricks
  const stricksP = document.querySelectorAll('.stricks-perfil .stricks-sub p');
  const stricksH4 = document.querySelectorAll('.stricks-perfil .stricks-sub h4');

  stricksP[0].textContent = 'Sequência';
  stricksH4[0].textContent = `${userData.streak || 0} Dias`;

  stricksP[1].textContent = 'Pontos';
  stricksH4[1].textContent = `${userData.xp || 0} XP`;

  stricksP[2].textContent = 'Nível';
  stricksH4[2].textContent = `${level}`;

  // Estatísticas
  const estatisticas = document.querySelectorAll('.estatisticas-todos .numero-estatistica');
  estatisticas[0].textContent = userData.completedChallenges ?? 0;
  estatisticas[1].textContent = userData.completedChallenges ?? 0;
  estatisticas[2].textContent = userData.debatesTied ?? 0;
  estatisticas[3].textContent = userData.category || 'Debatedor';

  // Média do Gemini
  const mediaGemini = await calcularMediaPontuacaoDoUsuario(uid);
  estatisticas[4].textContent = `${mediaGemini}%`;

  // Progresso tópico
  const progressoTopico = document.querySelector('.minicontainer-topicos .completos span');
  if (progressoTopico) {
    progressoTopico.textContent = userData.completedChallenges ?? 0;
  }
});
