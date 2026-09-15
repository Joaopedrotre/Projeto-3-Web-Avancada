-- =====================================================================
-- PROJETO 3 - AUTO NOBRE REPRESENTAÇÕES
-- BANCO DE DADOS AVANÇADO (MariaDB)
-- =====================================================================
-- Este script cobre os itens da rubrica:
--   - Criação de tabelas base
--   - CTE + View analítica que limpa/consolida dados brutos
--   - Trigger BEFORE UPDATE que impede valores negativos
--   - Function reutilizável
--   - Stored Procedure de busca/filtro/paginação (chamada via CALL)
--   - View consolidadora que une múltiplas tabelas
-- =====================================================================

CREATE DATABASE IF NOT EXISTS auto_nobre CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auto_nobre;

-- ---------------------------------------------------------------------
-- TABELAS BASE
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS pedido_itens;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS categorias;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_produtos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB;

CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente VARCHAR(120) NOT NULL,
    data_pedido DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
) ENGINE=InnoDB;

CREATE TABLE pedido_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_itens_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    CONSTRAINT fk_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- DADOS DE EXEMPLO (para o protótipo funcionar de imediato)
-- ---------------------------------------------------------------------

INSERT INTO categorias (nome, descricao) VALUES
    ('Embalagens Plásticas', 'Filmes, sacos e potes plásticos'),
    ('Embalagens de Papelão', 'Caixas e divisórias de papelão'),
    ('Rótulos e Etiquetas', 'Materiais de identificação de produto');

INSERT INTO produtos (categoria_id, nome, preco_unitario, estoque, estoque_minimo) VALUES
    (1, 'Filme Stretch 45cm', 32.90, 120, 20),
    (1, 'Saco Plástico Reforçado 30x40', 18.50, 8, 15),
    (2, 'Caixa Papelão Ondulado P', 4.75, 300, 50),
    (2, 'Caixa Papelão Ondulado G', 9.90, 12, 20),
    (3, 'Etiqueta Adesiva Termica', 0.35, 5000, 500),
    (3, 'Rótulo Fragil Pack 100un', 22.00, 3, 10);

INSERT INTO pedidos (cliente, data_pedido, status) VALUES
    ('Distribuidora Vale Sul', '2026-08-01', 'FATURADO'),
    ('Mercado Bom Preço', '2026-08-05', 'FATURADO'),
    ('Comercial Rio Claro', '2026-08-12', 'PENDENTE');

INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, valor_unitario) VALUES
    (1, 1, 50, 32.90),
    (1, 3, 200, 4.75),
    (2, 2, 10, 18.50),
    (2, 5, 1000, 0.35),
    (3, 4, 6, 9.90),
    (3, 6, 4, 22.00);

-- ---------------------------------------------------------------------
-- FUNCTION REUTILIZÁVEL
-- Calcula o valor total de um item de pedido (uso interno em consultas
-- e procedures do banco; o front-end refaz o cálculo agregando com
-- reduce() a partir dos dados brutos, conforme exigido pela rubrica).
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS fn_valorTotalItem;

DELIMITER $$
CREATE FUNCTION fn_valorTotalItem(p_quantidade INT, p_valorUnitario DECIMAL(10,2))
RETURNS DECIMAL(12,2)
DETERMINISTIC
BEGIN
    RETURN p_quantidade * p_valorUnitario;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- TRIGGER BEFORE UPDATE
-- Impede que preço unitário ou estoque sejam gravados com valor negativo.
-- ---------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_produtos_before_update;

DELIMITER $$
CREATE TRIGGER trg_produtos_before_update
BEFORE UPDATE ON produtos
FOR EACH ROW
BEGIN
    IF NEW.preco_unitario < 0 THEN
        SET NEW.preco_unitario = 0;
    END IF;
    IF NEW.estoque < 0 THEN
        SET NEW.estoque = 0;
    END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- VIEW ANALÍTICA (com CTE) - itens de pedido detalhados e limpos
-- Consolida pedidos + itens + produtos + categorias em uma única
-- fonte "crua e limpa" de dados, sem pré-calcular faturamento
-- (esse cálculo fica a cargo do reduce() no TypeScript).
-- ---------------------------------------------------------------------

DROP VIEW IF EXISTS vw_pedidos_detalhados;

CREATE VIEW vw_pedidos_detalhados AS
WITH itens_limpos AS (
    SELECT
        pi.id            AS item_id,
        pi.pedido_id,
        pi.produto_id,
        COALESCE(pi.quantidade, 0)      AS quantidade,
        COALESCE(pi.valor_unitario, 0)  AS valor_unitario
    FROM pedido_itens pi
)
SELECT
    il.item_id,
    p.id            AS pedido_id,
    p.cliente,
    p.data_pedido,
    p.status,
    pr.id           AS produto_id,
    pr.nome         AS produto_nome,
    c.id            AS categoria_id,
    c.nome          AS categoria_nome,
    il.quantidade,
    il.valor_unitario
FROM itens_limpos il
JOIN pedidos p   ON p.id = il.pedido_id
JOIN produtos pr ON pr.id = il.produto_id
JOIN categorias c ON c.id = pr.categoria_id;

-- ---------------------------------------------------------------------
-- VIEW CONSOLIDADORA - situação de estoque por categoria
-- Une produtos + categorias, servindo de base para .filter() no
-- front-end (segmentação de estoque crítico).
-- ---------------------------------------------------------------------

DROP VIEW IF EXISTS vw_estoque_produtos;

CREATE VIEW vw_estoque_produtos AS
SELECT
    pr.id             AS produto_id,
    pr.nome           AS produto_nome,
    c.nome            AS categoria_nome,
    pr.preco_unitario,
    pr.estoque,
    pr.estoque_minimo,
    (pr.estoque <= pr.estoque_minimo) AS estoque_critico
FROM produtos pr
JOIN categorias c ON c.id = pr.categoria_id
WHERE pr.ativo = 1;

-- ---------------------------------------------------------------------
-- STORED PROCEDURE - busca / filtro / paginação de produtos
-- Chamada pelo backend PHP via CALL sp_buscarProdutos(...)
-- ---------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_buscarProdutos;

DELIMITER $$
CREATE PROCEDURE sp_buscarProdutos(
    IN p_termoBusca   VARCHAR(120),
    IN p_categoriaId  INT,
    IN p_pagina       INT,
    IN p_porPagina    INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = GREATEST(p_pagina - 1, 0) * p_porPagina;

    SELECT
        pr.id,
        pr.nome,
        pr.preco_unitario,
        pr.estoque,
        pr.estoque_minimo,
        c.id   AS categoria_id,
        c.nome AS categoria_nome
    FROM produtos pr
    JOIN categorias c ON c.id = pr.categoria_id
    WHERE pr.ativo = 1
      AND (p_termoBusca IS NULL OR p_termoBusca = '' OR pr.nome LIKE CONCAT('%', p_termoBusca, '%'))
      AND (p_categoriaId IS NULL OR p_categoriaId = 0 OR pr.categoria_id = p_categoriaId)
    ORDER BY pr.nome
    LIMIT p_porPagina OFFSET v_offset;
END$$
DELIMITER ;

-- Exemplo de chamada:
-- CALL sp_buscarProdutos('caixa', 0, 1, 10);
