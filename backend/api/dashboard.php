<?php
// =====================================================================
// API DO DASHBOARD
// Entrega os dados BRUTOS já limpos/consolidados pelas Views do banco.
// Toda a agregação (faturamento, ranking, segmentação de estoque)
// acontece no TypeScript com reduce/filter/map, conforme a rubrica.
// =====================================================================

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

definirCabecalhosJson();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['sucesso' => false, 'mensagem' => 'Método não permitido.']);
    exit;
}

$pdo = obterConexao();

$itensPedidos = $pdo->query('SELECT * FROM vw_pedidos_detalhados')->fetchAll();
$estoqueProdutos = $pdo->query('SELECT * FROM vw_estoque_produtos')->fetchAll();

echo json_encode([
    'sucesso' => true,
    'dados' => [
        'itensPedidos' => $itensPedidos,
        'estoqueProdutos' => $estoqueProdutos,
    ],
]);
