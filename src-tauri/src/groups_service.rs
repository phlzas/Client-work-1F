use crate::audit_service::AuditService;
use crate::database::{Database, DatabaseResult};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: i32,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGroupRequest {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupWithStudentCount {
    pub id: i32,
    pub name: String,
    pub student_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

pub struct GroupsService;

impl GroupsService {
    /// Get all groups
    pub fn get_all_groups(db: &Database) -> DatabaseResult<Vec<Group>> {
        let mut stmt = db
            .connection()
            .prepare("SELECT id, name, created_at, updated_at FROM groups ORDER BY name")?;

        let group_iter = stmt.query_map([], |row| {
            Ok(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;

        let groups: Result<Vec<Group>, _> = group_iter.collect();
        groups.map_err(Into::into)
    }

    /// Get all groups with student counts
    pub fn get_all_groups_with_counts(db: &Database) -> DatabaseResult<Vec<GroupWithStudentCount>> {
        let mut stmt = db.connection().prepare(
            "SELECT g.id, g.name, g.created_at, g.updated_at, 
                    COUNT(s.id) as student_count
             FROM groups g
             LEFT JOIN students s ON g.name = s.group_name
             GROUP BY g.id, g.name, g.created_at, g.updated_at
             ORDER BY g.name",
        )?;

        let group_iter = stmt.query_map([], |row| {
            Ok(GroupWithStudentCount {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                student_count: row.get(4)?,
            })
        })?;

        let groups: Result<Vec<GroupWithStudentCount>, _> = group_iter.collect();
        groups.map_err(Into::into)
    }

    /// Get a group by ID
    pub fn get_group_by_id(db: &Database, id: i32) -> DatabaseResult<Option<Group>> {
        let mut stmt = db
            .connection()
            .prepare("SELECT id, name, created_at, updated_at FROM groups WHERE id = ?1")?;

        let mut group_iter = stmt.query_map([id], |row| {
            Ok(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;

        match group_iter.next() {
            Some(group) => Ok(Some(group?)),
            None => Ok(None),
        }
    }

    /// Get a group by name
    pub fn get_group_by_name(db: &Database, name: &str) -> DatabaseResult<Option<Group>> {
        let mut stmt = db
            .connection()
            .prepare("SELECT id, name, created_at, updated_at FROM groups WHERE name = ?1")?;

        let mut group_iter = stmt.query_map([name], |row| {
            Ok(Group {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;

        match group_iter.next() {
            Some(group) => Ok(Some(group?)),
            None => Ok(None),
        }
    }

    /// Create a new group
    pub fn create_group(db: &Database, request: CreateGroupRequest) -> DatabaseResult<Group> {
        // Validate group name
        if request.name.trim().is_empty() {
            return Err(crate::database::DatabaseError::Migration(
                "Group name cannot be empty".to_string(),
            ));
        }

        // Check if group already exists
        if Self::get_group_by_name(db, &request.name)?.is_some() {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Group '{}' already exists",
                request.name
            )));
        }

        let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // Insert the group
        db.connection().execute(
            "INSERT INTO groups (name, created_at, updated_at) VALUES (?1, ?2, ?3)",
            params![request.name, now, now],
        )?;

        let group_id = db.connection().last_insert_rowid() as i32;

        // Create audit log entry
        let new_values = serde_json::json!({
            "id": group_id,
            "name": request.name,
            "created_at": now,
            "updated_at": now
        });

        AuditService::log_action(
            db,
            "CREATE",
            "groups",
            &group_id.to_string(),
            None,
            Some(&new_values.to_string()),
            None,
        )?;

        // Return the created group
        Ok(Group {
            id: group_id,
            name: request.name,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Update a group
    pub fn update_group(db: &Database, id: i32, request: UpdateGroupRequest) -> DatabaseResult<()> {
        // Validate group name
        if request.name.trim().is_empty() {
            return Err(crate::database::DatabaseError::Migration(
                "Group name cannot be empty".to_string(),
            ));
        }

        // Get the existing group for audit logging
        let existing_group = Self::get_group_by_id(db, id)?.ok_or_else(|| {
            crate::database::DatabaseError::Migration(format!("Group with ID {} not found", id))
        })?;

        // Check if another group with the same name exists (excluding current group)
        let mut stmt = db
            .connection()
            .prepare("SELECT COUNT(*) FROM groups WHERE name = ?1 AND id != ?2")?;
        let count: i32 = stmt.query_row(params![request.name, id], |row| row.get(0))?;

        if count > 0 {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Group '{}' already exists",
                request.name
            )));
        }

        let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // Update the group
        let rows_affected = db.connection().execute(
            "UPDATE groups SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![request.name, now, id],
        )?;

        if rows_affected == 0 {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Group with ID {} not found",
                id
            )));
        }

        // Update all students with the old group name to use the new name
        db.connection().execute(
            "UPDATE students SET group_name = ?1, updated_at = ?2 WHERE group_name = ?3",
            params![request.name, now, existing_group.name],
        )?;

        // Create audit log entry
        let old_values = serde_json::json!({
            "id": existing_group.id,
            "name": existing_group.name,
            "created_at": existing_group.created_at,
            "updated_at": existing_group.updated_at
        });

        let new_values = serde_json::json!({
            "id": id,
            "name": request.name,
            "created_at": existing_group.created_at,
            "updated_at": now
        });

        AuditService::log_action(
            db,
            "UPDATE",
            "groups",
            &id.to_string(),
            Some(&old_values.to_string()),
            Some(&new_values.to_string()),
            None,
        )?;

        Ok(())
    }

    /// Delete a group
    pub fn delete_group(db: &Database, id: i32) -> DatabaseResult<bool> {
        // Get the existing group for audit logging and validation
        let existing_group = match Self::get_group_by_id(db, id)? {
            Some(group) => group,
            None => return Ok(false), // Group doesn't exist
        };

        // Check if any students are assigned to this group
        let student_count = Self::get_students_count_by_group_id(db, id)?;
        if student_count > 0 {
            return Err(crate::database::DatabaseError::Migration(format!(
                "Cannot delete group '{}' because {} students are assigned to it",
                existing_group.name, student_count
            )));
        }

        // Delete the group
        let rows_affected = db
            .connection()
            .execute("DELETE FROM groups WHERE id = ?1", params![id])?;

        if rows_affected > 0 {
            // Create audit log entry
            let old_values = serde_json::json!({
                "id": existing_group.id,
                "name": existing_group.name,
                "created_at": existing_group.created_at,
                "updated_at": existing_group.updated_at
            });

            AuditService::log_action(
                db,
                "DELETE",
                "groups",
                &id.to_string(),
                Some(&old_values.to_string()),
                None,
                None,
            )?;

            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Get count of students in a group by group ID
    pub fn get_students_count_by_group_id(db: &Database, group_id: i32) -> DatabaseResult<i32> {
        // First get the group name
        let group = Self::get_group_by_id(db, group_id)?.ok_or_else(|| {
            crate::database::DatabaseError::Migration(format!(
                "Group with ID {} not found",
                group_id
            ))
        })?;

        Self::get_students_count_by_group_name(db, &group.name)
    }

    /// Get count of students in a group by group name
    pub fn get_students_count_by_group_name(
        db: &Database,
        group_name: &str,
    ) -> DatabaseResult<i32> {
        let mut stmt = db
            .connection()
            .prepare("SELECT COUNT(*) FROM students WHERE group_name = ?1")?;

        let count: i32 = stmt.query_row([group_name], |row| row.get(0))?;
        Ok(count)
    }

    /// Force delete a group and reassign students to default group
    pub fn force_delete_group_with_reassignment(
        db: &Database,
        id: i32,
        default_group_name: &str,
    ) -> DatabaseResult<bool> {
        // Get the existing group
        let existing_group = match Self::get_group_by_id(db, id)? {
            Some(group) => group,
            None => return Ok(false), // Group doesn't exist
        };

        let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // Reassign all students to the default group
        let students_updated = db.connection().execute(
            "UPDATE students SET group_name = ?1, updated_at = ?2 WHERE group_name = ?3",
            params![default_group_name, now, existing_group.name],
        )?;

        // Delete the group
        let rows_affected = db
            .connection()
            .execute("DELETE FROM groups WHERE id = ?1", params![id])?;

        if rows_affected > 0 {
            // Create audit log entry
            let old_values = serde_json::json!({
                "id": existing_group.id,
                "name": existing_group.name,
                "created_at": existing_group.created_at,
                "updated_at": existing_group.updated_at
            });

            AuditService::log_action(
                db,
                "DELETE",
                "groups",
                &id.to_string(),
                Some(&old_values.to_string()),
                None,
                Some(&format!(
                    "Force deleted with {} students reassigned to '{}'",
                    students_updated, default_group_name
                )),
            )?;

            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Ensure default groups exist
    pub fn ensure_default_groups_exist(db: &Database) -> DatabaseResult<()> {
        // No-op: Do not auto-create temporary groups on first run.
        // The UI will prompt users to create groups explicitly.
        Ok(())
    }

    /// Get group statistics
    pub fn get_group_statistics(db: &Database) -> DatabaseResult<GroupStatistics> {
        let total_groups: i32 =
            db.connection()
                .query_row("SELECT COUNT(*) FROM groups", [], |row| row.get(0))?;

        let groups_with_students: i32 = db.connection().query_row(
            "SELECT COUNT(DISTINCT g.id) FROM groups g 
             INNER JOIN students s ON g.name = s.group_name",
            [],
            |row| row.get(0),
        )?;

        let empty_groups = total_groups - groups_with_students;

        let largest_group: Option<(String, i32)> = {
            let mut stmt = db.connection().prepare(
                "SELECT g.name, COUNT(s.id) as student_count
                 FROM groups g
                 LEFT JOIN students s ON g.name = s.group_name
                 GROUP BY g.id, g.name
                 ORDER BY student_count DESC
                 LIMIT 1",
            )?;

            let mut rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })?;

            match rows.next() {
                Some(row) => Some(row?),
                None => None,
            }
        };

        Ok(GroupStatistics {
            total_groups,
            groups_with_students,
            empty_groups,
            largest_group_name: largest_group.as_ref().map(|(name, _)| name.clone()),
            largest_group_size: largest_group.map(|(_, size)| size).unwrap_or(0),
        })
    }

    /// Validate group name
    pub fn validate_group_name(name: &str) -> Result<(), String> {
        let trimmed = name.trim();

        if trimmed.is_empty() {
            return Err("Group name cannot be empty".to_string());
        }

        if trimmed.len() > 100 {
            return Err("Group name cannot be longer than 100 characters".to_string());
        }

        // Check for invalid characters (optional - you can customize this)
        if trimmed.contains('\n') || trimmed.contains('\r') || trimmed.contains('\t') {
            return Err("Group name cannot contain line breaks or tabs".to_string());
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupStatistics {
    pub total_groups: i32,
    pub groups_with_students: i32,
    pub empty_groups: i32,
    pub largest_group_name: Option<String>,
    pub largest_group_size: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db =
            Database::new(temp_dir.path().to_path_buf()).expect("Failed to create test database");
        (db, temp_dir)
    }

    #[test]
    fn test_create_group() {
        let (db, _temp_dir) = setup_test_db();

        let request = CreateGroupRequest {
            name: "Test Group".to_string(),
        };

        let group = GroupsService::create_group(&db, request).expect("Failed to create group");

        assert_eq!(group.name, "Test Group");
        assert!(group.id > 0);
    }

    #[test]
    fn test_get_all_groups() {
        let (db, _temp_dir) = setup_test_db();

        // Default groups should exist
        let groups = GroupsService::get_all_groups(&db).expect("Failed to get groups");
        assert!(groups.len() >= 3); // At least the default groups
    }

    #[test]
    fn test_duplicate_group_name() {
        let (db, _temp_dir) = setup_test_db();

        let request = CreateGroupRequest {
            name: "Duplicate Group".to_string(),
        };

        // First creation should succeed
        GroupsService::create_group(&db, request.clone()).expect("Failed to create first group");

        // Second creation should fail
        let result = GroupsService::create_group(&db, request);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_group() {
        let (db, _temp_dir) = setup_test_db();

        // Create a group
        let create_request = CreateGroupRequest {
            name: "Original Name".to_string(),
        };
        let group =
            GroupsService::create_group(&db, create_request).expect("Failed to create group");

        // Update the group
        let update_request = UpdateGroupRequest {
            name: "Updated Name".to_string(),
        };
        GroupsService::update_group(&db, group.id, update_request).expect("Failed to update group");

        // Verify the update
        let updated_group = GroupsService::get_group_by_id(&db, group.id)
            .expect("Failed to get updated group")
            .expect("Group not found");

        assert_eq!(updated_group.name, "Updated Name");
    }

    #[test]
    fn test_validate_group_name() {
        assert!(GroupsService::validate_group_name("Valid Name").is_ok());
        assert!(GroupsService::validate_group_name("").is_err());
        assert!(GroupsService::validate_group_name("   ").is_err());
        assert!(GroupsService::validate_group_name("Name\nwith\nnewlines").is_err());
    }
}
