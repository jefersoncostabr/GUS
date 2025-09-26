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