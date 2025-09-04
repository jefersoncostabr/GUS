    async function getArtistas() {
        const urlBase = 'https://placar-gamificado-teste.onrender.com';
        try {
            const response = await fetch(urlBase + '/usArtistas/artistas');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(error);
        }
    }

    const dados = await getArtistas();

    // Função para criar tabela
    function criarTabela(dados) {
      const tabela = document.createElement("table");
      const cabecalho = ["ARTISTA", "Frequência", "Drill", "Extra", "PONTOS"];

      // Criar header
      const thead = document.createElement("tr");
      cabecalho.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        th.style.backgroundColor = "#8d0000ff"; // vermelho cassino
        th.style.color = "#fff"; // texto branco
        th.style.fontWeight = "bold";
        th.style.fontSize = "1.1em";
        th.style.letterSpacing = "1px";
        th.style.padding = "8px";
        thead.appendChild(th);
      });
      tabela.appendChild(thead);

      // Criar linhas
      dados.forEach(item => {
        const tr = document.createElement("tr");

        const tdAluno = document.createElement("td");
        tdAluno.textContent = item.nome;
        tr.appendChild(tdAluno);

        const tdFreq = document.createElement("td");
        tdFreq.textContent = item.frequencia;
        tr.appendChild(tdFreq);

        const tdDrill = document.createElement("td");
        tdDrill.textContent = item.drill;
        tr.appendChild(tdDrill);

        const tdExtra = document.createElement("td");
        tdExtra.textContent = item.extra;
        tr.appendChild(tdExtra);

        const tdPontos = document.createElement("td");
        tdPontos.textContent = item.frequencia + item.drill + item.extra;
        tdPontos.id = "tdPontos";
        // tdPontos.style.color = "#FFD84B";
        // tdPontos.style.fontWeight = "bold";
        tr.appendChild(tdPontos);

        tabela.appendChild(tr);
      });

      return tabela;
    }

    // Renderizar tabela no container
    document.getElementById("tabela-container").appendChild(criarTabela(dados));