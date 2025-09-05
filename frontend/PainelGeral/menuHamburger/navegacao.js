function abreMenu() {
    console.log('clicou p abrir/fechar o menu');

    const varUlMenu = document.getElementById('ulMenu');
    varUlMenu.classList.toggle('ulMenuClicado');
}

var varMenuHamburger = document.getElementById('idMenuHamburger');
varMenuHamburger.addEventListener('click', abreMenu);