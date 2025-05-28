import { 
  auth, 
  provider, 
  signInWithPopup,
  onAuthStateChanged,
  db,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "../firebase/firebase-config.js";

// Espera até que o DOM esteja carregado completamente
document.addEventListener('DOMContentLoaded', () => {
  const googleLoginBtn = document.getElementById("google-login");
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", handleGoogleLogin);
  } else {
    console.error("Elemento 'google-login' não encontrado no DOM");
  }
});

// Função separada para lidar com o login do Google
async function handleGoogleLogin(e) {
  e.preventDefault();
  
  try {
    // Use signInWithRedirect em vez de signInWithPopup para evitar problemas de COOP
    // Alternativa 1: Use redirecionamento em vez de popup
    // await signInWithRedirect(auth, provider);
    
    // Alternativa 2: Continue usando popup mas com tratamento adequado
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log("Usuário autenticado:", user);
    
    if (user) {
      // Processa os dados do usuário no Firestore antes de redirecionar
      await handleUserData(user);
      
      // Use location.replace para melhor navegação (não adiciona à história)
      window.location.replace("home.html");
    } else {
      throw new Error("Autenticação falhou - usuário não retornado");
    }
  } catch (error) {
    console.error("Erro na autenticação:", {
      code: error.code || 'desconhecido',
      message: error.message || 'Erro desconhecido',
      email: error.customData?.email,
      credential: error.credential
    });
    
    // Tratamento específico para erro COOP
    if (error.message && error.message.includes('Cross-Origin-Opener-Policy')) {
      alert("Erro de segurança do navegador. Tente novamente ou use outro navegador.");
    } else {
      alert(`Falha no login: ${error.message || 'Erro desconhecido'}`);
    }
  }
}

// Função para gerenciar os dados do usuário no Firestore
async function handleUserData(user) {
  if (!user || !user.uid) {
    console.error("Dados de usuário inválidos");
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      displayName: user.displayName || 'Usuário',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
      // Novo usuário - cria documento com dados adicionais
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        streak: 0,
        totalDebates: 0,
        completedChallenges: 0,
        debatePoints: 0,
        role: 'user'
      });
      console.log("Novo usuário registrado no Firestore");
    } else {
      // Usuário existente - apenas atualiza dados
      await updateDoc(userRef, userData);
      console.log("Usuário atualizado no Firestore");
    }
  } catch (firestoreError) {
    console.error("Erro ao processar dados do usuário no Firestore:", firestoreError);
    // Não lançamos o erro novamente para permitir que o login continue
  }
}