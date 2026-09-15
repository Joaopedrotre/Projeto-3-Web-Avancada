// =====================================================================
// LÓGICA AVANÇADA DO DASHBOARD
// =====================================================================

import type { DadosDashboard, EstoqueProduto, ItemPedido, RankingProduto } from './types.js';
import { buscarDadosDashboard } from './api.js';

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// ---------------------------------------------------------------------
// REDUCE: faturamento total = quantidade x valor unitário, item a item
// ---------------------------------------------------------------------
function calcularFaturamentoTotal(itens: ItemPedido[]): number {
    return itens.reduce((acumulado, item) => {
        return acumulado + item.quantidade * item.valor_unitario;
    }, 0);
}

// ---------------------------------------------------------------------
// FILTER: segmentação de estoque crítico (produtos abaixo do mínimo)
// ---------------------------------------------------------------------
function filtrarEstoqueCritico(produtos: EstoqueProduto[]): EstoqueProduto[] {
    return produtos.filter((produto) => produto.estoque_critico === 1);
}

// ---------------------------------------------------------------------
// REDUCE + MAP: ranking do produto mais vendido (por quantidade)
// ---------------------------------------------------------------------
function calcularRankingProdutos(itens: ItemPedido[]): RankingProduto[] {
    const totaisPorProduto = itens.reduce<Map<string, RankingProduto>>((mapa, item) => {
        const existente = mapa.get(item.produto_nome);
        const faturamentoItem = item.quantidade * item.valor_unitario;

        if (existente) {
            existente.quantidadeTotal += item.quantidade;
            existente.faturamentoTotal += faturamentoItem;
        } else {
            mapa.set(item.produto_nome, {
                produtoNome: item.produto_nome,
                quantidadeTotal: item.quantidade,
                faturamentoTotal: faturamentoItem,
            });
        }
        return mapa;
    }, new Map<string, RankingProduto>());

    return Array.from(totaisPorProduto.values()).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);
}

// ---------------------------------------------------------------------
// MAP: formatação de valores em Real para exibição
// ---------------------------------------------------------------------
function formatarValoresEmReais(valores: number[]): string[] {
    return valores.map((valor) => formatadorMoeda.format(valor));
}

// ---------------------------------------------------------------------
// RENDERIZAÇÃO NA TELA (com tratamento de cenário vazio)
// ---------------------------------------------------------------------
function exibirEstadoVazio(idContainer: string, mensagem = 'Nenhum dado registrado'): void {
    const container = document.getElementById(idContainer);
    if (container === null) {
        return;
    }
    container.innerHTML = `<p class="text-muted fst-italic mb-0">${mensagem}</p>`;
}

function renderizarKpis(itens: ItemPedido[]): void {
    const elementoFaturamento = document.getElementById('kpi-faturamento');
    const elementoPedidos = document.getElementById('kpi-pedidos');
    const elementoTicket = document.getElementById('kpi-ticket');

    if (elementoFaturamento === null || elementoPedidos === null || elementoTicket === null) {
        return;
    }

    if (itens.length === 0) {
        elementoFaturamento.textContent = 'Nenhum dado registrado';
        elementoPedidos.textContent = 'Nenhum dado registrado';
        elementoTicket.textContent = 'Nenhum dado registrado';
        return;
    }

    const faturamentoTotal = calcularFaturamentoTotal(itens);
    const pedidosUnicos = new Set(itens.map((item) => item.pedido_id));
    const ticketMedio = faturamentoTotal / pedidosUnicos.size;

    const valoresFormatados = formatarValoresEmReais([faturamentoTotal, ticketMedio]);
    const faturamentoFormatado = valoresFormatados[0] ?? formatadorMoeda.format(faturamentoTotal);
    const ticketFormatado = valoresFormatados[1] ?? formatadorMoeda.format(ticketMedio);

    elementoFaturamento.textContent = faturamentoFormatado;
    elementoPedidos.textContent = String(pedidosUnicos.size);
    elementoTicket.textContent = ticketFormatado;
}

function renderizarRanking(itens: ItemPedido[]): void {
    const idContainer = 'lista-ranking';
    const container = document.getElementById(idContainer);
    if (container === null) {
        return;
    }

    const ranking = calcularRankingProdutos(itens);

    if (ranking.length === 0) {
        exibirEstadoVazio(idContainer);
        return;
    }

    const linhas = ranking
        .slice(0, 5)
        .map((item, indice) => {
            const faturamentoFormatado = formatadorMoeda.format(item.faturamentoTotal);
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span><strong>#${indice + 1}</strong> ${item.produtoNome}</span>
                    <span class="text-end">
                        <span class="badge bg-info-subtle text-info-emphasis me-2">${item.quantidadeTotal} un.</span>
                        <span class="fw-semibold">${faturamentoFormatado}</span>
                    </span>
                </li>`;
        })
        .join('');

    container.innerHTML = `<ul class="list-group list-group-flush">${linhas}</ul>`;
}

function renderizarEstoqueCritico(produtos: EstoqueProduto[]): void {
    const idContainer = 'tabela-estoque-critico';
    const container = document.getElementById(idContainer);
    if (container === null) {
        return;
    }

    const critico = filtrarEstoqueCritico(produtos);

    if (critico.length === 0) {
        exibirEstadoVazio(idContainer, 'Nenhum dado registrado — estoque saudável em todas as categorias');
        return;
    }

    const linhas = critico
        .map(
            (produto) => `
                <tr>
                    <td>${produto.produto_nome}</td>
                    <td>${produto.categoria_nome}</td>
                    <td class="text-danger fw-semibold">${produto.estoque}</td>
                    <td>${produto.estoque_minimo}</td>
                </tr>`
        )
        .join('');

    container.innerHTML = `
        <table class="table table-sm table-hover align-middle mb-0">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Estoque atual</th>
                    <th>Estoque mínimo</th>
                </tr>
            </thead>
            <tbody>${linhas}</tbody>
        </table>`;
}

// ---------------------------------------------------------------------
// INICIALIZAÇÃO DO DASHBOARD
// ---------------------------------------------------------------------
export async function inicializarDashboard(): Promise<void> {
    const alertaErro = document.getElementById('alerta-erro-dashboard');

    try {
        const resposta = await buscarDadosDashboard();

        if (!resposta.sucesso || resposta.dados === undefined) {
            throw new Error(resposta.mensagem ?? 'Falha ao carregar dados do dashboard.');
        }

        const dados: DadosDashboard = resposta.dados;

        renderizarKpis(dados.itensPedidos);
        renderizarRanking(dados.itensPedidos);
        renderizarEstoqueCritico(dados.estoqueProdutos);

        if (alertaErro !== null) {
            alertaErro.classList.add('d-none');
        }
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado ao carregar o dashboard.';
        if (alertaErro !== null) {
            alertaErro.textContent = mensagem;
            alertaErro.classList.remove('d-none');
        }
        exibirEstadoVazio('lista-ranking', 'Nenhum dado registrado');
        exibirEstadoVazio('tabela-estoque-critico', 'Nenhum dado registrado');
    }
}
