// Keep a recoverable error on screen if the GPU, CDN or WebAssembly fails.
import('./main.js?v=reference-v6').catch((error) => {
  console.error('WithSurvival startup failed', error);
  const button = document.getElementById('play');
  button.disabled = false;
  button.textContent = 'Réessayer';
  button.addEventListener('click', () => location.reload(), {once:true});
  document.querySelector('.save-note').textContent = 'Chargement impossible. Vérifiez votre connexion et la disponibilité de WebGL dans votre navigateur.';
});
