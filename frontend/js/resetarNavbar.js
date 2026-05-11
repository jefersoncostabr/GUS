/**
 * Reseta os elementos visuais da navbar para o estado de "Visitante".
 * Utilizado após logout ou quando não há usuário logado.
 */
export function resetarNavbar() {
    const nomeEl = document.getElementById('painelNomeHmaburger');
    const roleEl = document.getElementById('painelRoleHamburger');
    const infoUserEl = document.querySelector('.painelInfoUser');

    if (nomeEl) {
        nomeEl.textContent = 'Visitante';
    }
    if (roleEl) roleEl.textContent = '';
    if (infoUserEl) infoUserEl.classList.remove('logado');
}