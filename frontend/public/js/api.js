// =====================================================================
// CAMADA DE COMUNICAÇÃO COM A API PHP
// Todo fetch usa async/await e try/catch, sem HTML renderizado no PHP.
// =====================================================================
const URL_BASE = '/auto-nobre/backend/api';
// FUNÇÃO GENÉRICA DE REQUISIÇÃO
async function requisitar(caminho, opcoes) {
    try {
        const resposta = await fetch(`${URL_BASE}/${caminho}`, {
            headers: { 'Content-Type': 'application/json' },
            ...opcoes,
        });
        const corpo = await resposta.json();
        if (!ehRespostaApiValida(corpo)) {
            return { sucesso: false, mensagem: 'Resposta da API em formato inesperado.' };
        }
        if (!resposta.ok) {
            return { sucesso: false, mensagem: corpo.mensagem ?? 'Falha na requisição.' };
        }
        return corpo;
    }
    catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : 'Erro desconhecido.';
        return { sucesso: false, mensagem: `Não foi possível conectar à API: ${detalhe}` };
    }
}
// VERIFICAÇÃO DE FORMATO SEM USAR "any"
function ehRespostaApiValida(valor) {
    if (typeof valor !== 'object' || valor === null) {
        return false;
    }
    return 'sucesso' in valor;
}
// DASHBOARD
export async function buscarDadosDashboard() {
    return requisitar('dashboard.php');
}
// PRODUTOS - CRUD
export async function listarProdutos(termoBusca = '', categoriaId = 0) {
    const parametros = new URLSearchParams({
        busca: termoBusca,
        categoria_id: String(categoriaId),
    });
    return requisitar(`produtos.php?${parametros.toString()}`);
}
export async function criarProduto(produto) {
    return requisitar('produtos.php', {
        method: 'POST',
        body: JSON.stringify(produto),
    });
}
export async function atualizarProduto(id, produto) {
    return requisitar(`produtos.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(produto),
    });
}
export async function removerProduto(id) {
    return requisitar(`produtos.php?id=${id}`, { method: 'DELETE' });
}
//# sourceMappingURL=api.js.map