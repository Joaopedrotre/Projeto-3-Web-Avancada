// =====================================================================
// CAMADA DE COMUNICAÇÃO COM A API PHP
// Todo fetch usa async/await e try/catch, sem HTML renderizado no PHP.
// =====================================================================

import type { DadosDashboard, Produto, RespostaApi } from './types.js';

const URL_BASE = '/auto-nobre/backend/api';

// FUNÇÃO GENÉRICA DE REQUISIÇÃO
async function requisitar<T>(caminho: string, opcoes?: RequestInit): Promise<RespostaApi<T>> {
    try {
        const resposta = await fetch(`${URL_BASE}/${caminho}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opcoes,
        });

        const corpo: unknown = await resposta.json();

        if (!ehRespostaApiValida<T>(corpo)) {
            return { sucesso: false, mensagem: 'Resposta da API em formato inesperado.' };
        }

        if (!resposta.ok) {
            return { sucesso: false, mensagem: corpo.mensagem ?? 'Falha na requisição.' };
        }

        return corpo;
    } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : 'Erro desconhecido.';
        return { sucesso: false, mensagem: `Não foi possível conectar à API: ${detalhe}` };
    }
}

// VERIFICAÇÃO DE FORMATO SEM USAR "any"
function ehRespostaApiValida<T>(valor: unknown): valor is RespostaApi<T> {
    if (typeof valor !== 'object' || valor === null) {
        return false;
    }
    return 'sucesso' in valor;
}

// DASHBOARD
export async function buscarDadosDashboard(): Promise<RespostaApi<DadosDashboard>> {
    return requisitar<DadosDashboard>('dashboard.php');
}

// PRODUTOS - CRUD
export async function listarProdutos(termoBusca = '', categoriaId = 0): Promise<RespostaApi<Produto[]>> {
    const parametros = new URLSearchParams({
        busca: termoBusca,
        categoria_id: String(categoriaId),
    });
    return requisitar<Produto[]>(`produtos.php?${parametros.toString()}`);
}

export async function criarProduto(produto: Omit<Produto, 'id' | 'categoria_nome'>): Promise<RespostaApi<{ id: number }>> {
    return requisitar<{ id: number }>('produtos.php', {
        method: 'POST',
        body: JSON.stringify(produto),
    });
}

export async function atualizarProduto(id: number, produto: Omit<Produto, 'id' | 'categoria_nome'>): Promise<RespostaApi<null>> {
    return requisitar<null>(`produtos.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(produto),
    });
}

export async function removerProduto(id: number): Promise<RespostaApi<null>> {
    return requisitar<null>(`produtos.php?id=${id}`, { method: 'DELETE' });
}
