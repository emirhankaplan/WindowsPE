-- ============================================================
-- WindowsPE — bootstrap meta row
-- The content_sha256 / seeded_at rows are written by the seeder
-- at runtime; methodology_version is overwritten on each seed
-- to whatever content/methodology.json declares.
-- ============================================================

INSERT INTO meta (key, value) VALUES ('methodology_version', '1.0.0')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
