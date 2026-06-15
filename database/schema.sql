-- ============================================================
-- TAVO - Distribuidora de Frigorífico | Base de datos MySQL
-- ============================================================
-- Cómo importar (desde CMD/PowerShell, con MySQL instalado):
--   mysql -u root -p < database/schema.sql
-- O desde MySQL Workbench: abrir este archivo y ejecutarlo.
-- ============================================================

CREATE DATABASE IF NOT EXISTS tavo_ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tavo_ecommerce;

-- ------------------------------------------------------------
-- USUARIOS (roles: 'user' | 'admin')
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  telefono      VARCHAR(30),
  direccion     VARCHAR(200),
  ciudad        VARCHAR(100),
  provincia     VARCHAR(100),
  codigo_postal VARCHAR(10),
  rol           ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PRODUCTOS
-- stock: valor interno, NUNCA se expone al público.
-- La API pública solo informa si hay o no disponibilidad.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  categoria   VARCHAR(80) NOT NULL DEFAULT 'General',
  precio      DECIMAL(12,2) NOT NULL,
  unidad      VARCHAR(20) NOT NULL DEFAULT 'caja', -- caja | pack | bolsa | unidad | kg
  stock       DECIMAL(10,2) NOT NULL DEFAULT 0,    -- interno (admin)
  imagen      VARCHAR(300),                        -- ruta o URL de la imagen
  activo      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PEDIDOS
-- Estados: pendiente_pago -> pagado -> en_preparacion -> en_camino -> entregado
--          (cancelado en cualquier punto)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  codigo           VARCHAR(20) NOT NULL UNIQUE,     -- ej: TAVO-A1B2C3 (seguimiento)
  user_id          INT NULL,                        -- NULL = compra como invitado
  nombre           VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL,
  telefono         VARCHAR(30),
  direccion        VARCHAR(200) NOT NULL,
  ciudad           VARCHAR(100) NOT NULL,
  provincia        VARCHAR(100) NOT NULL,
  codigo_postal    VARCHAR(10),
  notas            TEXT,
  total            DECIMAL(12,2) NOT NULL,
  estado           ENUM('pendiente_pago','pagado','en_preparacion','en_camino','entregado','cancelado')
                   NOT NULL DEFAULT 'pendiente_pago',
  mp_preference_id VARCHAR(100),                    -- id de preferencia de Mercado Pago
  mp_payment_id    VARCHAR(100),                    -- id del pago aprobado en MP
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  product_id  INT NULL,
  nombre      VARCHAR(150) NOT NULL,    -- snapshot del nombre al momento de la compra
  precio_unit DECIMAL(12,2) NOT NULL,   -- snapshot del precio
  cantidad    DECIMAL(10,2) NOT NULL,
  subtotal    DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- USUARIO ADMIN INICIAL
-- Email:    admin@tavo.com
-- Password: admin123   (¡CAMBIARLA después del primer login!)
-- ------------------------------------------------------------
INSERT INTO users (nombre, email, password_hash, rol)
SELECT 'Administrador', 'admin@tavo.com', '$2b$10$e5bGiaAuumtFGEDDqVhVkOHzxvR8Vs/rSyS3cSJ6VIgbqKgCrtRpm', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@tavo.com');

-- ------------------------------------------------------------
-- PRODUCTOS — Lista de precios oficial TAVO del 30/05/26
-- ------------------------------------------------------------
INSERT INTO products (nombre, descripcion, categoria, precio, unidad, stock) VALUES
-- Hamburguesas (precio "sola" y "con pan" como productos separados)
('Fortaleza 110 g (40 u.)',                'Caja de 40 hamburguesas de 110 g.',                       'Hamburguesas', 19000.00,  'caja', 40),
('Fortaleza 110 g (40 u.) c/pan',          'Caja de 40 hamburguesas de 110 g con pan incluido.',      'Hamburguesas', 33200.00,  'caja', 40),
('Victoria 110 g (40 u.)',                 'Caja de 40 hamburguesas Victoria de 110 g.',              'Hamburguesas', 42000.00,  'caja', 40),
('Victoria 110 g (40 u.) c/pan',           'Caja de 40 hamburguesas Victoria 110 g con pan.',         'Hamburguesas', 55400.00,  'caja', 40),
('Huella 110 g (40 u.)',                   'Caja de 40 hamburguesas Huella de 110 g.',                'Hamburguesas', 72000.00,  'caja', 30),
('Huella 110 g (40 u.) c/pan',             'Caja de 40 hamburguesas Huella 110 g con pan.',           'Hamburguesas', 85200.00,  'caja', 30),
('Unión Ganadera 110 g (40 u.)',           'Caja de 40 hamburguesas Unión Ganadera de 110 g.',        'Hamburguesas', 105000.00, 'caja', 30),
('Unión Ganadera 110 g (40 u.) c/pan',     'Caja de 40 hamburguesas Unión Ganadera 110 g con pan.',   'Hamburguesas', 117700.00, 'caja', 30),
('Victoria 83 g (60 u.)',                  'Caja de 60 hamburguesas Victoria de 83 g.',               'Hamburguesas', 91000.00,  'caja', 30),
('Victoria 83 g (60 u.) c/pan',            'Caja de 60 hamburguesas Victoria 83 g con pan.',          'Hamburguesas', 107800.00, 'caja', 30),
('Victoria 69 g (60 u.)',                  'Caja de 60 hamburguesas Victoria de 69 g.',               'Hamburguesas', 46000.00,  'caja', 40),
('Victoria 69 g (60 u.) c/pan',            'Caja de 60 hamburguesas Victoria 69 g con pan.',          'Hamburguesas', 64300.00,  'caja', 40),
('Unión Ganadera 69 g (72 u.)',            'Caja de 72 hamburguesas Unión Ganadera de 69 g.',         'Hamburguesas', 125000.00, 'caja', 25),
('Unión Ganadera 69 g (72 u.) c/pan',      'Caja de 72 hamburguesas Unión Ganadera 69 g con pan.',    'Hamburguesas', 144800.00, 'caja', 25),
-- Salchichas (precio con pan, según lista)
('Salchichas Salke (72 u.) c/pan',         'Caja de 72 salchichas Salke con pan incluido.',           'Salchichas',   42800.00,  'caja', 35),
('Salchichas Unión Ganadera (72 u.) c/pan','Caja de 72 salchichas Unión Ganadera con pan.',           'Salchichas',   72100.00,  'caja', 30),
('Salchichas Friolim (72 u.) c/pan',       'Caja de 72 salchichas Friolim con pan.',                  'Salchichas',   47900.00,  'caja', 35),
('Salchichas Friolim Super (30 u.) c/pan', 'Caja de 30 salchichas Friolim Super con pan.',            'Salchichas',   21800.00,  'caja', 40),
('Salchichas Alemana (12 u.) c/pan',       'Pack de 12 salchichas tipo alemana con pan.',             'Salchichas',   19500.00,  'pack', 50),
-- Aderezos y extras
('Papas Pay (1 kg)',                       'Bolsa de papas pay de 1 kg.',                             'Aderezos y extras', 10000.00, 'bolsa', 60),
('Papas bastón (14 kg)',                   'Bolsa de papas bastón de 14 kg.',                         'Aderezos y extras', 58000.00, 'bolsa', 25),
('Pomo de aderezo (500 cc)',               'Consultar sabores disponibles.',                          'Aderezos y extras', 3000.00,  'unidad', 120),
('Bolsa de Mayonesa (3 kg)',               'Bolsa de mayonesa de 3 kg.',                              'Aderezos y extras', 9000.00,  'bolsa', 50),
('Bolsa de Mostaza (3 kg)',                'Bolsa de mostaza de 3 kg.',                               'Aderezos y extras', 8500.00,  'bolsa', 50),
('Bolsa de Ketchup (3 kg)',                'Bolsa de ketchup de 3 kg.',                               'Aderezos y extras', 10000.00, 'bolsa', 50),
-- Panes
('Pan de Superpancho (72 u.)',             'Caja de 72 panes de superpancho.',                        'Panes', 19000.00, 'caja', 40),
('Pan de Superpancho (6 u.)',              'Pack de 6 panes de superpancho.',                         'Panes', 1800.00,  'pack', 150),
('Pan Superhamburguesa (40 u.)',           'Caja de 40 panes de superhamburguesa.',                   'Panes', 16000.00, 'caja', 40),
('Pan Superhamburguesa (4 u.)',            'Pack de 4 panes de superhamburguesa.',                    'Panes', 1700.00,  'pack', 150),
('Pan Hamburguesa (60 u.)',                'Caja de 60 panes de hamburguesa.',                        'Panes', 19000.00, 'caja', 40),
('Pan Hamburguesa (4 u.)',                 'Pack de 4 panes de hamburguesa.',                         'Panes', 1600.00,  'pack', 150);
