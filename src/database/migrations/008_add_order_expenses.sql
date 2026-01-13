-- Migration: Add expenses column to orders table
-- Date: 2026-01-08
-- Description: Adds expenses column to store order-related expenses (fuel, freight, etc.)

DO $$
BEGIN
    -- Add expenses column to orders table if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'expenses'
    ) THEN
        ALTER TABLE orders ADD COLUMN expenses DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Added expenses column to orders table';
    ELSE
        RAISE NOTICE 'expenses column already exists in orders table';
    END IF;
    
    -- Add gross_value column if not exists (total value before expenses)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'gross_value'
    ) THEN
        ALTER TABLE orders ADD COLUMN gross_value DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Added gross_value column to orders table';
    ELSE
        RAISE NOTICE 'gross_value column already exists in orders table';
    END IF;
    
    -- Add net_value column if not exists (total value after expenses)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'net_value'
    ) THEN
        ALTER TABLE orders ADD COLUMN net_value DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Added net_value column to orders table';
    ELSE
        RAISE NOTICE 'net_value column already exists in orders table';
    END IF;
    
    -- Add payment_details column for storing JSON payment info
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_details'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_details TEXT;
        RAISE NOTICE 'Added payment_details column to orders table';
    ELSE
        RAISE NOTICE 'payment_details column already exists in orders table';
    END IF;
END $$;

-- Update existing orders to have correct values
UPDATE orders 
SET 
    gross_value = COALESCE(total_value, 0),
    net_value = COALESCE(total_value, 0) - COALESCE(expenses, 0)
WHERE gross_value = 0 OR gross_value IS NULL;
