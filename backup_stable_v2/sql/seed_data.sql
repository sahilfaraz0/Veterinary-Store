INSERT INTO products (id, barcode, name, category, unit, pack_size, min_stock_level, description, requires_prescription, image_url)
VALUES
  ('prod-amox-500', '8901112223334', 'Amoxicillin Veterinary Blister Pack 500mg', 'Antibiotics', 'Blister Pack', 10, 25, 'Broad-spectrum penicillin antibiotic for bovine and ovine respiratory and soft tissue infections in blister pack format.', true, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'),
  ('prod-ivm-1', '8901112223335', 'Ivermectin Injection 1% Sterile Solution', 'Antiparasitic', 'Vial', 1, 15, 'Injectable antiparasitic solution for cattle and sheep treating gastrointestinal roundworms and lungworms.', false, 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&auto=format&fit=crop&q=80'),
  ('prod-melox-100', '8901112223336', 'Meloxicam Suspension 1.5 mg/ml', 'Pain Management', 'Bottle', 1, 12, 'Non-steroidal anti-inflammatory drug (NSAID) for alleviation of inflammation and pain in acute musculoskeletal disorders.', true, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80'),
  ('prod-multi-vit', '8901112223337', 'VitoVet Multivitamin & Mineral Syrup', 'Supplements', 'Bottle', 1, 20, 'Liquid dietary supplement packed with Vitamins A, D3, E, B-Complex and essential trace minerals.', false, 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=600&auto=format&fit=crop&q=80'),
  ('prod-rabies-vac', '8901112223338', 'Rabifast Rabies Vaccine (Inactivated)', 'Vaccines', 'Vial', 1, 30, 'Inactivated cell-culture rabies vaccine for dogs, cats, cattle, and horses. Requires cold chain storage.', true, 'https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=600&auto=format&fit=crop&q=80'),
  ('prod-spray-wound', '8901112223339', 'Oxytetracycline Wound Healing Spray', 'Dermatological', 'Can', 1, 18, 'Topical antibiotic aerosol spray for rapid treatment of foot rot and superficial skin lesions.', false, 'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=600&auto=format&fit=crop&q=80'),
  ('prod-deworm-tab', '8901112223340', 'Albendazole 250mg Unit Dose Tablet', 'Antiparasitic', 'Unit Dose', 1, 50, 'Single chewable unit dose tablet for easy oral deworming and parasite elimination.', false, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
  barcode = EXCLUDED.barcode,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  pack_size = EXCLUDED.pack_size,
  min_stock_level = EXCLUDED.min_stock_level,
  requires_prescription = EXCLUDED.requires_prescription,
  image_url = EXCLUDED.image_url;

INSERT INTO stock_batches (id, product_id, batch_number, supplier_name, purchase_price, selling_price, initial_quantity, current_quantity, expiry_date, received_date, status)
VALUES
  ('batch-amox-001', 'prod-amox-500', 'AMX-2025-A', 'BioVet Pakistan Pharma (Islamabad)', 1400.00, 2150.00, 100, 85, '2028-11-30', '2026-06-01', 'active'),
  ('batch-amox-002', 'prod-amox-500', 'AMX-2024-B', 'BioVet Pakistan Pharma (Islamabad)', 1350.00, 2150.00, 50, 15, '2026-10-15', '2025-10-01', 'active'),
  ('batch-ivm-001', 'prod-ivm-1', 'IVM-2026-X', 'Prime Health Vet Supplies (Rawalpindi)', 2200.00, 3400.00, 60, 12, '2028-05-31', '2026-05-15', 'active'),
  ('batch-melox-001', 'prod-melox-100', 'MLX-2026-Q1', 'Apex Veterinary Distribution (Lahore)', 1800.00, 2800.00, 40, 8, '2028-08-31', '2026-06-10', 'active'),
  ('batch-multi-001', 'prod-multi-vit', 'VIT-2025-C', 'Greenbelt Animal Nutrition (Peshawar)', 1100.00, 1850.00, 80, 65, '2028-12-31', '2026-06-20', 'active'),
  ('batch-rabies-001', 'prod-rabies-vac', 'RAB-2026-URG', 'VaxCo Pakistan (Islamabad)', 3500.00, 5200.00, 50, 40, '2026-11-10', '2026-05-01', 'active'),
  ('batch-rabies-exp', 'prod-rabies-vac', 'RAB-2024-OLD', 'VaxCo Pakistan (Islamabad)', 3200.00, 4800.00, 20, 5, '2026-08-01', '2024-08-01', 'active'),
  ('batch-spray-001', 'prod-spray-wound', 'SPR-2026-W', 'BioVet Pakistan Pharma (Islamabad)', 950.00, 1600.00, 50, 48, '2029-04-30', '2026-07-01', 'active'),
  ('batch-deworm-001', 'prod-deworm-tab', 'ALB-2026-U1', 'Prime Health Vet Supplies (Rawalpindi)', 45.00, 80.00, 200, 180, '2028-09-30', '2026-06-15', 'active')
ON CONFLICT (id) DO UPDATE SET
  batch_number = EXCLUDED.batch_number,
  supplier_name = EXCLUDED.supplier_name,
  purchase_price = EXCLUDED.purchase_price,
  selling_price = EXCLUDED.selling_price,
  current_quantity = EXCLUDED.current_quantity,
  expiry_date = EXCLUDED.expiry_date,
  status = EXCLUDED.status;

INSERT INTO owners (id, name, phone, email, address)
VALUES
  ('owner-001', 'Chaudhry Usman Farm', '0300-1234567', 'usman@farm.pk', 'Chak Shahzad Farm Houses, Islamabad'),
  ('owner-002', 'Margalla Dairy & Cattle', '0333-7654321', 'info@margalladairy.com', 'Sector D-12 Ext, Islamabad'),
  ('owner-003', 'Zafar Equine Club', '0321-9876543', 'zafar@equineclub.pk', 'Rawal Lake Club Road, Islamabad'),
  ('owner-004', 'Hamza Pets Clinic Client', '0312-4455667', 'hamza@pets.com', 'F-10 Markaz, Islamabad')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address;

INSERT INTO pets (id, owner_id, name, species, breed, age_years, weight_kg, notes)
VALUES
  ('pet-001', 'owner-001', 'Sheru', 'Canine (Dog)', 'German Shepherd', 4.5, 32.00, 'Guard dog for cattle farm. Regular rabies vaccination schedule.'),
  ('pet-002', 'owner-001', 'Bovine Batch A-12', 'Bovine (Cattle)', 'Sahiwal Cross', 3.0, 420.00, 'Milking herd leader. History of mild respiratory infections.'),
  ('pet-003', 'owner-002', 'Heifer Herd 4', 'Bovine (Cattle)', 'Friesian Holstein', 2.5, 480.00, 'Active dairy cattle under routine parasite control.'),
  ('pet-004', 'owner-003', 'Sultan', 'Equine (Horse)', 'Arabian Stallion', 6.0, 510.00, 'Show jumping stallion. Sensitive to NSAIDs.'),
  ('pet-005', 'owner-004', 'Simba', 'Feline (Cat)', 'Persian Cat', 2.0, 4.20, 'Indoor pet. Periodic deworming and multivitamin supplementation.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  species = EXCLUDED.species,
  breed = EXCLUDED.breed,
  age_years = EXCLUDED.age_years,
  weight_kg = EXCLUDED.weight_kg,
  notes = EXCLUDED.notes;

INSERT INTO transactions (id, receipt_number, total_amount, net_profit, customer_name, customer_phone, payment_method, cashier_id, cashier_name, prescription_verified, vet_doctor_name, transaction_date)
VALUES
  ('txn-101', 'INV-20260515-001', 6450.00, 2250.00, 'Chaudhry Usman Farm', '0300-1234567', 'Cash', 'cashier-demo-id', 'Ali Raza (Cashier)', true, 'Dr. Fahad Al-Rahman', '2026-05-15T10:30:00Z'),
  ('txn-102', 'INV-20260520-002', 3400.00, 1200.00, 'Margalla Dairy & Cattle', '0333-7654321', 'Card', 'cashier-demo-id', 'Ali Raza (Cashier)', false, null, '2026-05-20T14:15:00Z'),
  ('txn-103', 'INV-20260605-003', 10400.00, 3400.00, 'Zafar Equine Club', '0321-9876543', 'Online', 'admin-demo-id', 'Dr. Fahad Al-Rahman (Admin)', true, 'Dr. Fahad Al-Rahman', '2026-06-05T11:00:00Z'),
  ('txn-104', 'INV-20260618-004', 5550.00, 2250.00, 'Hamza Pets Clinic', '0312-4455667', 'Cash', 'cashier-demo-id', 'Ali Raza (Cashier)', false, null, '2026-06-18T16:45:00Z'),
  ('txn-105', 'INV-20260702-005', 8600.00, 3000.00, 'Blue Area Veterinary Services', '0301-8899001', 'Card', 'cashier-demo-id', 'Ali Raza (Cashier)', true, 'Dr. Tariq Mahmood', '2026-07-02T09:20:00Z'),
  ('txn-106', 'INV-20260710-006', 4800.00, 1950.00, 'Malik Poultry & Livestock', '0345-1122334', 'Cash', 'cashier-demo-id', 'Ali Raza (Cashier)', false, null, '2026-07-10T13:10:00Z')
ON CONFLICT (id) DO UPDATE SET
  total_amount = EXCLUDED.total_amount,
  net_profit = EXCLUDED.net_profit,
  customer_name = EXCLUDED.customer_name,
  transaction_date = EXCLUDED.transaction_date;

INSERT INTO transaction_items (id, transaction_id, product_id, batch_id, quantity, unit_price, unit_cost, subtotal)
VALUES
  ('txi-101-1', 'txn-101', 'prod-amox-500', 'batch-amox-001', 3, 2150.00, 1400.00, 6450.00),
  ('txi-102-1', 'txn-102', 'prod-ivm-1', 'batch-ivm-001', 1, 3400.00, 2200.00, 3400.00),
  ('txi-103-1', 'txn-103', 'prod-rabies-vac', 'batch-rabies-001', 2, 5200.00, 3500.00, 10400.00),
  ('txi-104-1', 'txn-104', 'prod-multi-vit', 'batch-multi-001', 3, 1850.00, 1100.00, 5550.00),
  ('txi-105-1', 'txn-105', 'prod-amox-500', 'batch-amox-001', 4, 2150.00, 1400.00, 8600.00),
  ('txi-106-1', 'txn-106', 'prod-spray-wound', 'batch-spray-001', 3, 1600.00, 950.00, 4800.00)
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  subtotal = EXCLUDED.subtotal;

INSERT INTO audit_logs (id, user_id, user_name, role, action_type, description, target_id, created_at)
VALUES
  ('log-seed-01', null, 'Dr. Fahad Al-Rahman (Admin)', 'Admin', 'SYSTEM_INIT', 'Initialized FAHAD Veterinary Store & Clinic Phase 2 Database Schema & RLS Policies', 'system', '2026-07-01T08:00:00Z'),
  ('log-seed-02', null, 'Ali Raza (Cashier)', 'Cashier', 'SALE_PROCESSED', 'Processed POS Checkout Receipt INV-20260710-006 (Cash) for Rs. 4,800.00', 'txn-106', '2026-07-10T13:10:00Z')
ON CONFLICT (id) DO NOTHING;
