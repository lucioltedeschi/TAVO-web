-- ============================================================
-- USAR SOLO SI YA IMPORTASTE LA BASE CON LOS PRODUCTOS VIEJOS
-- (los de carnes/cortes de ejemplo). Borra esos productos y
-- carga la lista de precios real de TAVO (30/05/26).
-- Importar:  mysql -u root -p < database/actualizar_productos.sql
-- ============================================================
USE tavo_ecommerce;

-- Desactivar productos viejos de ejemplo (no se borran por si hay pedidos asociados)
UPDATE products SET activo = 0
WHERE categoria IN ('Vacuno','Aves','Cerdo','Embutidos','Elaborados');

INSERT INTO products (nombre, descripcion, categoria, precio, unidad, stock) VALUES
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
('Salchichas Salke (72 u.) c/pan',         'Caja de 72 salchichas Salke con pan incluido.',           'Salchichas',   42800.00,  'caja', 35),
('Salchichas Unión Ganadera (72 u.) c/pan','Caja de 72 salchichas Unión Ganadera con pan.',           'Salchichas',   72100.00,  'caja', 30),
('Salchichas Friolim (72 u.) c/pan',       'Caja de 72 salchichas Friolim con pan.',                  'Salchichas',   47900.00,  'caja', 35),
('Salchichas Friolim Super (30 u.) c/pan', 'Caja de 30 salchichas Friolim Super con pan.',            'Salchichas',   21800.00,  'caja', 40),
('Salchichas Alemana (12 u.) c/pan',       'Pack de 12 salchichas tipo alemana con pan.',             'Salchichas',   19500.00,  'pack', 50),
('Papas Pay (1 kg)',                       'Bolsa de papas pay de 1 kg.',                             'Aderezos y extras', 10000.00, 'bolsa', 60),
('Papas bastón (14 kg)',                   'Bolsa de papas bastón de 14 kg.',                         'Aderezos y extras', 58000.00, 'bolsa', 25),
('Pomo de aderezo (500 cc)',               'Consultar sabores disponibles.',                          'Aderezos y extras', 3000.00,  'unidad', 120),
('Bolsa de Mayonesa (3 kg)',               'Bolsa de mayonesa de 3 kg.',                              'Aderezos y extras', 9000.00,  'bolsa', 50),
('Bolsa de Mostaza (3 kg)',                'Bolsa de mostaza de 3 kg.',                               'Aderezos y extras', 8500.00,  'bolsa', 50),
('Bolsa de Ketchup (3 kg)',                'Bolsa de ketchup de 3 kg.',                               'Aderezos y extras', 10000.00, 'bolsa', 50),
('Pan de Superpancho (72 u.)',             'Caja de 72 panes de superpancho.',                        'Panes', 19000.00, 'caja', 40),
('Pan de Superpancho (6 u.)',              'Pack de 6 panes de superpancho.',                         'Panes', 1800.00,  'pack', 150),
('Pan Superhamburguesa (40 u.)',           'Caja de 40 panes de superhamburguesa.',                   'Panes', 16000.00, 'caja', 40),
('Pan Superhamburguesa (4 u.)',            'Pack de 4 panes de superhamburguesa.',                    'Panes', 1700.00,  'pack', 150),
('Pan Hamburguesa (60 u.)',                'Caja de 60 panes de hamburguesa.',                        'Panes', 19000.00, 'caja', 40),
('Pan Hamburguesa (4 u.)',                 'Pack de 4 panes de hamburguesa.',                         'Panes', 1600.00,  'pack', 150);
