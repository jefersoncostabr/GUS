document.getElementById('containerTabela').style.display = 'none';

// Pega dados paginados do servidor
export async function getDados(page = 1, limit = 6, filters = {}) {
    try {
        const baseUrl = window.location.hostname.includes("onrender.com")
            ? "https://gus-q7nn.onrender.com"
            : `http://${window.location.hostname}:3000`;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        // adicionar filtros não vazios
        Object.keys(filters || {}).forEach((key) => {
            const val = filters[key];
            if (val !== undefined && val !== null && val !== '') {
                params.append(key, val);
            }
        });

        const response = await fetch(`${baseUrl}/usos/usos?${params.toString()}`);
        
        if (!response.ok) {
            if (response.status === 403) {
                const painelMensagem = document.getElementById('painelSaida') || document.getElementById('painelMensagem');
                if (painelMensagem) {
                    painelMensagem.textContent = 'Acesso pendente de aprovação';
                }
                return { data: [], page: 1, limit, totalItems: 0, totalPages: 1, accessDenied: true };
            }
            const errorMsg = await response.text();
            throw new Error(`Servidor retornou erro ${response.status}: ${errorMsg}`);
        }

        const json = await response.json();

        // Compatibilidade: caso o backend retorne um array diretamente (antigo), normalize
        if (Array.isArray(json)) {
            return { data: json, page: 1, limit, totalItems: json.length, totalPages: 1 };
        }

        return json; // { data, page, limit, totalItems, totalPages }
    } catch (error) {
        console.error('Erro ao buscar dados paginados:', error);
        return { data: [], page: 1, limit, totalItems: 0, totalPages: 1, error: true };
    }
}

// Função para preencher os inputs do formulário
function preencherInputs(dados) {
    // Busca elementos pelo ID para garantir o preenchimento correto
    const elSolicitante = document.getElementById('solicitante');
    const elSala = document.getElementById('sala');
    const elDate = document.getElementById('date');
    const elHora = document.getElementById('hora');
    const elMotivo = document.getElementById('motivo'); // Pode ser Select ou Input
    const elId = document.getElementById('id');

    const converterDiaParaInput = (valorDia) => {
        if (!valorDia || typeof valorDia !== 'string') return '';

        // Já está no formato YYYY-MM-DD — usa direto.
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorDia)) return valorDia;

        // Formatos com barra: D/M/AA, D/M/AAAA, DD/MM/AA, DD/MM/AAAA
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(valorDia)) {
            const [diaRaw, mesRaw, anoRaw] = valorDia.split('/');
            const dia = diaRaw.padStart(2, '0');
            const mes = mesRaw.padStart(2, '0');
            const ano = anoRaw.length === 2 ? `20${anoRaw}` : anoRaw;
            return `${ano}-${mes}-${dia}`;
        }

        // Formato ISO com hora (ex: "2026-05-07T00:00:00.000Z")
        if (/^\d{4}-\d{2}-\d{2}T/.test(valorDia)) {
            return valorDia.slice(0, 10);
        }

        return '';
    };

    // Preenchimento básico
    if (elSolicitante) {
        if (dados.solicitante && typeof dados.solicitante === 'object' && dados.solicitante.solicitante) {
            elSolicitante.value = dados.solicitante.solicitante;
        } else {
            elSolicitante.value = dados.solicitante || '';
        }
    }

    // Preenche estúdio (lookup via cache global de salas) e depois a sala
    const salaValor = dados.sala != null ? String(dados.sala) : '';
    if (salaValor) {
        const elEstudio = document.getElementById('estudio');
        const todasAsSalas = window.__todasAsSalas || [];
        const salaEncontrada = todasAsSalas.find((s) => {
            const idSala = String(s._id || s.id || '');
            const numeroSala = String(s.numero || '');
            const compositeSala = `${String(s.estudio || s.estudioId || '')}|${numeroSala}`;
            return idSala === salaValor || numeroSala === salaValor || compositeSala === salaValor;
        });

        if (salaEncontrada && elEstudio) {
            const eVal = salaEncontrada.estudio || salaEncontrada.estudioId;
            const estudioId = (eVal && typeof eVal === 'object') ? String(eVal._id || eVal.id) : String(eVal || '');
            if (estudioId && elEstudio.value !== estudioId) {
                elEstudio.value = estudioId;
                // Recarrega as opções de sala para o estúdio selecionado
                if (typeof window.__atualizarSalasDisponiveis === 'function') {
                    window.__atualizarSalasDisponiveis();
                }
            }
        }

        if (elSala) {
            const temOpcao = Array.from(elSala.options).some((o) => o.value === salaValor || o.textContent === `Sala ${salaValor}`);
            if (!temOpcao) {
                const novaOpcao = document.createElement('option');
                novaOpcao.value = salaValor;
                novaOpcao.textContent = `Sala ${salaValor}`;
                elSala.appendChild(novaOpcao);
            }
            elSala.value = salaValor;
        }
    } else if (elSala) {
        elSala.value = '';
    }

    if (elId) elId.value = dados._id || '';

    if (elDate) {
        elDate.value = converterDiaParaInput(dados.dia);
    }

    // Tratamento para Hora (formato HH:MM)
    if (elHora) {
        elHora.value = dados.hora || '';
    }

    // Tratamento para Motivo (Select ou Input)
    if (elMotivo) {
        if (elMotivo.tagName === 'SELECT') {
            // Itera pelas opções para selecionar aquela cujo TEXTO corresponde ao motivo salvo
            // (pois o value pode ser 'opcao1' enquanto o dado é 'Particular')
            Array.from(elMotivo.options).forEach((option, index) => {
                if (option.text === dados.motivo) elMotivo.selectedIndex = index;
            });
        } else {
            elMotivo.value = dados.motivo || '';
        }
    }
}

// Função para atribuir click ao elemento
function atribuirClick(elemento, dados) {
    elemento.addEventListener('click', () => {
        console.log('Registro completo selecionado na tabela:', dados);
        destacarLinhaSelecionada(elemento);
        preencherInputs(dados);
    });
}

function destacarLinhaSelecionada(linhaSelecionada) {
    const tabelaAtual = document.querySelector('#tableInner table');
    if (!tabelaAtual) return;

    tabelaAtual.querySelectorAll('tr').forEach((linha) => {
        linha.classList.remove('linha-destaque');
    });

    if (linhaSelecionada) {
        linhaSelecionada.classList.add('linha-destaque');
    }
}

function destacarUltimoCriado(tabela) {
    const ultimoId = sessionStorage.getItem('ultimoUsoCriadoId');
    if (!ultimoId) return;

    const linhaDestino = tabela.querySelector(`tbody tr[data-id="${ultimoId}"]`);
    if (!linhaDestino) return;

    destacarLinhaSelecionada(linhaDestino);
    sessionStorage.removeItem('ultimoUsoCriadoId');
}

function formatarDiaParaTabela(valorDia, isAulaFixa = false) {
        if (!valorDia || typeof valorDia !== 'string') return valorDia || '---';

        if (isAulaFixa) {
                const diasSemana = {
                    'segunda': 'Segunda',
                    'terca': 'Terça',
                    'quarta': 'Quarta',
                    'quinta': 'Quinta',
                    'sexta': 'Sexta',
                    'sabado': 'Sábado',
                    'domingo': 'Domingo'
                };
                return diasSemana[valorDia.toLowerCase()] || valorDia;
        }

        // Formato ISO: YYYY-MM-DD -> DD/MM/AA
        if (/^\d{4}-\d{2}-\d{2}$/.test(valorDia)) {
                const [ano, mes, dia] = valorDia.split('-');
                return `${dia}/${mes}/${ano.slice(-2)}`;
        }

        // Formato com barras: DD/MM/YYYY -> DD/MM/AA (mantém DD/MM/AA como está)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorDia)) {
                const [dia, mes, ano] = valorDia.split('/');
                return `${dia}/${mes}/${ano.slice(-2)}`;
        }

        if (/^\d{2}\/\d{2}\/\d{2}$/.test(valorDia)) {
                return valorDia;
        }

        // Para outros formatos (ex: "segunda" em aulas fixas), mantém original.
        return valorDia;
}

function resolverRotuloEstudioPorId(estudioId) {
    const estudios = Array.isArray(window.__estudiosCache) ? window.__estudiosCache : [];
    const todasAsSalas = Array.isArray(window.__todasAsSalas) ? window.__todasAsSalas : [];
    const idEstudio = (valor) => {
        if (valor && typeof valor === 'object') return String(valor._id || valor.id || '');
        return typeof valor === 'string' ? valor.trim() : '';
    };
    const estudioSelecionado = estudios.find((item) => idEstudio(item) === String(estudioId));
    if (!estudioSelecionado) return '';

    const idsComSalas = new Set(todasAsSalas.map((sala) => idEstudio(sala.estudio || sala.estudioId)).filter(Boolean));
    idsComSalas.add(String(estudioId));
    const dataCriacao = (estudio) => {
        if (estudio.createdAt) return new Date(estudio.createdAt).getTime();
        const id = idEstudio(estudio);
        return /^[\da-f]{24}$/i.test(id) ? Number.parseInt(id.slice(0, 8), 16) * 1000 : 0;
    };
    const estudiosDoTenant = estudios
        .filter((estudio) => idsComSalas.has(idEstudio(estudio)))
        .sort((a, b) => dataCriacao(a) - dataCriacao(b) || idEstudio(a).localeCompare(idEstudio(b)));
    const nome = String(estudioSelecionado.nome || estudioSelecionado.name || '');
    if (nome.toLowerCase().includes('matriz')) return 'Matriz';

    const filiais = estudiosDoTenant.filter((estudio) =>
        !String(estudio.nome || estudio.name || '').toLowerCase().includes('matriz')
    );
    const indiceFilial = filiais.findIndex((estudio) => idEstudio(estudio) === String(estudioId));
    if (indiceFilial < 0) return '';
    return indiceFilial === 0 ? 'Filial' : `Filial ${indiceFilial + 1}`;
}

function resolverNomeCadastradoEstudio(dado) {
    const estudios = Array.isArray(window.__estudiosCache) ? window.__estudiosCache : [];
    const todasAsSalas = Array.isArray(window.__todasAsSalas) ? window.__todasAsSalas : [];
    const obterId = (valor) => {
        if (valor && typeof valor === 'object') return String(valor._id || valor.id || '');
        return typeof valor === 'string' ? valor.trim() : '';
    };
    const nomePorId = (id) => {
        const estudio = estudios.find((item) => obterId(item) === String(id));
        return estudio?.nome || estudio?.name || '';
    };

    const salaValor = dado.sala != null ? String(dado.sala) : '';
    const [estudioIdDaSala = '', numeroSala = ''] = salaValor.split(/[|:]/);
    const idEstudio = obterId(dado.estudioId)
        || obterId(dado.estudio)
        || (/^[\da-f]{24}$/i.test(String(dado.estudioNome || '').trim()) ? String(dado.estudioNome).trim() : '')
        || (salaValor.includes('|') || salaValor.includes(':') ? estudioIdDaSala : '');
    const nomePorIdDireto = nomePorId(idEstudio);
    if (nomePorIdDireto) return nomePorIdDireto;

    const salaEncontrada = todasAsSalas.find((sala) => {
        const idDaSala = obterId(sala.estudio || sala.estudioId);
        if (salaValor.includes('|') || salaValor.includes(':')) {
            return String(sala.numero || '') === numeroSala && idDaSala === estudioIdDaSala;
        }
        if (idEstudio) return String(sala.numero || '') === salaValor && idDaSala === idEstudio;
        return String(sala.numero || '') === salaValor;
    });
    if (salaEncontrada) {
        if (salaEncontrada.estudioNome) return salaEncontrada.estudioNome;
        const nomeDaSala = salaEncontrada.estudio || salaEncontrada.estudioId;
        const nomeDiretoDaSala = nomeDaSala && typeof nomeDaSala === 'object'
            ? nomeDaSala.nome || nomeDaSala.name
            : '';
        if (nomeDiretoDaSala) return nomeDiretoDaSala;
        const nomeResolvidoDaSala = nomePorId(obterId(nomeDaSala));
        if (nomeResolvidoDaSala) return nomeResolvidoDaSala;
    }

    return dado.estudioNome || dado.estudio?.nome || dado.estudio?.name || '';
}

function resolverTextoEstudio(dado, mostrarNomeCadastrado = false) {
    if (!dado || typeof dado !== 'object') return 'Não preenchido';
    if (mostrarNomeCadastrado) return resolverNomeCadastradoEstudio(dado) || 'Não preenchido';

    const estudios = Array.isArray(window.__estudiosCache) ? window.__estudiosCache : [];
    const todasAsSalas = Array.isArray(window.__todasAsSalas) ? window.__todasAsSalas : [];
    const idEstudio = (valor) => {
        if (valor && typeof valor === 'object') return String(valor._id || valor.id || '');
        return typeof valor === 'string' ? valor.trim() : '';
    };
    const nomeVisivel = (valor) => {
        if (typeof valor !== 'string' || !valor.trim()) return '';
        const nome = valor.trim();
        if (/^[\da-f]{24}$/i.test(nome)) return '';
        const normalizado = nome.toLowerCase();
        if (normalizado.includes('matriz')) return 'Matriz';
        if (normalizado.includes('filial')) {
            const filialNumerada = nome.match(/filial\s+\d+/i);
            return filialNumerada ? `Filial ${filialNumerada[0].match(/\d+/)[0]}` : 'Filial';
        }
        return nome;
    };
    const salaValor = dado.sala != null ? String(dado.sala) : '';
    const [estudioIdDaSala = ''] = salaValor.split(/[|:]/);
    const idDireto = idEstudio(dado.estudioId)
        || idEstudio(dado.estudio)
        || (/^[\da-f]{24}$/i.test(String(dado.estudioNome || '').trim()) ? String(dado.estudioNome).trim() : '');
    const idParaRotulo = idDireto || (salaValor.includes('|') || salaValor.includes(':') ? estudioIdDaSala : '');
    const rotuloOrdenado = resolverRotuloEstudioPorId(idParaRotulo);
    if (rotuloOrdenado) return rotuloOrdenado;

    const nomePorId = (valor) => {
        const id = idEstudio(valor);
        if (!id) return '';
        const estudio = estudios.find((item) => String(item._id || item.id || '') === id);
        return nomeVisivel(estudio?.nome || estudio?.name);
    };

    const nomeDireto = nomeVisivel(dado.estudioNome)
        || nomeVisivel(dado.estudio?.nome)
        || nomeVisivel(dado.estudio?.name)
        || nomeVisivel(dado.estudio)
        || nomeVisivel(dado.estudioId?.nome)
        || nomeVisivel(dado.estudioId?.name)
        || nomeVisivel(dado.estudioId);
    if (nomeDireto) return nomeDireto;

    const nomeDiretoPorId = nomePorId(idDireto);
    if (nomeDiretoPorId) return nomeDiretoPorId;

    const [, numeroDaSala = ''] = salaValor.split(/[|:]/);
    const salaComposta = salaValor.includes('|') || salaValor.includes(':');
    const idEstudioResolvido = idDireto || estudioIdDaSala;
    let salasCorrespondentes = todasAsSalas.filter((sala) => {
        const numero = String(sala.numero || '');
        const idSala = String(sala._id || sala.id || '');
        const valorEstudioSala = sala.estudio || sala.estudioId;
        const idSalaEstudio = idEstudio(valorEstudioSala);
        if (salaComposta) {
            return numero === numeroDaSala
                && idSalaEstudio === estudioIdDaSala;
        }
        if (idSala === salaValor) return true;
        if (numero !== salaValor) return false;
        return !idEstudioResolvido || idSalaEstudio === idEstudioResolvido;
    });

    if (!salaComposta && salasCorrespondentes.length > 1) {
        salasCorrespondentes = [];
    }
    const salaEncontrada = salasCorrespondentes[0];

    if (salaEncontrada) {
        const eVal = salaEncontrada.estudio || salaEncontrada.estudioId;
        const nomeDaSala = nomeVisivel(salaEncontrada.estudioNome)
            || nomeVisivel(eVal?.nome || eVal?.name)
            || nomePorId(eVal);
        if (nomeDaSala) return nomeDaSala;
    }

    return 'Não preenchido';
}

function resolverNomeCadastradoSala(dado) {
    const todasAsSalas = Array.isArray(window.__todasAsSalas) ? window.__todasAsSalas : [];
    const obterId = (valor) => {
        if (valor && typeof valor === 'object') return String(valor._id || valor.id || '');
        return typeof valor === 'string' ? valor.trim() : '';
    };
    const salaValor = dado.sala != null ? String(dado.sala).trim() : '';
    if (!salaValor) return '';

    const separador = salaValor.search(/[|:]/);
    const composta = separador >= 0;
    const partesSala = composta ? salaValor.split(/[|:]/) : [];
    const estudioId = obterId(dado.estudioId)
        || obterId(dado.estudio)
        || (composta ? partesSala[0] : '');
    const numero = composta ? partesSala[partesSala.length - 1] : salaValor;
    let salasCorrespondentes = todasAsSalas.filter((sala) => {
        const idSala = String(sala._id || sala.id || '');
        if (!composta && idSala === salaValor) return true;
        if (String(sala.numero || '') !== numero) return false;
        if (estudioId) return obterId(sala.estudioId || sala.estudio) === estudioId;
        return true;
    });

    if (salasCorrespondentes.length !== 1) return '';
    const salaEncontrada = salasCorrespondentes[0];
    const nomeSala = String(salaEncontrada.nome || '').trim();
    const numeroSala = String(salaEncontrada.numero || numero);
    if (!nomeSala) return numeroSala;
    return nomeSala === numeroSala ? nomeSala : `${nomeSala} (${numeroSala})`;
}

function resolverTextoSala(dado, mostrarNomeCadastrado = false) {
    if (!dado || dado.sala == null) return '---';
    if (mostrarNomeCadastrado) return resolverNomeCadastradoSala(dado) || resolverTextoSala(dado);

    const salaValor = String(dado.sala).trim();
    const separador = salaValor.search(/[|:]/);
    if (separador >= 0) {
        return salaValor.slice(separador + 1).split(/[|:]/).pop().trim();
    }

    const todasAsSalas = Array.isArray(window.__todasAsSalas) ? window.__todasAsSalas : [];
    const salaEncontrada = todasAsSalas.find((sala) => String(sala._id || sala.id || '') === salaValor);
    return salaEncontrada ? String(salaEncontrada.numero ?? salaEncontrada.nome ?? salaValor) : salaValor;
}

function renderTabelaComPaginacao(data) {
    const containerTabela = document.getElementById('tableInner');
    let mostrarNomeCadastrado = false;
    const celulasEstudio = [];
    let mostrarNomeSala = false;
    const celulasSala = [];

    // Criar tabela HTML
    const tabela = document.createElement('table');

    // Criar cabeçalho da tabela
    const cabecalho = tabela.createTHead();
    const linhaCabecalho = cabecalho.insertRow();
    ['Solicitante', 'Estúdio', 'Sala', 'Dia', 'Hora', 'Motivo'].forEach((coluna) => {
        const celula = document.createElement('th');
        celula.textContent = coluna;
        linhaCabecalho.appendChild(celula);
        if (coluna === 'Estúdio') {
            celula.style.cursor = 'pointer';
            celula.tabIndex = 0;
            celula.setAttribute('role', 'button');
            celula.setAttribute('aria-pressed', 'false');
            celula.title = 'Clique para exibir o nome cadastrado do estúdio';

            const alternarNomeEstudio = () => {
                mostrarNomeCadastrado = !mostrarNomeCadastrado;
                celula.setAttribute('aria-pressed', String(mostrarNomeCadastrado));
                celula.title = mostrarNomeCadastrado
                    ? 'Clique para voltar aos rótulos resumidos'
                    : 'Clique para exibir o nome cadastrado do estúdio';
                celulasEstudio.forEach(({ celulaEstudio, dado }) => {
                    celulaEstudio.textContent = resolverTextoEstudio(dado, mostrarNomeCadastrado);
                });
            };

            celula.addEventListener('click', alternarNomeEstudio);
            celula.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    alternarNomeEstudio();
                }
            });
        } else if (coluna === 'Sala') {
            celula.style.cursor = 'pointer';
            celula.tabIndex = 0;
            celula.setAttribute('role', 'button');
            celula.setAttribute('aria-pressed', 'false');
            celula.title = 'Clique para exibir o nome cadastrado da sala';

            const alternarNomeSala = () => {
                mostrarNomeSala = !mostrarNomeSala;
                celula.setAttribute('aria-pressed', String(mostrarNomeSala));
                celula.title = mostrarNomeSala
                    ? 'Clique para voltar ao número da sala'
                    : 'Clique para exibir o nome cadastrado da sala';
                celulasSala.forEach(({ celulaSala, dado }) => {
                    celulaSala.textContent = resolverTextoSala(dado, mostrarNomeSala);
                });
            };

            celula.addEventListener('click', alternarNomeSala);
            celula.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    alternarNomeSala();
                }
            });
        }
    });

    // Criar linhas da tabela
    data.forEach((dado) => {
        const linha = tabela.insertRow();
        if (dado && dado._id) {
            linha.dataset.id = dado._id;
        }
        const celulaSolicitante = linha.insertCell();
        
        if (dado.solicitante && typeof dado.solicitante === 'object' && dado.solicitante.solicitante) {
            celulaSolicitante.textContent = dado.solicitante.solicitante;
        } else {
            celulaSolicitante.textContent = dado.solicitante || '---';
        }
        atribuirClick(linha, dado);

        const celulaEstudio = linha.insertCell();
        celulaEstudio.textContent = resolverTextoEstudio(dado, mostrarNomeCadastrado);
        celulasEstudio.push({ celulaEstudio, dado });

        const celulaSala = linha.insertCell();
        celulaSala.textContent = resolverTextoSala(dado, mostrarNomeSala);
        celulasSala.push({ celulaSala, dado });
        linha.insertCell().textContent = formatarDiaParaTabela(dado.dia, dado.isAulaFixa);
        linha.insertCell().textContent = dado.hora;
        linha.insertCell().textContent = dado.motivo;
    });

    // Adicionar tabela ao documento
    containerTabela.appendChild(tabela);

    destacarUltimoCriado(tabela);
}

// Cria a tabela c dados
export function criaTabela(data) {
    // data pode ser o objeto de paginação ou um array (compatibilidade)
    let rows = [];
    if (Array.isArray(data)) {
        rows = data;
    } else if (data && Array.isArray(data.data)) {
        rows = data.data;
    }

    // Supondo que você tenha um container para exibir a tabela
    const containerInner = document.getElementById('tableInner');
    if (!containerInner) {
        console.error('Elemento #tableInner não encontrado');
        return;
    }

    // Limpar o container antes de renderizar a tabela (mantendo a paginação em outro container)
    containerInner.innerHTML = '';

    // Chamar a função para criar a tabela com os dados obtidos
    renderTabelaComPaginacao(rows);
}

/*
================================================================================
DOCUMENTAÇÃO DO ARQUIVO: tabela.js
================================================================================

1. FINALIDADE
   Gerencia a busca de dados no servidor e a renderização da tabela HTML no
   frontend, incluindo a integração com a lógica de paginação e preenchimento
   de formulários ao clicar em uma linha.

2. FUNÇÕES
   - getDados: Realiza a requisição GET para a API (/usos/usos) para obter
     a lista completa de registros.
   - preencherInputs: Preenche os campos do formulário de edição com os dados
     da linha selecionada na tabela.
   - atribuirClick: Adiciona um evento de clique nas células da tabela para
     acionar o preenchimento do formulário.
   - renderTabelaComPaginacao: Constrói o HTML da tabela (thead, tbody, rows)
     dinamicamente com base nos dados recebidos.
   - criaTabela: Função principal exportada que orquestra a paginação (via
     paginacao.js) e chama a renderização da tabela.

3. OBSERVAÇÕES
   - Depende de 'paginacao.js' para fatiar os dados conforme a página atual.
   - Manipula diretamente o DOM (document.getElementById, createElement).
================================================================================
*/