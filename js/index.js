import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  updateDoc,
  onAuthStateChanged,
} from '../firebase/firebase-config.js';

import { increment } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// Carrega dados quando a página estiver pronta
document.addEventListener('DOMContentLoaded', () => {
  // Usa onAuthStateChanged em vez de auth.currentUser diretamente
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log("Usuário não autenticado, redirecionando para login");
      window.location.href = 'login.html';
      return;
    }
    
    try {
      // Carrega os dados do usuário
      await loadUserData(user);
      
      // Carrega desafio diário
      await loadDailyChallenge();
      
      // Carrega ranking
      await loadRanking();
      
      // Atualiza streak (sequência de logins)
      await updateStreak(user.uid);
    } catch (error) {
      console.error("Erro ao carregar dados da dashboard:", error);
      // Adiciona tratamento de erro visível para o usuário se necessário
    }
  });
});

// 1. Carrega dados do usuário
async function loadUserData(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Atualiza o cabeçalho
      const welcomeSpan = document.querySelector('.welcome h1 span');
      if (welcomeSpan) {
        welcomeSpan.textContent = userData.displayName || 'Debatedor';
      }
      
      // Atualiza o perfil
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

// 2. Carrega desafio diário
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
        if (xpElement) xpElement.textContent = `+${challenge.xpReward || 50} XP`;
        if (timeElement) timeElement.textContent = `⏱️ ${challenge.time || 10} minutos`;
        
        // Atualiza o link para incluir o ID do desafio
        if (startBtn) {
          startBtn.onclick = () => window.location.href = `/pages/argumento.html?challenge=${challengeDoc.id}`;
        }
      }
    } else {
      console.log("Nenhum desafio diário encontrado para hoje");
      // Opcional: mostrar mensagem para usuário que não há desafio hoje
    }
  } catch (error) {
    console.error("Erro ao carregar desafio diário:", error);
  }
}

// 3. Carrega ranking semanal
async function loadRanking() {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    const tbody = document.querySelector('.ranking tbody');
    
    if (tbody) {
      tbody.innerHTML = ''; // Limpa os dados de exemplo

      let position = 0;
      querySnapshot.forEach((doc) => {
        position++;
        const userData = doc.data();
        
        const row = document.createElement('tr');
        const medalClass = position <= 3 ? 'medal ' + ['gold', 'silver', 'bronze'][position-1] : '';
        
        row.innerHTML = `
          <td class="${medalClass}">${position}</td>
          <td>${userData.displayName || 'Anônimo'}</td>
          <td>${userData.xp || 0}</td>
          <td>${userData.wonDebates || 0}</td>
        `;
        
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar ranking:", error);
  }
}

// 4. Atualiza streak do usuário
async function updateStreak(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Verifica se já atualizou hoje
      if (userData.lastLoginDate !== todayStr) {
        let newStreak = 1;
        
        // Verifica se fez login ontem para manter a sequência
        if (userData.lastLoginDate) {
          const lastLogin = new Date(userData.lastLoginDate);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastLogin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
            newStreak = (userData.streak || 0) + 1;
          }
        }
        
        await updateDoc(userRef, {
          streak: newStreak,
          lastLoginDate: todayStr,
          xp: increment(5) // XP por login diário
        });
        
        updateStreakUI(newStreak);
      } else {
        updateStreakUI(userData.streak || 0);
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar streak:", error);
  }
}

function gerarSequenciaDias() {
  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const hoje = new Date();
  const diaAtual = hoje.getDay(); // 0 (DOM) a 6 (SAB)

  // Gera a sequência a partir do dia atual
  const sequencia = [];
  for (let i = 0; i < 7; i++) {
    const index = (diaAtual + i) % 7;
    sequencia.push(diasSemana[index]);
  }

  return sequencia;
}


// Atualiza a UI da streak
function updateStreakUI(streak) {
  try {
    const streakElement = document.querySelector('.text-sequencia h3');
    if (streakElement) {
      streakElement.textContent = `Sequência de ${streak} dias`;
    }

    const sequenciaDias = gerarSequenciaDias();
    const days = document.querySelectorAll('.dia');

    days.forEach((day, index) => {
      const span = day.querySelector('span');
      const p = day.querySelector('p');

      // Atualiza o número e o nome do dia
      if (span) span.textContent = index + 1;
      if (p) p.textContent = sequenciaDias[index];

      // Aplica estilo ativo/inativo com base no streak
      if (index < streak) {
        day.classList.add('ativo');
        day.classList.remove('inativo');
      } else {
        day.classList.add('inativo');
        day.classList.remove('ativo');
      }
    });
  } catch (error) {
    console.error("Erro ao atualizar UI da streak:", error);
  }
}


// Funções auxiliares
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function getRankTitle(level) {
  if (level < 5) return 'Iniciante';
  if (level < 10) return 'Debatedor';
  if (level < 15) return 'Experiente';
  return 'Mestre';
}