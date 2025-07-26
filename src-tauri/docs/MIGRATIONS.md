# Database Migration System

This document explains how to use the database migration system in the Student Management System.

## Overview

The migration system provides a structured way to evolve the database schema over time while maintaining data integrity and providing rollback capabilities. All migrations are tracked in a `migrations` table and applied automatically when the application starts.

The system ensures that:

- Database schema changes are applied consistently
- Changes are tracked and versioned
- The system can handle upgrades from any previous version
- Migration integrity can be validated

## How Migrations Work

1. **Migration Definition**: Migrations are defined in the `get_migrations()` method in `database.rs`
2. **Version Tracking**: Each migration has a unique version number (sequential integers starting from 1)
3. **Automatic Application**: On startup, the system checks for unapplied migrations and runs them in order
4. **Transaction Safety**: Each migration runs in its own transaction for atomicity

## Migration Structure

Each migration consists of:

- **Version**: Sequential integer starting from 1
- **Description**: Human-readable description of the change
- **SQL**: The SQL commands to execute
- **Applied At**: Timestamp when the migration was applied

```rust
Migration {
    version: 1,
    description: "Create students table".to_string(),
    sql: "CREATE TABLE students (...)",
    applied_at: None,
}
```

## Adding New Migrations

To add a new migration:

1. Open `src-tauri/src/database.rs`
2. Find the `get_migrations()` method
3. Add a new `Migration` struct to the vector with:
   - Next sequential version number
   - Descriptive name
   - SQL commands to execute
4. Test thoroughly before deployment

Example:

```rust
Migration {
    version: 7,
    description: "Add email column to students table".to_string(),
    sql: "ALTER TABLE students ADD COLUMN email TEXT".to_string(),
    applied_at: None,
},
```

## Available IPC Commands

The following IPC commands are available for frontend integration:

### Query Migration Status

```typescript
// Get current schema information
const schemaInfo = await invoke("get_schema_info");
// Returns: { current_version, latest_version, pending_migrations, is_up_to_date }

// Get all defined migrations
const allMigrations = await invoke("get_all_migrations");
// Returns: Array of Migration objects

// Get applied migration history
const history = await invoke("get_migration_history");
// Returns: Array of AppliedMigration objects with timestamps

// Get pending migrations (not yet applied)
const pending = await invoke("get_pending_migrations");
// Returns: Array of Migration objects
```

### Validate Migration Integrity

```typescript
// Validate that all migrations are consistent
const validation = await invoke("validate_migrations");
// Returns: { is_valid, issues, applied_count, total_count }

// Quick integrity check
const isValid = await invoke("check_migration_integrity");
// Returns: boolean
```

### Advanced Migration Operations

```typescript
// Force apply a specific migration (use with caution)
await invoke("force_apply_migration", { version: 5 });

// Mark a migration as applied without executing it (dangerous)
await invoke("mark_migration_applied", {
  version: 5,
  description: "Create users table",
});

// Get rollback information (SQLite doesn't support automatic rollbacks)
const rollbackInfo = await invoke("get_rollback_info", { target_version: 3 });
// Returns: { current_version, target_version, migrations_to_rollback, warning, instructions }
```

## Migration Best Practices

### DO

- Always increment version numbers sequentially
- Write descriptive migration descriptions
- Test migrations on a copy of production data
- Create backups before applying migrations
- Use transactions for complex migrations
- Keep migrations small and focused
- Document breaking changes

### DON'T

- Skip version numbers
- Modify existing migrations after they've been applied
- Use `force_apply_migration` unless absolutely necessary
- Ignore migration validation errors
- Write migrations that can't be easily understood
- Include application logic in migrations

## Migration Validation

The system includes validation to ensure migration integrity:

- **Version Gaps**: Detects missing migration versions
- **Description Mismatches**: Ensures applied migrations match defined ones
- **Orphaned Migrations**: Identifies applied migrations not in the current definition

## Rollback Considerations

**Important**: SQLite does not support automatic migration rollbacks. If you need to rollback:

1. Create a backup before applying migrations
2. Use `get_rollback_info()` to understand what needs to be reversed
3. Manually write and execute the reverse SQL commands
4. Update the migrations table to reflect the new version

## Recovery Scenarios

### Missing Migration File

If a migration was applied but is no longer in the code:

1. Add the migration back to `get_migrations()`
2. Ensure the version and description match the applied one

### Failed Migration

If a migration fails during application:

1. Fix the SQL in the migration definition
2. Manually remove the failed migration from the `migrations` table
3. Restart the application to retry

### Schema Corruption

If the schema becomes corrupted:

1. Create a backup of the current database
2. Use `validate_migrations()` to identify issues
3. Consider using recovery commands if necessary
4. In extreme cases, restore from a known good backup

## Troubleshooting

### Migration Validation Fails

- Check for gaps in version numbers
- Ensure applied migrations match defined migrations
- Verify migration descriptions haven't changed

### Database Corruption

- Restore from backup
- Use `validate_migrations()` to identify issues
- Consider using `mark_migration_applied()` for recovery (with extreme caution)

### Performance Issues

- Ensure proper indexes are created after schema changes
- Run `ANALYZE` after major migrations
- Consider `VACUUM` for storage optimization

## Testing Migrations

The migration system includes comprehensive tests:

```bash
# Run all migration tests
cargo test migration

# Run specific migration test
cargo test test_migration_history

# Run all database tests
cargo test database
```

Always test migrations with:

1. Empty database (fresh installation)
2. Database with existing data
3. Large datasets to check performance
4. Edge cases and error conditions

## Monitoring

Monitor migration health by:

- Checking `get_schema_info()` on application startup
- Running `validate_migrations()` periodically
- Logging migration application times
- Monitoring database size after migrations

## Migration History Example

```json
{
  "current_version": 6,
  "latest_version": 6,
  "pending_migrations": 0,
  "is_up_to_date": true,
  "applied_migrations": [
    {
      "version": 1,
      "description": "Create students table",
      "applied_at": "2024-01-15T10:30:00Z"
    },
    {
      "version": 2,
      "description": "Create attendance table",
      "applied_at": "2024-01-15T10:30:01Z"
    }
    // ... more migrations
  ]
}
```

## Security Considerations

- Migration SQL is executed with full database privileges
- Validate all migration SQL before deployment
- Never include user input in migration SQL
- Use parameterized queries where possible
- Audit migration changes in production environments

## Future Enhancements

Potential future improvements:

- Migration dry-run mode
- Automatic backup before migrations
- Migration performance metrics
- External migration file support
- Enhanced rollback capabilities with careful consideration
