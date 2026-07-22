CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Cashier')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vet_doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
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

CREATE TABLE IF NOT EXISTS public.stock_batches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  initial_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'depleted', 'expired', 'wasted')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.owners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  age_years DECIMAL(4,1),
  weight_kg DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_profit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  subtotal_amount DECIMAL(12,2) DEFAULT 0.00,
  total_tax DECIMAL(12,2) DEFAULT 0.00,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Client',
  customer_phone TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'Online')),
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  prescription_verified BOOLEAN DEFAULT FALSE,
  vet_doctor_name TEXT,
  owner_id TEXT REFERENCES public.owners(id) ON DELETE SET NULL,
  pet_id TEXT REFERENCES public.pets(id) ON DELETE SET NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  batch_id TEXT NOT NULL REFERENCES public.stock_batches(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_losses (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES public.stock_batches(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  quantity_lost INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'damaged', 'theft', 'other')),
  unit_cost DECIMAL(12,2) NOT NULL,
  total_loss_value DECIMAL(12,2) NOT NULL,
  reported_by TEXT NOT NULL DEFAULT 'Admin',
  reported_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read user_profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow read vet_doctors" ON public.vet_doctors FOR SELECT USING (true);
CREATE POLICY "Allow read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow read stock_batches" ON public.stock_batches FOR SELECT USING (true);
CREATE POLICY "Allow read owners" ON public.owners FOR SELECT USING (true);
CREATE POLICY "Allow read pets" ON public.pets FOR SELECT USING (true);
CREATE POLICY "Allow read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow read transaction_items" ON public.transaction_items FOR SELECT USING (true);
CREATE POLICY "Allow read stock_losses" ON public.stock_losses FOR SELECT USING (true);
CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);

CREATE POLICY "Allow write user_profiles" ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write vet_doctors" ON public.vet_doctors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write stock_batches" ON public.stock_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write owners" ON public.owners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write pets" ON public.pets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write transactions" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write transaction_items" ON public.transaction_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write stock_losses" ON public.stock_losses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow write audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT;
  user_email TEXT;
BEGIN
  user_email := LOWER(NEW.email);
  IF user_email = 'admin@vetstore.com' OR 
     user_email = 'admin@fahadvet.com' OR 
     user_email LIKE '%admin%' OR 
     user_email LIKE '%fahad%' THEN
    assigned_role := 'Admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Cashier');
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'admin@vetstore.com',
    crypt('vetstore123', gen_salt('bf')), NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Chief Administrator","role":"Admin"}'::jsonb,
    NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'cashier@vetstore.com',
    crypt('vetstore123', gen_salt('bf')), NOW(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Cashier (Staff)","role":"Cashier"}'::jsonb,
    NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111',
    '{"sub":"a1111111-1111-1111-1111-111111111111","email":"admin@vetstore.com"}'::jsonb,
    'email', 'admin@vetstore.com', NOW(), NOW(), NOW()
  ),
  (
    'b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222',
    '{"sub":"b2222222-2222-2222-2222-222222222222","email":"cashier@vetstore.com"}'::jsonb,
    'email', 'cashier@vetstore.com', NOW(), NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  provider_id = EXCLUDED.provider_id;

INSERT INTO public.user_profiles (id, email, full_name, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'admin@vetstore.com', 'Chief Administrator', 'Admin'),
  ('b2222222-2222-2222-2222-222222222222', 'cashier@vetstore.com', 'Demo Cashier (Staff)', 'Cashier')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

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

CREATE OR REPLACE FUNCTION public.process_pos_checkout(
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

CREATE OR REPLACE FUNCTION public.log_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM user_profiles WHERE id = auth.uid() OR full_name = NEW.cashier_name LIMIT 1;
  IF v_role IS NULL THEN
    IF NEW.cashier_name ILIKE '%chief%' OR NEW.cashier_name ILIKE '%admin%' OR NEW.cashier_name ILIKE '%fahad%' THEN
      v_role := 'Admin';
    ELSE
      v_role := 'Cashier';
    END IF;
  END IF;

  INSERT INTO audit_logs (
    id, user_id, user_name, role, action_type, description, target_id, created_at
  ) VALUES (
    'log-' || gen_random_uuid()::TEXT,
    auth.uid(),
    NEW.cashier_name,
    v_role,
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
EXECUTE FUNCTION public.log_transaction_insert();
