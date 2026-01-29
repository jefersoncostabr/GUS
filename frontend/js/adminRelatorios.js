
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleRelatoriosBtn');
    const contentDiv = document.getElementById('relatoriosContent');

    // Lógica de Toggle (Abrir/Fechar painel)
    if (toggleBtn && contentDiv) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = contentDiv.style.display === 'none';
            contentDiv.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '-' : '+';
        });
    }

    // Listeners para os botões de relatório (Lógica a ser implementada)
    document.getElementById('btnRelatorioSemana')?.addEventListener('click', (e) => {
        e.target.disabled = true;
        document.dispatchEvent(new CustomEvent('admin:relatorio:semana', { detail: { button: e.target } }));
    });

    document.getElementById('btnRelatorioMes')?.addEventListener('click', () => {
        console.log('Gerar relatório: Agendamentos do Mês');
        // Implementar lógica aqui
    });

    document.getElementById('btnRelatorioUsosProf')?.addEventListener('click', () => {
        console.log('Gerar relatório: Usos por Professor');
        // Implementar lógica aqui
    });

    document.getElementById('btnRelatorioAulas')?.addEventListener('click', () => {
        console.log('Gerar relatório: Aulas Regulares');
        // Implementar lógica aqui
    });

    document.getElementById('btnRelatorioProfs')?.addEventListener('click', () => {
        console.log('Gerar relatório: Lista de Professores');
        // Implementar lógica aqui
    });
});