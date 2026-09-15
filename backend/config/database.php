<?php
// =====================================================================
// CONEXÃO COM O BANCO (PDO + prepared statements)
// =====================================================================

declare(strict_types=1);

function obterConexao(): PDO
{
    $host = 'localhost';
    $dbname = 'auto_nobre';
    $user = 'root';
    $senha = ''; // XAMPP: usuário root sem senha por padrão

    $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";

    try {
        $pdo = new PDO($dsn, $user, $senha, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Falha ao conectar ao banco de dados.',
            'erro' => $e->getMessage(),
        ]);
        exit;
    }
}

// CABEÇALHOS PADRÃO DA API (somente JSON, sem HTML)
function definirCabecalhosJson(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
