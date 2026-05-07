# Init scripts

Files in this directory are mounted into the Postgres container at `/docker-entrypoint-initdb.d`.

They only run when the Postgres data volume is empty (first boot).

Recommended approach:
- Use this folder for minimal bootstrap-only SQL.
- Run versioned schema updates from `db/migrations` with the migration scripts.
