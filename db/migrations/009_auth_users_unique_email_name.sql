-- Unique case-insensitive email and username on auth_users.
-- If this fails, find duplicates first, e.g.:
--   SELECT lower(trim(email)), count(*) FROM auth_users WHERE email IS NOT NULL AND trim(email) <> '' GROUP BY 1 HAVING count(*) > 1;
--   SELECT lower(trim(name)), count(*) FROM auth_users WHERE name IS NOT NULL AND trim(name) <> '' GROUP BY 1 HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_email_lower_uidx
  ON auth_users ((lower(trim(email))))
  WHERE email IS NOT NULL AND trim(email) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_name_lower_uidx
  ON auth_users ((lower(trim(name))))
  WHERE name IS NOT NULL AND trim(name) <> '';
