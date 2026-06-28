# ArmorIQ Backend - Phase 1 Foundation

## Database Setup Instructions
1. Ensure PostgreSQL is installed and running on your system.
2. If using Docker, you can start a local PostgreSQL instance by running:
   ```bash
   docker run --name armoriq-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=armoriq -p 5432:5432 -d postgres
   ```
3. Copy `.env.example` to `.env` or just use the generated `.env` file to ensure the `DATABASE_URL` matches your local instance.
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/armoriq?schema=public"`

## Migration Strategy
We use **Prisma ORM** for schema management and migrations.

### Initializing the Database
To apply the initial schema and create the tables in your PostgreSQL database, run:
```bash
npx prisma migrate dev --name init
```
This command will:
1. Create a new SQL migration file in `prisma/migrations`.
2. Execute the SQL against your database.
3. Generate the Prisma Client locally in `node_modules/@prisma/client`.

### Evolving the Schema
Whenever you add or modify entities in `prisma/schema.prisma` in future phases, always generate a new migration rather than using `db push` to ensure predictable, version-controlled schema evolution:
```bash
npx prisma migrate dev --name <descriptive_name>
```

### Resetting the Database
If you need to completely reset the database during development, run:
```bash
npx prisma migrate reset
```
This drops the database, creates a new one, and applies all migrations from scratch.
