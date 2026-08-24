<?php
// =====================================================================
// API DE PRODUTOS - CRUD completo
// Endpoints:
//   GET    produtos.php            -> lista todos (usa a Stored Procedure)
//   GET    produtos.php?id=1       -> busca um produto
//   POST   produtos.php            -> cria produto
//   PUT    produtos.php?id=1       -> atualiza produto
//   DELETE produtos.php?id=1       -> remove produto (com confirmação)
// =====================================================================

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

definirCabecalhosJson();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = obterConexao();
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        tratarGet($pdo);
        break;
    case 'POST':
        tratarPost($pdo);
        break;
    case 'PUT':
        tratarPut($pdo);
        break;
    case 'DELETE':
        tratarDelete($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.']);
}

// ---------------------------------------------------------------------
// GET - lista (com busca/filtro/paginação via CALL) ou busca por id
// ---------------------------------------------------------------------
function tratarGet(PDO $pdo): void
{
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.nome, p.preco_unitario, p.estoque, p.estoque_minimo,
                    c.id AS categoria_id, c.nome AS categoria_nome
             FROM produtos p
             JOIN categorias c ON c.id = p.categoria_id
             WHERE p.id = :id AND p.ativo = 1'
        );
        $stmt->execute(['id' => (int) $_GET['id']]);
        $produto = $stmt->fetch();

        if (!$produto) {
            http_response_code(404);
            echo json_encode(['sucesso' => false, 'mensagem' => 'Produto não encontrado.']);
            return;
        }

        echo json_encode(['sucesso' => true, 'dados' => $produto]);
        return;
    }

    // Parâmetros de busca/filtro/paginação
    $termoBusca = isset($_GET['busca']) ? (string) $_GET['busca'] : '';
    $categoriaId = isset($_GET['categoria_id']) ? (int) $_GET['categoria_id'] : 0;
    $pagina = isset($_GET['pagina']) ? max((int) $_GET['pagina'], 1) : 1;
    $porPagina = isset($_GET['por_pagina']) ? (int) $_GET['por_pagina'] : 50;

    $stmt = $pdo->prepare('CALL sp_buscarProdutos(:termo, :categoria, :pagina, :porPagina)');
    $stmt->bindValue(':termo', $termoBusca, PDO::PARAM_STR);
    $stmt->bindValue(':categoria', $categoriaId, PDO::PARAM_INT);
    $stmt->bindValue(':pagina', $pagina, PDO::PARAM_INT);
    $stmt->bindValue(':porPagina', $porPagina, PDO::PARAM_INT);
    $stmt->execute();

    $produtos = $stmt->fetchAll();

    echo json_encode(['sucesso' => true, 'dados' => $produtos]);
}

// ---------------------------------------------------------------------
// POST - cria produto
// ---------------------------------------------------------------------
function tratarPost(PDO $pdo): void
{
    $corpo = json_decode(file_get_contents('php://input'), true);

    if (!is_array($corpo) || empty($corpo['nome']) || !isset($corpo['categoria_id'])) {
        http_response_code(422);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Dados incompletos para criar o produto.']);
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO produtos (categoria_id, nome, preco_unitario, estoque, estoque_minimo)
         VALUES (:categoria_id, :nome, :preco_unitario, :estoque, :estoque_minimo)'
    );

    $stmt->execute([
        'categoria_id' => (int) $corpo['categoria_id'],
        'nome' => (string) $corpo['nome'],
        'preco_unitario' => (float) ($corpo['preco_unitario'] ?? 0),
        'estoque' => (int) ($corpo['estoque'] ?? 0),
        'estoque_minimo' => (int) ($corpo['estoque_minimo'] ?? 5),
    ]);

    http_response_code(201);
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Produto criado com sucesso.',
        'id' => (int) $pdo->lastInsertId(),
    ]);
}

// ---------------------------------------------------------------------
// PUT - atualiza produto (trigger garante que não fiquem valores negativos)
// ---------------------------------------------------------------------
function tratarPut(PDO $pdo): void
{
    if (!isset($_GET['id'])) {
        http_response_code(422);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Informe o id do produto a atualizar.']);
        return;
    }

    $corpo = json_decode(file_get_contents('php://input'), true);

    if (!is_array($corpo)) {
        http_response_code(422);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Corpo da requisição inválido.']);
        return;
    }

    $stmt = $pdo->prepare(
        'UPDATE produtos
         SET nome = :nome,
             categoria_id = :categoria_id,
             preco_unitario = :preco_unitario,
             estoque = :estoque,
             estoque_minimo = :estoque_minimo
         WHERE id = :id'
    );

    $stmt->execute([
        'nome' => (string) $corpo['nome'],
        'categoria_id' => (int) $corpo['categoria_id'],
        'preco_unitario' => (float) $corpo['preco_unitario'],
        'estoque' => (int) $corpo['estoque'],
        'estoque_minimo' => (int) ($corpo['estoque_minimo'] ?? 5),
        'id' => (int) $_GET['id'],
    ]);

    echo json_encode(['sucesso' => true, 'mensagem' => 'Produto atualizado com sucesso.']);
}

// ---------------------------------------------------------------------
// DELETE - remove produto (soft delete) com mensagem de confirmação clara
// ---------------------------------------------------------------------
function tratarDelete(PDO $pdo): void
{
    if (!isset($_GET['id'])) {
        http_response_code(422);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Informe o id do produto a remover.']);
        return;
    }

    $id = (int) $_GET['id'];

    $busca = $pdo->prepare('SELECT nome FROM produtos WHERE id = :id AND ativo = 1');
    $busca->execute(['id' => $id]);
    $produto = $busca->fetch();

    if (!$produto) {
        http_response_code(404);
        echo json_encode(['sucesso' => false, 'mensagem' => 'Produto não encontrado ou já removido.']);
        return;
    }

    $stmt = $pdo->prepare('UPDATE produtos SET ativo = 0 WHERE id = :id');
    $stmt->execute(['id' => $id]);

    echo json_encode([
        'sucesso' => true,
        'mensagem' => "Produto \"{$produto['nome']}\" removido com sucesso.",
    ]);
}
