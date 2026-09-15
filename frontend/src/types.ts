// =====================================================================
// TIPOS COMPARTILHADOS
// =====================================================================

export interface Categoria {
    id: number;
    nome: string;
    descricao: string | null;
}

export interface Produto {
    id: number;
    nome: string;
    preco_unitario: number;
    estoque: number;
    estoque_minimo: number;
    categoria_id: number;
    categoria_nome: string;
}

// Linha bruta vinda de vw_pedidos_detalhados (sem faturamento calculado)
export interface ItemPedido {
    item_id: number;
    pedido_id: number;
    cliente: string;
    data_pedido: string;
    status: string;
    produto_id: number;
    produto_nome: string;
    categoria_id: number;
    categoria_nome: string;
    quantidade: number;
    valor_unitario: number;
}

// Linha bruta vinda de vw_estoque_produtos
export interface EstoqueProduto {
    produto_id: number;
    produto_nome: string;
    categoria_nome: string;
    preco_unitario: number;
    estoque: number;
    estoque_minimo: number;
    estoque_critico: number; // MariaDB devolve 0/1 para BOOLEAN
}

export interface DadosDashboard {
    itensPedidos: ItemPedido[];
    estoqueProdutos: EstoqueProduto[];
}

// Envelope padrão de resposta da API PHP
export interface RespostaApi<T> {
    sucesso: boolean;
    mensagem?: string;
    dados?: T;
    id?: number;
}

// Resultado de ranking de produto mais vendido
export interface RankingProduto {
    produtoNome: string;
    quantidadeTotal: number;
    faturamentoTotal: number;
}
