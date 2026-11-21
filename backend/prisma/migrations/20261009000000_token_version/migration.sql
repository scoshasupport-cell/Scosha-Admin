-- Access-token revocation counter. Existing rows start at 0, which matches
-- access tokens that were issued before this column existed (they have no `tv` claim).
ALTER TABLE `users` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `admins` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;
