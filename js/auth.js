import { 
  auth, 
  provider, 
  signInWithPopup,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  db,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "../firebase/firebase-config.js";

// Detecta se o navegador é Safari
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

document.addEventListener('DOMContentLoaded', async () => {
  const googleLoginBtn = document.getElementById("google-login");
  
  if (!googleLoginBtn) {
    console.error("Elemento 'google-login' não encontrado no DOM");
    return;
  }
  
  // Primeiro, tenta obter resultado pendente do redirect (caso tenha usado redirect)
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log("Usuário autenticado via redirect:", result.user);
      await handleUserData(result.user);
      window.location.replace("home.html");
      return;
    }
  } catch (error) {
    console.error("Erro ao obter resultado do redirect:", error);
  }
  
  // Se chegou aqui, usuário não logado via redirect pendente
  
  googleLoginBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      let userCredential;

      if (isSafari()) {
        // Safari usa redirect (mais confiável)
        await signInWithRedirect(auth, provider);
      } else {
        // Outros navegadores usam popup (mais rápido)
        userCredential = await signInWithPopup(auth, provider);
        
        if (userCredential && userCredential.user) {
          console.log("Usuário autenticado via popup:", userCredential.user);
          await handleUserData(userCredential.user);
          window.location.replace("home.html");
        }
      }
    } catch (error) {
      console.error("Erro na autenticação:", {
        code: error.code || 'desconhecido',
        message: error.message || 'Erro desconhecido',
        email: error.customData?.email,
        credential: error.credential
      });
      
      if (error.message && error.message.includes('Cross-Origin-Opener-Policy')) {
        alert("Erro de segurança do navegador. Tente novamente ou use outro navegador.");
      } else {
        alert(`Falha no login: ${error.message || 'Erro desconhecido'}`);
      }
    }
  });
});

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
      await updateDoc(userRef, userData);
      console.log("Usuário atualizado no Firestore");
    }
  } catch (firestoreError) {
    console.error("Erro ao processar dados do usuário no Firestore:", firestoreError);
  }
}
