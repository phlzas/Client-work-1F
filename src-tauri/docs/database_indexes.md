# Database Performance Indexes

This document describes the database indexes created for optimal performance in the Student Management System.

## Index Strategy

The indexes are designed to optimize the most common query patterns based on the application requirements:

### Students Table Indexes

1. **`idx_students_id`** - Primary key lookup optimization

   - Optimizes: QR code scanning and direct student lookups
   - Query pattern: `SELECT * FROM students WHERE id = ?`

2. **`idx_students_group`** - Group filtering

   - Optimizes: Filtering students by group in the data grid
   - Query pattern: `SELECT * FROM students WHERE group_name = ?`

3. **`idx_students_paid_amount`** - Payment status queries

   - Optimizes: Finding students with payment below threshold
   - Query pattern: `SELECT * FROM students WHERE paid_amount < ?`

4. **`idx_students_group_paid`** - Combined group and payment filtering

   - Optimizes: Complex filtering by both group and payment status
   - Query pattern: `SELECT * FROM students WHERE group_name = ? AND paid_amount < ?`

5. **`idx_students_name`** - Name-based searches

   - Optimizes: Searching students by name
   - Query pattern: `SELECT * FROM students WHERE name LIKE ?`

6. **`idx_students_created_at`** - Date-based queries

   - Optimizes: Finding recently added students
   - Query pattern: `SELECT * FROM students ORDER BY created_at DESC`

7. **`idx_students_updated_at`** - Recently modified queries
   - Optimizes: Finding recently updated student records
   - Query pattern: `SELECT * FROM students ORDER BY updated_at DESC`

### Attendance Table Indexes

1. **`idx_attendance_student_id`** - Student attendance lookup

   - Optimizes: Getting all attendance records for a student
   - Query pattern: `SELECT * FROM attendance WHERE student_id = ?`

2. **`idx_attendance_date`** - Date-based attendance queries

   - Optimizes: Getting attendance for a specific date
   - Query pattern: `SELECT * FROM attendance WHERE date = ?`

3. **`idx_attendance_student_date`** - Duplicate prevention

   - Optimizes: Checking if attendance already exists for student on date
   - Query pattern: `SELECT * FROM attendance WHERE student_id = ? AND date = ?`

4. **`idx_attendance_date_desc`** - Recent attendance first

   - Optimizes: Getting most recent attendance records
   - Query pattern: `SELECT * FROM attendance ORDER BY date DESC`

5. **`idx_attendance_created_at`** - Chronological queries
   - Optimizes: Getting attendance records in order of creation
   - Query pattern: `SELECT * FROM attendance ORDER BY created_at`

### Audit Log Table Indexes

1. **`idx_audit_log_table_record`** - Record history tracking

   - Optimizes: Getting all changes for a specific record
   - Query pattern: `SELECT * FROM audit_log WHERE table_name = ? AND record_id = ?`

2. **`idx_audit_log_timestamp`** - Time-based audit queries

   - Optimizes: Getting audit logs within a time range
   - Query pattern: `SELECT * FROM audit_log WHERE timestamp BETWEEN ? AND ?`

3. **`idx_audit_log_timestamp_desc`** - Recent changes first

   - Optimizes: Getting most recent audit entries
   - Query pattern: `SELECT * FROM audit_log ORDER BY timestamp DESC`

4. **`idx_audit_log_user_id`** - User activity tracking

   - Optimizes: Getting all actions performed by a specific user
   - Query pattern: `SELECT * FROM audit_log WHERE user_id = ?`

5. **`idx_audit_log_action_type`** - Action filtering

   - Optimizes: Filtering audit logs by action type (INSERT, UPDATE, DELETE)
   - Query pattern: `SELECT * FROM audit_log WHERE action_type = ?`

6. **`idx_audit_log_table_timestamp`** - Table-specific history
   - Optimizes: Getting recent changes for a specific table
   - Query pattern: `SELECT * FROM audit_log WHERE table_name = ? ORDER BY timestamp DESC`

### Settings Table Indexes

1. **`idx_settings_key`** - Configuration lookups

   - Optimizes: Getting specific configuration values
   - Query pattern: `SELECT value FROM settings WHERE key = ?`

2. **`idx_settings_updated_at`** - Recently changed settings
   - Optimizes: Finding recently modified configuration
   - Query pattern: `SELECT * FROM settings ORDER BY updated_at DESC`

### Users Table Indexes (Future Multi-User Support)

1. **`idx_users_username`** - Login lookups

   - Optimizes: User authentication
   - Query pattern: `SELECT * FROM users WHERE username = ?`

2. **`idx_users_role`** - Role-based queries

   - Optimizes: Getting users by role for permission checks
   - Query pattern: `SELECT * FROM users WHERE role = ?`

3. **`idx_users_last_login`** - Activity tracking

   - Optimizes: Finding recently active users
   - Query pattern: `SELECT * FROM users ORDER BY last_login DESC`

4. **`idx_users_created_at`** - User registration tracking
   - Optimizes: Finding recently registered users
   - Query pattern: `SELECT * FROM users ORDER BY created_at DESC`

### Migrations Table Indexes

1. **`idx_migrations_version`** - Version lookups

   - Optimizes: Migration management queries
   - Query pattern: `SELECT * FROM migrations WHERE version = ?`

2. **`idx_migrations_applied_at`** - Migration history
   - Optimizes: Getting migration history in chronological order
   - Query pattern: `SELECT * FROM migrations ORDER BY applied_at`

## Performance Benefits

### Query Optimization

- **Index Scans**: Most queries will use index scans instead of full table scans
- **Sorted Results**: Queries with ORDER BY clauses will be faster when matching index order
- **Range Queries**: Queries with WHERE clauses on indexed columns will be significantly faster

### Expected Performance Improvements

- **Student ID Lookups**: ~100x faster for QR code scanning
- **Group Filtering**: ~50x faster for data grid filtering
- **Payment Status Queries**: ~20x faster for highlighting low-payment students
- **Attendance Queries**: ~100x faster for duplicate checking and history retrieval
- **Audit Log Queries**: ~50x faster for change tracking and reporting

### Memory Usage

- Indexes consume additional storage space (~10-20% of table size)
- Query optimizer statistics are updated regularly via ANALYZE commands
- SQLite's query planner automatically chooses the best index for each query

## Monitoring and Maintenance

### Query Performance Analysis

Use the `analyze_query_performance()` method to check if queries are using indexes effectively:

```rust
let analyses = db.analyze_query_performance()?;
for analysis in analyses {
    println!("Query: {} - Uses Index: {}", analysis.description, analysis.uses_index);
}
```

### Index Information

Get information about all created indexes:

```rust
let indexes = db.get_index_info()?;
for index in indexes {
    println!("Index: {} on table: {}", index.name, index.table_name);
}
```

### Database Optimization

Regularly optimize the database to maintain performance:

```rust
db.optimize_database()?; // Runs ANALYZE and VACUUM
```

## Best Practices

1. **Regular Analysis**: Run ANALYZE periodically to update query optimizer statistics
2. **Monitor Usage**: Use EXPLAIN QUERY PLAN to verify indexes are being used
3. **Avoid Over-Indexing**: Only create indexes for frequently used query patterns
4. **Composite Indexes**: Use multi-column indexes for queries filtering on multiple columns
5. **Index Maintenance**: SQLite automatically maintains indexes, no manual intervention needed

## Future Considerations

- **Partial Indexes**: Consider partial indexes for specific conditions (e.g., only unpaid students)
- **Expression Indexes**: Create indexes on computed values if needed
- **Full-Text Search**: Add FTS indexes if text search functionality is required
- **Statistics Updates**: Implement automatic ANALYZE scheduling for production use
