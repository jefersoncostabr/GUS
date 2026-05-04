/**
 * Transforma um objeto de Aula Regular no formato esperado pela tabela de Usos.
 * Isso permite reaproveitar toda a lógica de renderização.
 */
export function normalizarAulaParaUso(aula) {
    return {
        _id: aula._id,
        // Mapeia Professor para Solicitante
        solicitante: aula.professor ? { 
            solicitante: aula.professor.solicitante || "Professor não definido",
            _id: aula.professor._id 
        } : { solicitante: "Não definido" },
        sala: aula.sala,
        dia: aula.diaSemana,      // Mapeia diaSemana (ex: segunda) para a coluna Dia
        hora: aula.horaInicio,    // Mapeia horaInicio para a coluna Hora
        motivo: aula.modalidade,  // Mapeia modalidade para a coluna Motivo
        isAulaFixa: true
    };
}

export function normalizarListaAulas(aulas) {
    return aulas.map(normalizarAulaParaUso);
}