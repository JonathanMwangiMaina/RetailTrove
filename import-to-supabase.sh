#!/bin/bash

# Import Schema to Supabase
# This script will import your database schema into Supabase

echo "🚀 Importing RetailTrove schema to Supabase..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set in your environment"
    echo ""
    echo "Please set your Supabase connection string:"
    echo "export DATABASE_URL='postgresql://postgres:[PASSWORD]@db.srvkthtanhlcxcbfxqod.supabase.co:5432/postgres'"
    echo ""
    exit 1
fi

echo "📋 Connection string found"
echo "📂 Migration file: migrations/0000_famous_firebird.sql"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ ERROR: psql is not installed"
    echo ""
    echo "Install PostgreSQL client:"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  - Windows: Download from postgresql.org"
    echo ""
    exit 1
fi

# Import the schema
echo "⏳ Importing schema..."
psql "$DATABASE_URL" < migrations/0000_famous_firebird.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema imported successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with the Supabase DATABASE_URL"
    echo "2. Restart your development server: npm run dev"
    echo "3. Check Supabase Table Editor to see your tables"
    echo ""
else
    echo ""
    echo "❌ Import failed. Common issues:"
    echo "  - Check your DATABASE_URL is correct"
    echo "  - Verify your database password"
    echo "  - Ensure network connectivity to Supabase"
    echo ""
    exit 1
fi
