// =====================================================================
// TELA DE PRODUTOS - CRUD COMPLETO
// =====================================================================
import { atualizarProduto, criarProduto, listarProdutos, removerProduto } from './api.js';
const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let categoriasDisponiveis = [];
let produtoEmEdicaoId = null;
// ---------------------------------------------------------------------
// CARREGAMENTO E RENDERIZAÇÃO DA LISTA
// ---------------------------------------------------------------------
async function carregarProdutos() {
    const corpoTabela = document.getElementById('corpo-tabela-produtos');
    if (corpoTabela === null) {
        return;
    }
    const campoBusca = document.getElementById('campo-busca-produto');
    const termoBusca = campoBusca instanceof HTMLInputElement ? campoBusca.value : '';
    try {
        const resposta = await listarProdutos(termoBusca);
        if (!resposta.sucesso || resposta.dados === undefined) {
            throw new Error(resposta.mensagem ?? 'Falha ao carregar produtos.');
        }
        renderizarTabelaProdutos(resposta.dados);
    }
    catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado.';
        corpoTabela.innerHTML = `<tr><td colspan="5" class="text-danger">${mensagem}</td></tr>`;
    }
}
function renderizarTabelaProdutos(produtos) {
    const corpoTabela = document.getElementById('corpo-tabela-produtos');
    if (corpoTabela === null) {
        return;
    }
    if (produtos.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="5" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }
    corpoTabela.innerHTML = produtos
        .map((produto) => {
        const precoFormatado = formatadorMoeda.format(produto.preco_unitario);
        const classeEstoque = produto.estoque <= produto.estoque_minimo ? 'text-danger fw-semibold' : '';
        return `
                <tr>
                    <td>${produto.nome}</td>
                    <td>${produto.categoria_nome}</td>
                    <td>${precoFormatado}</td>
                    <td class="${classeEstoque}">${produto.estoque}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary btn-editar" data-id="${produto.id}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btn-remover" data-id="${produto.id}" data-nome="${produto.nome}">Remover</button>
                    </td>
                </tr>`;
    })
        .join('');
    registrarEventosLinhas(produtos);
}
function registrarEventosLinhas(produtos) {
    document.querySelectorAll('.btn-editar').forEach((botao) => {
        botao.addEventListener('click', () => {
            const id = Number(botao.dataset.id);
            const produto = produtos.find((item) => item.id === id);
            if (produto !== undefined) {
                abrirModalEdicao(produto);
            }
        });
    });
    document.querySelectorAll('.btn-remover').forEach((botao) => {
        botao.addEventListener('click', () => {
            const id = Number(botao.dataset.id);
            const nome = botao.dataset.nome ?? 'este produto';
            confirmarRemocao(id, nome);
        });
    });
}
// ---------------------------------------------------------------------
// CRIAÇÃO / EDIÇÃO (modal Bootstrap)
// ---------------------------------------------------------------------
function abrirModalCriacao() {
    produtoEmEdicaoId = null;
    limparFormulario();
    definirTituloModal('Novo produto');
    abrirModalBootstrap();
}
function abrirModalEdicao(produto) {
    produtoEmEdicaoId = produto.id;
    preencherFormulario(produto);
    definirTituloModal('Editar produto');
    abrirModalBootstrap();
}
function definirTituloModal(titulo) {
    const elemento = document.getElementById('titulo-modal-produto');
    if (elemento !== null) {
        elemento.textContent = titulo;
    }
}
function abrirModalBootstrap() {
    const elementoModal = document.getElementById('modal-produto');
    if (elementoModal === null) {
        return;
    }
    // O Bootstrap expõe "bootstrap" globalmente via CDN.
    const bootstrapGlobal = window.bootstrap;
    const instanciaModal = new bootstrapGlobal.Modal(elementoModal);
    instanciaModal.show();
}
function limparFormulario() {
    obterCampo('campo-nome').value = '';
    obterCampo('campo-preco').value = '';
    obterCampo('campo-estoque').value = '';
    obterCampo('campo-estoque-minimo').value = '5';
}
function preencherFormulario(produto) {
    obterCampo('campo-nome').value = produto.nome;
    obterCampo('campo-preco').value = String(produto.preco_unitario);
    obterCampo('campo-estoque').value = String(produto.estoque);
    obterCampo('campo-estoque-minimo').value = String(produto.estoque_minimo);
    obterCampo('campo-categoria').value = String(produto.categoria_id);
}
function obterCampo(id) {
    const elemento = document.getElementById(id);
    if (elemento instanceof HTMLInputElement) {
        return elemento;
    }
    throw new Error(`Campo "${id}" não encontrado no formulário.`);
}
async function salvarProduto(evento) {
    evento.preventDefault();
    const dadosProduto = {
        nome: obterCampo('campo-nome').value,
        preco_unitario: Number(obterCampo('campo-preco').value),
        estoque: Number(obterCampo('campo-estoque').value),
        estoque_minimo: Number(obterCampo('campo-estoque-minimo').value),
        categoria_id: Number(obterCampo('campo-categoria').value),
    };
    try {
        const resposta = produtoEmEdicaoId === null
            ? await criarProduto(dadosProduto)
            : await atualizarProduto(produtoEmEdicaoId, dadosProduto);
        if (!resposta.sucesso) {
            throw new Error(resposta.mensagem ?? 'Não foi possível salvar o produto.');
        }
        exibirNotificacao(resposta.mensagem ?? 'Produto salvo com sucesso.', 'success');
        fecharModalBootstrap();
        await carregarProdutos();
    }
    catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado ao salvar.';
        exibirNotificacao(mensagem, 'danger');
    }
}
function fecharModalBootstrap() {
    const elementoModal = document.getElementById('modal-produto');
    if (elementoModal === null) {
        return;
    }
    const bootstrapGlobal = window.bootstrap;
    const instancia = bootstrapGlobal.Modal.getInstance(elementoModal);
    if (instancia !== null) {
        instancia.hide();
    }
}
// ---------------------------------------------------------------------
// REMOÇÃO COM MENSAGEM DE CONFIRMAÇÃO CLARA
// ---------------------------------------------------------------------
function confirmarRemocao(id, nome) {
    const confirmado = window.confirm(`Tem certeza que deseja remover o produto "${nome}"? Esta ação não pode ser desfeita.`);
    if (!confirmado) {
        return;
    }
    void removerProdutoEAtualizar(id);
}
async function removerProdutoEAtualizar(id) {
    try {
        const resposta = await removerProduto(id);
        if (!resposta.sucesso) {
            throw new Error(resposta.mensagem ?? 'Não foi possível remover o produto.');
        }
        exibirNotificacao(resposta.mensagem ?? 'Produto removido com sucesso.', 'success');
        await carregarProdutos();
    }
    catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado ao remover.';
        exibirNotificacao(mensagem, 'danger');
    }
}
// ---------------------------------------------------------------------
// NOTIFICAÇÃO (toast Bootstrap)
// ---------------------------------------------------------------------
function exibirNotificacao(mensagem, tipo) {
    const container = document.getElementById('area-toasts');
    if (container === null) {
        return;
    }
    const corFundo = tipo === 'success' ? 'text-bg-success' : 'text-bg-danger';
    const idToast = `toast-${Date.now()}`;
    container.insertAdjacentHTML('beforeend', `<div id="${idToast}" class="toast align-items-center ${corFundo} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${mensagem}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>`);
    const elementoToast = document.getElementById(idToast);
    if (elementoToast === null) {
        return;
    }
    const bootstrapGlobal = window.bootstrap;
    new bootstrapGlobal.Toast(elementoToast).show();
}
// ---------------------------------------------------------------------
// INICIALIZAÇÃO DA TELA
// ---------------------------------------------------------------------
export async function inicializarTelaProdutos() {
    const formulario = document.getElementById('formulario-produto');
    const botaoNovo = document.getElementById('botao-novo-produto');
    const campoBusca = document.getElementById('campo-busca-produto');
    if (formulario !== null) {
        formulario.addEventListener('submit', (evento) => {
            void salvarProduto(evento);
        });
    }
    if (botaoNovo !== null) {
        botaoNovo.addEventListener('click', abrirModalCriacao);
    }
    if (campoBusca !== null) {
        campoBusca.addEventListener('input', () => {
            void carregarProdutos();
        });
    }
    await carregarProdutos();
}
export function definirCategorias(categorias) {
    categoriasDisponiveis = categorias;
    const seletor = document.getElementById('campo-categoria');
    if (seletor === null) {
        return;
    }
    seletor.innerHTML = categoriasDisponiveis
        .map((categoria) => `<option value="${categoria.id}">${categoria.nome}</option>`)
        .join('');
}
//# sourceMappingURL=produtos.js.map