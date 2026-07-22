CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Cashier')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  pack_size INTEGER NOT NULL DEFAULT 1,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  requires_prescription BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  initial_quantity DECIMAL(10,2) NOT NULL,
  current_quantity DECIMAL(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'depleted', 'expired', 'wasted')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  net_profit DECIMAL(12,2) NOT NULL,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Client',
  customer_phone TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'Online')),
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  prescription_verified BOOLEAN DEFAULT FALSE,
  vet_doctor_name TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_id TEXT NOT NULL REFERENCES stock_batches(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_losses (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES stock_batches(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity_lost INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'damaged', 'theft', 'other')),
  unit_cost DECIMAL(12,2) NOT NULL,
  total_loss_value DECIMAL(12,2) NOT NULL,
  reported_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_losses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on user_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on user_profiles" ON user_profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@fahadvet.com' THEN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, 'Dr. Fahad Al-Rahman', 'Admin')
    ON CONFLICT (id) DO UPDATE SET
      role = 'Admin',
      full_name = 'Dr. Fahad Al-Rahman';
  ELSE
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, 'Staff Member', 'Cashier')
    ON CONFLICT (id) DO UPDATE SET
      role = COALESCE(user_profiles.role, 'Cashier'),
      full_name = COALESCE(user_profiles.full_name, 'Staff Member');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Allow authenticated read on products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin insert on products" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin update on products" ON products FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin delete on products" ON products FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Allow authenticated read on stock_batches" ON stock_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin and cashier all on stock_batches" ON stock_batches FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);

CREATE POLICY "Allow authenticated read on transactions" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin and cashier insert on transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin and cashier update on transactions" ON transactions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin delete on transactions" ON transactions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Allow authenticated read on transaction_items" ON transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin and cashier all on transaction_items" ON transaction_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);

CREATE POLICY "Allow authenticated read on stock_losses" ON stock_losses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin all on stock_losses" ON stock_losses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-images', 'medicine-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for medicine-images" ON storage.objects FOR SELECT USING (bucket_id = 'medicine-images');
CREATE POLICY "Authenticated upload for medicine-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'medicine-images');
CREATE POLICY "Authenticated update for medicine-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'medicine-images');
CREATE POLICY "Admin delete for medicine-images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'medicine-images' AND
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE OR REPLACE FUNCTION process_pos_checkout(
  p_transaction_id TEXT,
  p_receipt_number TEXT,
  p_total_amount DECIMAL(12,2),
  p_net_profit DECIMAL(12,2),
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_payment_method TEXT,
  p_cashier_id TEXT,
  p_cashier_name TEXT,
  p_prescription_verified BOOLEAN,
  p_vet_doctor_name TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id TEXT;
  v_quantity INTEGER;
  v_unit_price DECIMAL(12,2);
  v_unit_cost DECIMAL(12,2);
  v_batch_record RECORD;
  v_remaining_qty INTEGER;
  v_deduct_qty INTEGER;
  v_item_id TEXT;
  v_total_profit DECIMAL(12,2) := 0;
BEGIN
  INSERT INTO transactions (
    id, receipt_number, total_amount, net_profit, customer_name,
    customer_phone, payment_method, cashier_id, cashier_name,
    prescription_verified, vet_doctor_name, transaction_date
  ) VALUES (
    p_transaction_id, p_receipt_number, p_total_amount, p_net_profit, p_customer_name,
    p_customer_phone, p_payment_method, p_cashier_id, p_cashier_name,
    p_prescription_verified, p_vet_doctor_name, NOW()
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;
    v_remaining_qty := v_quantity;

    FOR v_batch_record IN
      SELECT * FROM stock_batches
      WHERE product_id = v_product_id AND status = 'active' AND current_quantity > 0
      ORDER BY expiry_date ASC
    LOOP
      IF v_remaining_qty <= 0 THEN
        EXIT;
      END IF;

      IF v_batch_record.current_quantity >= v_remaining_qty THEN
        v_deduct_qty := v_remaining_qty;
      ELSE
        v_deduct_qty := v_batch_record.current_quantity;
      END IF;

      UPDATE stock_batches
      SET current_quantity = current_quantity - v_deduct_qty,
          status = CASE WHEN (current_quantity - v_deduct_qty) <= 0 THEN 'depleted' ELSE status END
      WHERE id = v_batch_record.id;

      v_item_id := 'txi-' || gen_random_uuid()::TEXT;
      INSERT INTO transaction_items (
        id, transaction_id, product_id, batch_id, quantity, unit_price, unit_cost, subtotal
      ) VALUES (
        v_item_id, p_transaction_id, v_product_id, v_batch_record.id, v_deduct_qty, v_unit_price, v_batch_record.purchase_price, (v_deduct_qty * v_unit_price)
      );

      v_total_profit := v_total_profit + (v_deduct_qty * (v_unit_price - v_batch_record.purchase_price));
      v_remaining_qty := v_remaining_qty - v_deduct_qty;
    END LOOP;

    IF v_remaining_qty > 0 THEN
      RAISE EXCEPTION 'Insufficient active stock batches for product ID: %', v_product_id;
    END IF;
  END LOOP;

  UPDATE transactions SET net_profit = v_total_profit WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$;

CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  age_years DECIMAL(4,1),
  weight_kg DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES owners(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pet_id TEXT REFERENCES pets(id) ON DELETE SET NULL;

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on owners" ON owners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin and cashier insert update on owners" ON owners FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin delete on owners" ON owners FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Allow authenticated read on pets" ON pets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin and cashier insert update on pets" ON pets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('Admin', 'Cashier'))
);
CREATE POLICY "Allow admin delete on pets" ON pets FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Allow authenticated read on audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION log_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    id, user_id, user_name, role, action_type, description, target_id, created_at
  ) VALUES (
    'log-' || gen_random_uuid()::TEXT,
    auth.uid(),
    NEW.cashier_name,
    'Cashier',
    'SALE_PROCESSED',
    'Processed POS Checkout Receipt ' || NEW.receipt_number || ' (' || NEW.payment_method || ') for Rs. ' || NEW.total_amount,
    NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transaction_insert ON transactions;
CREATE TRIGGER trg_audit_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_insert();
