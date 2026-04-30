---
name: database-query
description: Guide for querying database in docker container. Use when you need to query database.
---

## Connection Details
Database is postgres, running in docker container. Use psql to query database.
Use postgres sql syntax.

### Credentials
See file .env

### Docker Container
**Container ID/Name**: `invoice-data-db-1`

If container not started, start it with `docker compose up -d`

If container still not found check exact container name with `docker ps` and use it instead of `invoice-data-db-1`

## Commands examples

### Select all users
```bash
docker exec invoice-data-db-1 psql -U invoice -d invoice -c "SELECT * FROM users;"
```

### Select table with columns
```bash
docker exec invoice-data-db-1 psql -U invoice -d invoice -c "SELECT * FROM tasks;"
```

### Run multiple statements
```bash
docker exec invoice-data-db-1 psql -U invoice -d invoice -c "
  SELECT 'Tasks' as table_name, count(*) as row_count FROM tasks;
  SELECT 'Users' as table_name, count(*) as row_count FROM users;
"
```

