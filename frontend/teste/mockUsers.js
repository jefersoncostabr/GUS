import { setUsersData } from './adminUsers.js';

/**
 * Gera dados fictícios e popula a tabela de usuários para fins de teste.
 */
export function popularUsuariosMock() {
    // Criar 5 registros falsos seguindo o esquema esperado pela UI
    const usuariosFalsos = [
        { _id: 'mock_1', nome: 'Alice Administradora', email: 'alice@exemplo.com', role: 'admin' },
        { _id: 'mock_2', nome: 'Bruno Instrutor', email: 'bruno@exemplo.com', role: 'user' },
        { _id: 'mock_3', nome: 'Carla Dançarina', email: 'carla@exemplo.com', role: 'user' },
        { _id: 'mock_4', nome: 'Daniel Professor', email: 'daniel@exemplo.com', role: 'user' },
        { _id: 'mock_5', nome: 'Eduarda Gestora', email: 'eduarda@exemplo.com', role: 'admin' }
    ];

    // Localizar elementos do painel para manipulação visual
    const content = document.getElementById('usuariosContent');
    const toggleBtn = document.getElementById('toggleUsuariosBtn');

    // 1. Popular a tabela com os dados mockados
    // Chamamos setUsersData diretamente para injetar os registros na UI ignorando o fetch real
    setUsersData(usuariosFalsos);

    // 2. Garantir que o painel esteja visível
    // if (content && (content.style.display === 'none' || content.style.display === '')) {
    //     content.style.display = 'block';
    //     if (toggleBtn) toggleBtn.textContent = '-';
    // }
}

// Escuta o evento que o adminUsers.js dispara ao ser aberto
document.addEventListener('admin:user:fetch', popularUsuariosMock);

// Disponibiliza a função globalmente para execução via console do navegador se necessário
window.popularUsuariosMock = popularUsuariosMock;