-- Create Role for postgraphile
DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgraphile') THEN
            CREATE ROLE postgraphile;
        END IF;
    END
$$;

GRANT USAGE ON SCHEMA public TO postgraphile;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgraphile;

-- Enable RLS for tables
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Example" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY user_all_policy ON "User"
    FOR ALL
    USING (id = current_setting('app.current_user_id')::text);

CREATE POLICY user_policy ON "Session" FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text);
