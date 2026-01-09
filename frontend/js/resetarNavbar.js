/**
 * Reseta os elementos visuais da navbar para o estado de "Visitante".
 * Utilizado após logout ou quando não há usuário logado.
 */
export function resetarNavbar() {
    const nomeEl = document.getElementById('painelNomeHmaburger');
    const roleEl = document.getElementById('painelRoleHamburger');

    if (nomeEl) {
        nomeEl.textContent = 'Visitante';
        nomeEl.style.color = 'gray';
        nomeEl.style.fontWeight = 'normal';
        nomeEl.style.fontStyle = 'italic';
    }
    if (roleEl) roleEl.textContent = '';
}