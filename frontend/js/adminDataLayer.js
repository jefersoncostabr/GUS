import { baseUrl, fetchJson, showMessage, setAdminVisibility, populateEstudiosOptions } from './admin.js';
import { setUsersData } from './adminUsers.js';
import { setEstudiosData, setEstudiosOptions } from './adminEstudios.js';
import { setSalasData } from './adminSalas.js';
import { setAulasData, setAulasEstudiosOptions, setAulasProfessoresOptions, setAulasSalasCache } from './adminAulas.js';
import { setRelatorioProfessoresOptions, showExportButtons } from './adminRelatorios.js';

/**
 * adminDataLayer.js
 * - Escuta eventos disparados pela UI (admin:* ) e realiza as chamadas HTTP correspondentes.
 * - Carrega listas iniciais e verifica sessão/role para chamar `setAdminVisibility`.
 * - Usa `fetchJson` e `baseUrl` do `admin.js` para consistência.
 */

async function safeFetchJson(url, options) {
  try {
    const res = await fetchJson(url, options);
    return res;
  } catch (err) {
    // A mensagem de erro agora é mais útil, vinda do `throw` em `fetchJson`
    console.error('Erro na camada de dados:', err.message);
    showMessage(err.message, 'error', 5000);
    throw err;
  }
}

// Loaders
async function loadUsers() {
  try {
    const data = await safeFetchJson(`${baseUrl}/solicitantes/solicitantes`);
    if (Array.isArray(data)) {
      setUsersData(data);
      setAulasProfessoresOptions(data);
      setRelatorioProfessoresOptions(data);
    }
  } catch (e) { console.warn('Falha ao carregar usuários', e); }
}

async function loadEstudios() {
  try {
    const data = await safeFetchJson(`${baseUrl}/admin/estudios`);
    if (Array.isArray(data)) {
      setEstudiosData(data);
      // cache for populating dynamic selects
      window.__estudiosCache = data;
      setEstudiosOptions(data);
      setAulasEstudiosOptions(data);
      // also provide helper populator
      if (typeof populateEstudiosOptions === 'function') {
        // find primary select if present
        const sel = document.getElementById('salaEstudio');
        if (sel) populateEstudiosOptions(sel, data);
      }
    }
  } catch (e) { console.warn('Falha ao carregar estúdios', e); }
}

async function loadSalas() {
  try {
    const data = await safeFetchJson(`${baseUrl}/admin/salas`);
    if (Array.isArray(data)) {
      setSalasData(data);
      setAulasSalasCache(data);
    }
  } catch (e) { console.warn('Falha ao carregar salas', e); }
}

async function loadAulas() {
  try {
    const data = await safeFetchJson(`${baseUrl}/admin/aulas`);
    if (Array.isArray(data)) setAulasData(data);
  } catch (e) { console.warn('Falha ao carregar aulas', e); }
}

// Session check
async function checkSessionAndInit() {
  try {
    const sess = await safeFetchJson(`${baseUrl}/usuario-logado`);
    const isAdmin = sess && sess.role === 'admin';
    setAdminVisibility(!!isAdmin);
    if (isAdmin) {
      // load admin resources
      await Promise.all([loadUsers(), loadEstudios(), loadSalas(), loadAulas()]);
    }
  } catch (e) {
    console.warn('Falha na checagem de sessão', e);
    setAdminVisibility(false);
  }
}

// Handlers for events
async function handleUserCreate(e) {
  const { nome, email, role, senha, estudio } = e.detail || {};
  if (!nome || !senha || !estudio) { showMessage('Nome, Senha e Estúdio são obrigatórios.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/solicitantes/solicitantes`, { method: 'POST', body: { solicitante: nome, email, senha, role, estudio } });
    showMessage('Usuário criado.', 'success');
    await loadUsers();
  } catch (err) { /* already handled */ }
}

async function handleUserUpdate(e) {
  const { id, nome, email, role } = e.detail || {};
  if (!id) { showMessage('ID ausente para atualização.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/solicitantes/solicitantes/${id}`, { method: 'PUT', body: { solicitante: nome, email, role } });
    showMessage('Usuário atualizado.', 'success');
    await loadUsers();
  } catch (err) { }
}

async function handleUserDelete(e) {
  const { id } = e.detail || {};
  if (!id) { showMessage('ID ausente para exclusão.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/solicitantes/solicitantes/${id}`, { method: 'DELETE' });
    showMessage('Usuário excluído.', 'success');
    await loadUsers();
  } catch (err) { }
}

async function handleEstudioSave(e) {
  const payload = e.detail || {};
  const { id } = payload;
  try {
    if (id) {
      await safeFetchJson(`${baseUrl}/admin/estudios/${id}`, { method: 'PUT', body: payload });
      showMessage('Estúdio atualizado.', 'success');
    } else {
      await safeFetchJson(`${baseUrl}/admin/estudios`, { method: 'POST', body: payload });
      showMessage('Estúdio criado.', 'success');
    }
    await loadEstudios();
    await loadSalas(); // salas may be affected
  } catch (err) { }
}

async function handleEstudioDelete(e) {
  const { id } = e.detail || {};
  if (!id) { showMessage('ID ausente para exclusão de estúdio.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/admin/estudios/${id}`, { method: 'DELETE' });
    showMessage('Estúdio excluído.', 'success');
    await loadEstudios();
    await loadSalas();
  } catch (err) { }
}

async function handleSalaSave(e) {
  const payload = e.detail || {};
  const { id } = payload;
  try {
    if (id) {
      await safeFetchJson(`${baseUrl}/admin/salas/${id}`, { method: 'PUT', body: payload });
      showMessage('Sala atualizada.', 'success');
    } else {
      await safeFetchJson(`${baseUrl}/admin/salas`, { method: 'POST', body: payload });
      showMessage('Sala criada.', 'success');
    }
    await loadSalas();
  } catch (err) { }
}

async function handleSalaDelete(e) {
  const { id } = e.detail || {};
  if (!id) { showMessage('ID ausente para exclusão de sala.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/admin/salas/${id}`, { method: 'DELETE' });
    showMessage('Sala excluída.', 'success');
    await loadSalas();
  } catch (err) { }
}

async function handleAulaSave(e) {
  const payload = e.detail || {};
  const { id } = payload;
  try {
    if (id) {
      await safeFetchJson(`${baseUrl}/admin/aulas/${id}`, { method: 'PUT', body: payload });
      showMessage('Aula atualizada.', 'success');
    } else {
      await safeFetchJson(`${baseUrl}/admin/aulas`, { method: 'POST', body: payload });
      showMessage('Aula criada.', 'success');
    }
    await loadAulas();
  } catch (err) { }
}

async function handleAulaDelete(e) {
  const { id } = e.detail || {};
  if (!id) { showMessage('ID ausente para exclusão de aula.', 'error'); return; }
  try {
    await safeFetchJson(`${baseUrl}/admin/aulas/${id}`, { method: 'DELETE' });
    showMessage('Aula excluída.', 'success');
    await loadAulas();
  } catch (err) { }
}

async function handleRelatorioSemana(e) {
  const button = e.detail?.button;
  if (button) button.textContent = 'Gerando...';

  try {
    // Esta rota precisa ser criada no backend
    const data = await safeFetchJson(`${baseUrl}/admin/relatorios/semana`);
    if (data && data.length > 0) {
      console.log('Agendamentos da semana atual:', data);
      showMessage(`Relatório gerado. ${data.length} agendamentos encontrados no console.`, 'success');
      // Exibe os botões de exportação ao lado do botão que foi clicado
      showExportButtons(data, 'btnRelatorioSemana');
    } else {
      console.log('Nenhum agendamento encontrado para a semana atual.');
      showMessage('Nenhum agendamento encontrado para a semana atual.', 'info');
    }
  } catch (err) {
    // safeFetchJson já mostra a mensagem de erro de rede
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Agendamentos da Semana'; }
  }
}

async function handleRelatorioMes(e) {
  const button = e.detail?.button;
  if (button) button.textContent = 'Gerando...';

  try {
    const data = await safeFetchJson(`${baseUrl}/admin/relatorios/mes`);
    if (data && data.length > 0) {
      console.log('Agendamentos do mês atual:', data);
      showMessage(`Relatório gerado. ${data.length} agendamentos encontrados no console.`, 'success');
      showExportButtons(data, 'btnRelatorioMes');
    } else {
      console.log('Nenhum agendamento encontrado para o mês atual.');
      showMessage('Nenhum agendamento encontrado para o mês atual.', 'info');
    }
  } catch (err) {
    // safeFetchJson já mostra a mensagem de erro de rede
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Agendamentos do Mês'; }
  }
}

async function handleRelatorioProfessor(e) {
  const { button, id } = e.detail || {};
  if (button) button.textContent = 'Buscando...';

  try {
    if (!id) throw new Error("ID do professor não fornecido.");
    
    const data = await safeFetchJson(`${baseUrl}/admin/relatorios/professor/${id}`);
    if (data && data.length > 0) {
      console.log(`Agendamentos do professor (ID: ${id}):`, data);
      showMessage(`Relatório gerado. ${data.length} agendamentos encontrados no console.`, 'success');
      showExportButtons(data, 'btnIrRelatorioProf');
    } else {
      console.log('Nenhum agendamento encontrado para este professor.');
      showMessage('Nenhum agendamento encontrado para este professor.', 'info');
    }
  } catch (err) {
    // safeFetchJson já lida com erros de rede
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Ir'; }
  }
}

async function handleRelatorioAulas(e) {
  const button = e.detail?.button;
  if (button) button.textContent = 'Gerando...';

  try {
    const data = await safeFetchJson(`${baseUrl}/admin/relatorios/aulas`);
    if (data && data.length > 0) {
      console.log('Relatório de Aulas Regulares:', data);
      showMessage(`Relatório gerado. ${data.length} aulas encontradas no console.`, 'success');
      showExportButtons(data, 'btnRelatorioAulas');
    } else {
      console.log('Nenhuma aula regular encontrada.');
      showMessage('Nenhuma aula regular encontrada.', 'info');
    }
  } catch (err) {
    // safeFetchJson já lida com erros de rede
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Aulas regulares'; }
  }
}

async function handleRelatorioProfessores(e) {
  const button = e.detail?.button;
  if (button) button.textContent = 'Gerando...';

  try {
    const data = await safeFetchJson(`${baseUrl}/admin/relatorios/professores`);
    if (data && data.length > 0) {
      console.log('Relatório de Professores:', data);
      showMessage(`Relatório gerado. ${data.length} professores encontrados no console.`, 'success');
      showExportButtons(data, 'btnRelatorioProfs');
    } else {
      console.log('Nenhum professor encontrado.');
      showMessage('Nenhum professor encontrado.', 'info');
    }
  } catch (err) {
    // safeFetchJson já lida com erros de rede
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Professores'; }
  }
}

export function initAdminDataLayer() {
  // attach listeners
  document.addEventListener('admin:user:create', handleUserCreate);
  document.addEventListener('admin:user:update', handleUserUpdate);
  document.addEventListener('admin:user:delete', handleUserDelete);
  document.addEventListener('admin:user:fetch', loadUsers);
  document.addEventListener('admin:estudio:save', handleEstudioSave);
  document.addEventListener('admin:estudio:delete', handleEstudioDelete);
  document.addEventListener('admin:estudio:fetch', loadEstudios);
  document.addEventListener('admin:sala:save', handleSalaSave);
  document.addEventListener('admin:sala:delete', handleSalaDelete);
  document.addEventListener('admin:sala:fetch', loadSalas);
  document.addEventListener('admin:aula:fetch', loadAulas);
  document.addEventListener('admin:aula:delete', handleAulaDelete);
  document.addEventListener('admin:aula:save', handleAulaSave);
  document.addEventListener('admin:relatorio:semana', handleRelatorioSemana);
  document.addEventListener('admin:relatorio:mes', handleRelatorioMes);
  document.addEventListener('admin:relatorio:professor', handleRelatorioProfessor);
  document.addEventListener('admin:relatorio:aulas', handleRelatorioAulas);
  document.addEventListener('admin:relatorio:professores', handleRelatorioProfessores);

  // start session check and data load
  checkSessionAndInit();
}

// Auto-init if included directly on painelAdm.html
if (document.getElementById('adminArea')) {
  // small delay to allow UI modules to bind first
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => initAdminDataLayer(), 50));
}
