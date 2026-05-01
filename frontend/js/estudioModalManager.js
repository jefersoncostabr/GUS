/**
 * GUS - Gerenciamento de Estúdios via Modal
 * Gerencia a interação do modal de seleção/criação de estúdios
 */

/**
 * Obtém a URL base da API
 */
function getBaseUrl() {
    if (window.location.hostname.includes("onrender.com")) {
        return "https://gus-q7nn.onrender.com";
    }
    const host = window.location.hostname || "localhost";
    return `http://${host}:3000`;
}

class EstudioModalManager {
    constructor() {
        this.modal = document.getElementById('estudioModal');
        this.estudioInput = document.getElementById('estudio');
        this.searchInput = document.getElementById('estudioSearch');
        this.estudioList = document.getElementById('estudioList');
        this.closeBtn = document.getElementById('modalCloseBtn');
        this.cancelBtn = document.getElementById('modalCancelBtn');
        
        this.estudios = [];
        this.selectedEstudio = null;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Abrir modal ao clicar no campo de estúdio
        this.estudioInput.addEventListener('click', () => this.openModal());
        
        // Abrir modal ao focar (se vazio)
        this.estudioInput.addEventListener('focus', () => {
            if (!this.estudioInput.value) {
                this.openModal();
            }
        });
        
        // Fechar modal
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Filtrar ao digitar
        this.searchInput.addEventListener('input', () => this.filterEstudios());
    }
    
    /**
     * Abre o modal e carrega a lista de estúdios
     */
    async openModal() {
        this.modal.classList.add('active');
        this.searchInput.focus();
        this.searchInput.value = this.estudioInput.value || '';
        
        if (this.estudios.length === 0) {
            await this.carregarEstudios();
        }
        
        this.filterEstudios();
    }
    
    /**
     * Fecha o modal
     */
    closeModal() {
        this.modal.classList.remove('active');
        this.searchInput.value = '';
    }
    
    /**
     * Carrega a lista de estúdios do backend
     */
    async carregarEstudios() {
        try {
            const baseUrl = getBaseUrl();
            const response = await fetch(`${baseUrl}/solicitantes/lista-simples`);
            
            if (response.ok) {
                this.estudios = await response.json();
            } else {
                console.error('Erro ao caregar estúdios:', response.status);
                this.estudioList.innerHTML = '<p style="padding: 15px; text-align: center; color: #999;">Erro ao carregar estúdios</p>';
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            this.estudioList.innerHTML = '<p style="padding: 15px; text-align: center; color: #999;">Erro de conexão</p>';
        }
    }
    
    /**
     * Filtra e exibe os estúdios baseado no texto de busca
     */
    filterEstudios() {
        const searchText = this.searchInput.value.trim().toLowerCase();
        const filtrados = this.estudios.filter(e => 
            e.nome.toLowerCase().includes(searchText)
        );
        
        this.renderEstudios(filtrados, searchText);
    }
    
    /**
     * Renderiza a lista de estúdios no modal
     * @param {Array} estudios - Lista de estúdios para exibir
     * @param {string} searchText - Texto de busca atual
     */
    renderEstudios(estudios, searchText) {
        this.estudioList.innerHTML = '';
        
        // Exibir estúdios existentes
        if (estudios.length > 0) {
            estudios.forEach(e => {
                const item = document.createElement('div');
                item.className = 'estudio-item';
                item.textContent = e.nome;
                item.addEventListener('click', () => this.selecionarEstudio(e));
                this.estudioList.appendChild(item);
            });
        }
        
        // Se o texto não corresponde a nenhum estúdio existente e não está vazio,
        // oferecer opção de criar novo
        const estudioNaoExiste = searchText && !estudios.some(e => 
            e.nome.toLowerCase() === searchText
        );
        
        if (estudioNaoExiste) {
            const criarNovoItem = document.createElement('div');
            criarNovoItem.className = 'estudio-item crear-novo';
            criarNovoItem.innerHTML = `<strong>+ Criar novo estúdio: "${searchText}"</strong>`;
            criarNovoItem.addEventListener('click', () => this.confirmarCriacaoNovo(searchText));
            this.estudioList.appendChild(criarNovoItem);
        }
        
        // Mensagem se nenhum resultado
        if (!estudioNaoExiste && estudios.length === 0 && searchText) {
            this.estudioList.innerHTML = '<p style="padding: 15px; text-align: center; color: #999;">Nenhum estúdio encontrado</p>';
        } else if (estudios.length === 0 && !searchText) {
            this.estudioList.innerHTML = '<p style="padding: 15px; text-align: center; color: #999;">Digite para buscar ou criar</p>';
        }
    }
    
    /**
     * Seleciona um estúdio existente
     * @param {Object} estudio - Estúdio a ser selecionado
     */
    selecionarEstudio(estudio) {
        this.estudioInput.value = estudio.nome;
        this.selectedEstudio = estudio;
        this.closeModal();
    }
    
    /**
     * Confirma a criação de um novo estúdio
     * @param {string} nomeCriacaoEstudio - Nome do novo estúdio
     */
    confirmarCriacaoNovo(nomeCriacaoEstudio) {
        const confirmacao = confirm(
            `Você será o Administrador deste novo estúdio: "${nomeCriacaoEstudio}".\n\nConfirma?`
        );
        
        if (confirmacao) {
            this.estudioInput.value = nomeCriacaoEstudio;
            this.selectedEstudio = null; // Indica novo estúdio
            this.closeModal();
        }
    }
    
    /**
     * Retorna o valor atualmente selecionado
     */
    getEstudioSelecionado() {
        return this.estudioInput.value;
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.estudioModal = new EstudioModalManager();
});
