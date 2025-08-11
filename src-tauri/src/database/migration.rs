use crate::database::{Database, DatabaseResult, Migration};
use chrono::Utc;
use rusqlite::params;

pub struct MigrationManager;

impl MigrationManager {
    /// Apply a single migration
    pub fn apply_migration(db: &Database, migration: &Migration) -> DatabaseResult<()> {
        log::info!(
            "Applying migration {}: {}",
            migration.version,
            migration.description
        );

        // Start transaction
        let tx = db.connection().unchecked_transaction()?;

        // Execute the migration SQL
        tx.execute(&migration.sql, [])?;

        // Record the migration
        tx.execute(
            "INSERT INTO migrations (version, description) VALUES (?1, ?2)",
            params![migration.version, migration.description],
        )?;

        // Commit transaction
        tx.commit()?;

        log::info!("Successfully applied migration {}", migration.version);
        Ok(())
    }

    /// Get migration history
    pub fn get_migration_history(
        db: &Database,
    ) -> DatabaseResult<Vec<crate::database::AppliedMigration>> {
        let mut stmt = db
            .connection()
            .prepare("SELECT version, description, applied_at FROM migrations ORDER BY version")?;

        let migration_iter = stmt.query_map([], |row| {
            Ok(crate::database::AppliedMigration {
                version: row.get(0)?,
                description: row.get(1)?,
                applied_at: row.get(2)?,
            })
        })?;

        migration_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(crate::database::DatabaseError::from)
    }

    /// Get pending migrations (not yet applied)
    pub fn get_pending_migrations(db: &Database) -> DatabaseResult<Vec<Migration>> {
        let current_version = crate::database::schema::SchemaManager::get_current_version(db)?;
        let all_migrations = crate::database::schema::SchemaManager::get_migrations();

        let pending: Vec<Migration> = all_migrations
            .into_iter()
            .filter(|m| m.version > current_version)
            .collect();

        Ok(pending)
    }

    /// Validate migration integrity
    pub fn validate_migrations(
        db: &Database,
    ) -> DatabaseResult<crate::database::MigrationValidation> {
        let applied_migrations = Self::get_migration_history(db)?;
        let all_migrations = crate::database::schema::SchemaManager::get_migrations();

        let mut validation = crate::database::MigrationValidation {
            is_valid: true,
            issues: Vec::new(),
            applied_count: applied_migrations.len(),
            total_count: all_migrations.len(),
        };

        // Check for gaps in migration versions
        for (i, applied) in applied_migrations.iter().enumerate() {
            let expected_version = i as i32 + 1;
            if applied.version != expected_version {
                validation.is_valid = false;
                validation.issues.push(format!(
                    "Migration version gap detected: expected {}, found {}",
                    expected_version, applied.version
                ));
            }
        }

        // Check if applied migrations match defined migrations
        for applied in &applied_migrations {
            if let Some(defined) = all_migrations.iter().find(|m| m.version == applied.version) {
                if defined.description != applied.description {
                    validation.is_valid = false;
                    validation.issues.push(format!(
                        "Migration {} description mismatch: applied='{}', defined='{}'",
                        applied.version, applied.description, defined.description
                    ));
                }
            } else {
                validation.is_valid = false;
                validation.issues.push(format!(
                    "Applied migration {} not found in defined migrations",
                    applied.version
                ));
            }
        }

        Ok(validation)
    }

    /// Force apply a specific migration (use with caution)
    pub fn force_apply_migration(db: &Database, version: i32) -> DatabaseResult<()> {
        if Self::is_migration_applied(db, version)? {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Migration {} is already applied",
                version
            )));
        }

        let migrations = crate::database::schema::SchemaManager::get_migrations();
        if let Some(migration) = migrations.iter().find(|m| m.version == version) {
            Self::apply_migration(db, migration)?;
            log::warn!(
                "Force applied migration {}: {}",
                version,
                migration.description
            );
        } else {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Migration {} not found",
                version
            )));
        }

        Ok(())
    }

    /// Mark a migration as applied without executing it (use with extreme caution)
    pub fn mark_migration_applied(
        db: &Database,
        version: i32,
        description: String,
    ) -> DatabaseResult<()> {
        // Check if already applied
        if Self::is_migration_applied(db, version)? {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Migration {} is already marked as applied",
                version
            )));
        }

        db.connection().execute(
            "INSERT INTO migrations (version, description) VALUES (?1, ?2)",
            params![version, description],
        )?;

        log::warn!(
            "Marked migration {} as applied without execution: {}",
            version,
            description
        );
        Ok(())
    }

    /// Check if a migration version is already applied
    pub fn is_migration_applied(db: &Database, version: i32) -> DatabaseResult<bool> {
        let count: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

