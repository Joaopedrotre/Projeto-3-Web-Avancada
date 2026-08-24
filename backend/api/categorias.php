<?php
// =====================================================================
// API DE CATEGORIAS (leitura)
// O CRUD completo de Categorias será implementado na próxima etapa,
// seguindo exatamente o mesmo padrão de produtos.php.
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
$categorias = $pdo->query('SELECT id, nome, descricao FROM categorias ORDER BY nome')->fetchAll();

echo json_encode(['sucesso' => true, 'dados' => $categorias]);
