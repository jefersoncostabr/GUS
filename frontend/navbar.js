/**
 * NAVBAR GLOBAL
 * Este script injeta o cabeçalho e gerencia a lógica de navegação.
 */

(function() {
    // 1. Definição da URL Base
    const baseUrl = window.location.hostname.includes("onrender.com")
        ? "https://gus-q7nn.onrender.com"
        : `http://${window.location.hostname}:3000`;

    // 2. Definição dos Itens do Menu
    // Adicione ou remova itens aqui para atualizar em todo o site
    const menuItems = {
        "/painelGeral.html": "Home",
        "/painelAdm.html": "Adm",
        "/sobre.html": "Sobre",
        "/loginCriar.html": "Criar Conta",
        "/login.html": "Sair" // Alterado para lógica de logout visual
    };

    // 3. Função para criar o HTML da Navbar
    function renderNavbar() {
        // Cria o container principal
        const navContainer = document.createElement('nav');
        navContainer.className = 'wraperNavegacao';

        // HTML Interno
        navContainer.innerHTML = `
            <div class="painelInfoUser">
                <span id="painelNomeHmaburger" style="font-style: italic; color: gray;">Visitante</span>
                <span id="painelRoleHamburger"></span>
            </div>
            
            <div class="menuHamburger" id="idMenuHamburger">
                &#9776; <!-- Ícone de 3 riscos -->
            </div>

            <ul class="ulMenu" id="ulMenu">
                <!-- Itens serão injetados aqui -->
            </ul>
        `;

        // Injeta no início do BODY
        document.body.prepend(navContainer);

        // Gera os links
        const ul = document.getElementById('ulMenu');
        for (const [path, label] of Object.entries(menuItems)) {
            const li = document.createElement('li');
            li.className = 'listMenu';
            
            const a = document.createElement('a');
            a.className = 'linkMenu';
            a.innerText = label;
            
            // Lógica simples de caminho
            let finalPath = path;
            if (path.startsWith('/')) {
                finalPath = '.' + path; 
            }
            a.href = finalPath;

            li.appendChild(a);
            ul.appendChild(li);
        }

        // Adiciona Evento do Hambúrguer
        const btnHamburger = document.getElementById('idMenuHamburger');
        const menu = document.getElementById('ulMenu');
        if (btnHamburger && menu) {
            btnHamburger.addEventListener('click', () => {
                menu.classList.toggle('ulMenuClicado');
            });
        }
    }

    // 4. Lógica de Usuário Logado (Copiada e adaptada do seu original)
    async function verificarUsuarioLogado() {
        try {
            const response = await fetch(`${baseUrl}/usuario-logado`);
            const data = await response.json();

            const nomeEl = document.getElementById('painelNomeHmaburger');
            const roleEl = document.getElementById('painelRoleHamburger');

            if (data && data.solicitante) {
                // Usuário Logado
                if (nomeEl) {
                    nomeEl.textContent = primeiraMaiúscula(data.solicitante);
                    nomeEl.style.color = 'blue';
                    nomeEl.style.fontWeight = 'bold';
                    nomeEl.style.fontStyle = 'normal';
                }
                if (roleEl) {
                    roleEl.textContent = primeiraMaiúscula(data.role);
                    roleEl.style.color = 'blue';
                    roleEl.style.fontWeight = 'bold';
                }
            } 
            // Se não logado, o HTML padrão já é "Visitante"
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
        }
    }

    function primeiraMaiúscula(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 5. Inicialização
    // Aguarda o DOM estar pronto para injetar o menu
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Remove navbar antiga se existir hardcoded no HTML para evitar duplicação durante a migração
        const oldNav = document.querySelector('.wraperNavegacao');
        if (oldNav) oldNav.remove();

        renderNavbar();
        verificarUsuarioLogado();
    }

})();