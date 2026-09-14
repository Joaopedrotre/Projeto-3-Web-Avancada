-- ============================================================
-- AUTO NOBRE REPRESENTAÇÕES - PAINEL DE CONTROLE
-- Script de criação do banco de dados (MariaDB)
-- Projeto 3 - 3º Bimestre
-- ============================================================

CREATE DATABASE IF NOT EXISTS auto_nobre
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE auto_nobre;

-- ============================================================
-- TABELAS BASE
-- ============================================================

CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nome_categoria VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome_produto VARCHAR(120) NOT NULL,
    id_categoria INT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
        ON DELETE SET NULL
);

CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    data_pedido DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_produto
        FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
        ON DELETE CASCADE
);

-- ============================================================
-- FUNCTION REUTILIZÁVEL
-- Calcula o status do estoque de um produto (usada em views e SP)
-- ============================================================

DELIMITER //

CREATE FUNCTION fn_statusEstoque(p_quantidade INT, p_minimo INT)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_status VARCHAR(20);

    IF p_quantidade <= 0 THEN
        SET v_status = 'Esgotado';
    ELSEIF p_quantidade <= p_minimo THEN
        SET v_status = 'Crítico';
    ELSE
        SET v_status = 'Normal';
    END IF;

    RETURN v_status;
END //

DELIMITER ;

-- ============================================================
-- TRIGGER BEFORE UPDATE
-- Impede que estoque ou preço fiquem negativos
-- ============================================================

DELIMITER //

CREATE TRIGGER trg_produtos_before_update
BEFORE UPDATE ON produtos
FOR EACH ROW
BEGIN
    IF NEW.quantidade_estoque < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A quantidade em estoque não pode ser negativa.';
    END IF;

    IF NEW.preco_unitario < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'O preço unitário não pode ser negativo.';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- VIEW CONSOLIDADORA
-- Junta produtos + categorias + status de estoque (via FUNCTION)
-- ============================================================

CREATE VIEW vw_estoque_produtos AS
SELECT
    p.id_produto,
    p.nome_produto,
    COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
    p.preco_unitario,
    p.quantidade_estoque,
    p.estoque_minimo,
    fn_statusEstoque(p.quantidade_estoque, p.estoque_minimo) AS status_estoque,
    p.ativo
FROM produtos p
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria;

-- ============================================================
-- VIEW ANALÍTICA
-- Detalha cada pedido já com o valor total calculado
-- ============================================================

CREATE VIEW vw_pedidos_detalhados AS
SELECT
    ped.id_pedido,
    ped.data_pedido,
    ped.status,
    p.id_produto,
    p.nome_produto,
    COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
    ped.quantidade,
    ped.valor_unitario,
    (ped.quantidade * ped.valor_unitario) AS valor_total
FROM pedidos ped
INNER JOIN produtos p ON p.id_produto = ped.id_produto
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria;

-- ============================================================
-- VIEW ANALÍTICA COM CTE
-- Faturamento consolidado por categoria (ignora pedidos cancelados)
-- ============================================================

CREATE VIEW vw_faturamento_categoria AS
WITH pedidos_validos AS (
    SELECT
        p.id_categoria,
        ped.id_pedido,
        (ped.quantidade * ped.valor_unitario) AS valor_total
    FROM pedidos ped
    INNER JOIN produtos p ON p.id_produto = ped.id_produto
    WHERE ped.status <> 'Cancelado'
)
SELECT
    c.id_categoria,
    c.nome_categoria,
    COALESCE(SUM(pv.valor_total), 0) AS faturamento_total,
    COALESCE(COUNT(pv.id_pedido), 0) AS total_pedidos
FROM categorias c
LEFT JOIN pedidos_validos pv ON pv.id_categoria = c.id_categoria
GROUP BY c.id_categoria, c.nome_categoria;

-- ============================================================
-- STORED PROCEDURE
-- Busca de produtos com filtro por termo/categoria + paginação
-- Chamada via: CALL sp_buscarProdutos('termo', categoria, limite, offset)
-- ============================================================

DELIMITER //

CREATE PROCEDURE sp_buscarProdutos(
    IN p_termo VARCHAR(100),
    IN p_categoria INT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    SELECT
        p.id_produto,
        p.nome_produto,
        COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
        p.id_categoria,
        p.preco_unitario,
        p.quantidade_estoque,
        p.estoque_minimo,
        fn_statusEstoque(p.quantidade_estoque, p.estoque_minimo) AS status_estoque,
        p.ativo
    FROM produtos p
    LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE (p_termo IS NULL OR p_termo = '' OR p.nome_produto LIKE CONCAT('%', p_termo, '%'))
      AND (p_categoria IS NULL OR p_categoria = 0 OR p.id_categoria = p_categoria)
    ORDER BY p.nome_produto ASC
    LIMIT p_limite OFFSET p_offset;
END //

DELIMITER ;

-- ============================================================
-- DADOS DE EXEMPLO
-- ============================================================

INSERT INTO categorias (nome_categoria, descricao) VALUES
('Embalagens Flexíveis', 'Sacos, filmes e laminados para embalagem'),
('Embalagens Rígidas', 'Potes, baldes e caixas plásticas'),
('Rótulos e Etiquetas', 'Materiais de identificação de produtos'),
('Fitas e Adesivos', 'Fitas adesivas industriais e de vedação');

INSERT INTO produtos (nome_produto, id_categoria, preco_unitario, quantidade_estoque, estoque_minimo) VALUES
('Saco Plástico Transparente 30x40', 1, 0.18, 4000, 500),
('Filme Stretch 45cm', 1, 32.50, 120, 20),
('Pote Plástico 500ml', 2, 1.25, 800, 100),
('Balde Plástico 15L', 2, 9.90, 60, 15),
('Caixa Plástica Organizadora', 2, 24.00, 8, 10),
('Rótulo Adesivo Personalizado', 3, 0.09, 15000, 2000),
('Etiqueta Térmica 10x15', 3, 0.04, 200, 1000),
('Fita Adesiva Transparente 45mm', 4, 4.75, 350, 50),
('Fita Crepe 24mm', 4, 3.20, 40, 30);

INSERT INTO pedidos (id_produto, quantidade, valor_unitario, data_pedido, status) VALUES
(1, 1000, 0.18, '2026-08-02', 'Confirmado'),
(2, 30, 32.50, '2026-08-05', 'Confirmado'),
(3, 200, 1.25, '2026-08-06', 'Confirmado'),
(4, 15, 9.90, '2026-08-10', 'Pendente'),
(6, 5000, 0.09, '2026-08-12', 'Confirmado'),
(8, 100, 4.75, '2026-08-15', 'Confirmado'),
(1, 500, 0.18, '2026-08-20', 'Cancelado'),
(9, 20, 3.20, '2026-09-01', 'Confirmado'),
(3, 150, 1.25, '2026-09-05', 'Pendente');
