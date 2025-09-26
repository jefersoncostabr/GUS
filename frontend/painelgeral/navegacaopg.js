function abreMenu() {
    const varUlMenu = document.getElementById('ulMenu');
    varUlMenu.classList.toggle('ulMenuClicado');
    console.error('Erro ao abrir/fechar o menu:', error);
}


function createMenuItems(menuItems, ulId) {
    const ul = document.getElementById(ulId);
    
    for (const [key, value] of Object.entries(menuItems)) {
        const li = document.createElement('li');
        li.className = 'listMenu';
        li.innerText = value;
        
        const a = document.createElement('a');
        a.className = 'linkMenu';
        a.href = key;
        a.appendChild(li);
        
        ul.appendChild(a);
    }
}

const menuItems = {
    "/painelGeral.html": "Home",
    "/painelAdm.html": "Adm",
    "/login.html": "Login",
    "/sobre.html": "Sobre"
};

createMenuItems(menuItems, "ulMenu");
// Ao criar novo menu lembrar de criar a rota no servidor

var varMenuHamburger = document.getElementById('idMenuHamburger');
varMenuHamburger.addEventListener('click', abreMenu);  

// function exibeNoPainel(data) {
//     // Atualizando os campos de nome e role
//     try {
//         const painelNome = document.getElementById('painelNomeHmaburger');
//         const painelRole = document.getElementById('painelRoleHamburger');
    
//         painelNome.innerText = data.solicitante;
//         painelRole.innerText = data.role;
        
//     } catch (error) {
//         console.error('Erro ao atualizar os campos:', error);        
//     }
// }

// const baseUrl = window.location.hostname === "localhost"
//             ? "http://localhost:3000"
//             : "https://gus-q7nn.onrender.com";

// async function pegarUserSession() {
//     try {
//         const response = await fetch(`${baseUrl}/solicitantes/usersess`);
//         if (!response.ok) {
//             throw new Error('Erro na requisição');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Erro ao fazer a requisição:', error);
//         throw error;
//     }
// }

// async function mostrarUserRole() {
//     try {
//         const data = await pegarUserSession();
//         exibeNoPainel(data);
//     } catch (error) {
//         console.error('Erro ao exibir no painel:', error);
//     }
// }

// mostrarUserRole();
// setInterval(mostrarUserRole, 10000);
// // ***** O código funciona mas o consumo de memória é muito alto.