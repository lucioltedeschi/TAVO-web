-- ============================================================
-- TAVO - Base de datos Supabase (PostgreSQL)
-- ============================================================
-- Importar en: Supabase → SQL Editor → pegar y ejecutar
-- ============================================================

-- ------------------------------------------------------------
-- PERFILES (datos extra del usuario, linked a Supabase Auth)
-- La autenticación la maneja Supabase Auth (auth.users).
-- Esta tabla solo guarda nombre, teléfono, dirección y rol.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        VARCHAR(100),
  telefono      VARCHAR(30),
  direccion     VARCHAR(200),
  ciudad        VARCHAR(100),
  provincia     VARCHAR(100),
  codigo_postal VARCHAR(10),
  rol           VARCHAR(10) NOT NULL DEFAULT 'user'
                CHECK (rol IN ('user', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- PRODUCTOS
-- stock: interno (solo admin). El público solo ve disponible.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,
  categoria   VARCHAR(80) NOT NULL DEFAULT 'General',
  precio      NUMERIC(12,2) NOT NULL,
  unidad      VARCHAR(20) NOT NULL DEFAULT 'caja',
  stock       NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagen      VARCHAR(300),
  activo      SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PEDIDOS
-- user_id es UUID (linked a Supabase Auth). NULL = invitado.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  codigo           VARCHAR(20) NOT NULL UNIQUE,
  user_id          UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  nombre           VARCHAR(100) NOT NULL,
  email            VARCHAR(150) NOT NULL,
  telefono         VARCHAR(30),
  direccion        VARCHAR(200) NOT NULL,
  ciudad           VARCHAR(100) NOT NULL,
  provincia        VARCHAR(100) NOT NULL,
  codigo_postal    VARCHAR(10),
  notas            TEXT,
  total            NUMERIC(12,2) NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'pendiente_pago'
                   CHECK (estado IN ('pendiente_pago','pagado','en_preparacion','en_camino','entregado','cancelado')),
  mp_preference_id VARCHAR(100),
  mp_payment_id    VARCHAR(100),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER NULL REFERENCES products(id) ON DELETE SET NULL,
  nombre      VARCHAR(150) NOT NULL,
  precio_unit NUMERIC(12,2) NOT NULL,
  cantidad    NUMERIC(10,2) NOT NULL,
  subtotal    NUMERIC(12,2) NOT NULL
);

-- ------------------------------------------------------------
-- TRIGGERS: updated_at automático
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION tavo_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION tavo_set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION tavo_set_updated_at();

-- ------------------------------------------------------------
-- RPC: buscar pedido por código + email (público, sin login)
-- SECURITY DEFINER para saltar RLS y buscar como admin
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_pedido(p_codigo TEXT, p_email TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT row_to_json(r) FROM (
    SELECT o.codigo, o.estado, o.total, o.nombre, o.direccion,
           o.ciudad, o.provincia, o.created_at, o.updated_at,
           (SELECT json_agg(json_build_object(
             'nombre', oi.nombre, 'precio_unit', oi.precio_unit,
             'cantidad', oi.cantidad, 'subtotal', oi.subtotal
           )) FROM order_items oi WHERE oi.order_id = o.id) AS items
    FROM orders o
    WHERE o.codigo = p_codigo AND o.email = p_email
  ) r;
$$;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- profiles: cada usuario ve y edita solo el suyo
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

-- products: lectura pública de productos activos
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (activo = 1);

-- orders: el usuario ve solo sus pedidos
CREATE POLICY "orders_own_read" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- order_items: accesible si el pedido pertenece al usuario
CREATE POLICY "order_items_own_read" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- PRODUCTOS — Lista de precios TAVO del 30/05/26
-- ------------------------------------------------------------
INSERT INTO products (nombre, descripcion, categoria, precio, unidad, stock) VALUES
('Fortaleza 110 g (40 u.)',               'Caja de 40 hamburguesas de 110 g.',                       'Hamburguesas', 19000.00,  'caja', 40),
('Fortaleza 110 g (40 u.) c/pan',         'Caja de 40 hamburguesas de 110 g con pan incluido.',      'Hamburguesas', 33200.00,  'caja', 40),
('Victoria 110 g (40 u.)',                'Caja de 40 hamburguesas Victoria de 110 g.',              'Hamburguesas', 42000.00,  'caja', 40),
('Victoria 110 g (40 u.) c/pan',          'Caja de 40 hamburguesas Victoria 110 g con pan.',         'Hamburguesas', 55400.00,  'caja', 40),
('Huella 110 g (40 u.)',                  'Caja de 40 hamburguesas Huella de 110 g.',                'Hamburguesas', 72000.00,  'caja', 30),
('Huella 110 g (40 u.) c/pan',            'Caja de 40 hamburguesas Huella 110 g con pan.',           'Hamburguesas', 85200.00,  'caja', 30),
('Unión Ganadera 110 g (40 u.)',          'Caja de 40 hamburguesas Unión Ganadera de 110 g.',        'Hamburguesas', 105000.00, 'caja', 30),
('Unión Ganadera 110 g (40 u.) c/pan',    'Caja de 40 hamburguesas Unión Ganadera 110 g con pan.',   'Hamburguesas', 117700.00, 'caja', 30),
('Victoria 83 g (60 u.)',                 'Caja de 60 hamburguesas Victoria de 83 g.',               'Hamburguesas', 91000.00,  'caja', 30),
('Victoria 83 g (60 u.) c/pan',           'Caja de 60 hamburguesas Victoria 83 g con pan.',          'Hamburguesas', 107800.00, 'caja', 30),
('Victoria 69 g (60 u.)',                 'Caja de 60 hamburguesas Victoria de 69 g.',               'Hamburguesas', 46000.00,  'caja', 40),
('Victoria 69 g (60 u.) c/pan',           'Caja de 60 hamburguesas Victoria 69 g con pan.',          'Hamburguesas', 64300.00,  'caja', 40),
('Unión Ganadera 69 g (72 u.)',           'Caja de 72 hamburguesas Unión Ganadera de 69 g.',         'Hamburguesas', 125000.00, 'caja', 25),
('Unión Ganadera 69 g (72 u.) c/pan',     'Caja de 72 hamburguesas Unión Ganadera 69 g con pan.',    'Hamburguesas', 144800.00, 'caja', 25),
('Salchichas Salke (72 u.) c/pan',        'Caja de 72 salchichas Salke con pan incluido.',           'Salchichas',   42800.00,  'caja', 35),
('Salchichas Unión Ganadera (72 u.) c/pan','Caja de 72 salchichas Unión Ganadera con pan.',          'Salchichas',   72100.00,  'caja', 30),
('Salchichas Friolim (72 u.) c/pan',      'Caja de 72 salchichas Friolim con pan.',                  'Salchichas',   47900.00,  'caja', 35),
('Salchichas Friolim Super (30 u.) c/pan','Caja de 30 salchichas Friolim Super con pan.',            'Salchichas',   21800.00,  'caja', 40),
('Salchichas Alemana (12 u.) c/pan',      'Pack de 12 salchichas tipo alemana con pan.',             'Salchichas',   19500.00,  'pack', 50),
('Papas Pay (1 kg)',                      'Bolsa de papas pay de 1 kg.',                             'Aderezos y extras', 10000.00, 'bolsa', 60),
('Papas bastón (14 kg)',                  'Bolsa de papas bastón de 14 kg.',                         'Aderezos y extras', 58000.00, 'bolsa', 25),
('Pomo de aderezo (500 cc)',              'Consultar sabores disponibles.',                          'Aderezos y extras',  3000.00, 'unidad',120),
('Bolsa de Mayonesa (3 kg)',              'Bolsa de mayonesa de 3 kg.',                              'Aderezos y extras',  9000.00, 'bolsa', 50),
('Bolsa de Mostaza (3 kg)',               'Bolsa de mostaza de 3 kg.',                               'Aderezos y extras',  8500.00, 'bolsa', 50),
('Bolsa de Ketchup (3 kg)',               'Bolsa de ketchup de 3 kg.',                               'Aderezos y extras', 10000.00, 'bolsa', 50),
('Pan de Superpancho (72 u.)',            'Caja de 72 panes de superpancho.',                        'Panes', 19000.00, 'caja',  40),
('Pan de Superpancho (6 u.)',             'Pack de 6 panes de superpancho.',                         'Panes',  1800.00, 'pack', 150),
('Pan Superhamburguesa (40 u.)',          'Caja de 40 panes de superhamburguesa.',                   'Panes', 16000.00, 'caja',  40),
('Pan Superhamburguesa (4 u.)',           'Pack de 4 panes de superhamburguesa.',                    'Panes',  1700.00, 'pack', 150),
('Pan Hamburguesa (60 u.)',               'Caja de 60 panes de hamburguesa.',                        'Panes', 19000.00, 'caja',  40),
('Pan Hamburguesa (4 u.)',                'Pack de 4 panes de hamburguesa.',                         'Panes',  1600.00, 'pack', 150);

-- ------------------------------------------------------------
-- ADMIN: después de correr este script, crear el usuario admin
-- desde Supabase Auth dashboard y luego ejecutar:
--
--   UPDATE profiles SET rol = 'admin' WHERE id = '<UUID-del-admin>';
--
-- O desde SQL Editor de Supabase.
-- ------------------------------------------------------------
