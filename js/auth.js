import { auth, provider, signInWithPopup } from "../firebase/firebase-config.js"; 

const googleLoginBtn = document.getElementById("google-login");

googleLoginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    alert(`Bem-vindo, ${user.displayName}!`);

    window.location.href = "index.html"; 
  } catch (error) {
    console.error("Erro no login:", error.message);
    alert("Falha ao fazer login. Verifique o console.");
  }
});