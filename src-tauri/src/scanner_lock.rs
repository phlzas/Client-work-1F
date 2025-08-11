use once_cell::sync::Lazy;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// Scanner lock configuration
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(5);
const RETRY_INTERVAL: Duration = Duration::from_millis(100);
const MIN_SCAN_INTERVAL: Duration = Duration::from_millis(500);

// Global scanner lock to prevent concurrent scans
static SCANNER_LOCK: Lazy<Mutex<ScannerState>> = Lazy::new(|| Mutex::new(ScannerState::new()));

#[derive(Debug)]
struct ScannerState {
    is_locked: bool,
    last_scan: Instant,
    scan_count: u32,
    errors: u32,
}

impl ScannerState {
    fn new() -> Self {
        Self {
            is_locked: false,
            last_scan: Instant::now(),
            scan_count: 0,
            errors: 0,
        }
    }

    fn can_scan(&self) -> bool {
        !self.is_locked && self.last_scan.elapsed() >= MIN_SCAN_INTERVAL
    }

    fn record_scan(&mut self) {
        self.is_locked = true;
        self.last_scan = Instant::now();
        self.scan_count += 1;
    }

    fn record_error(&mut self) {
        self.errors += 1;
    }
}

#[derive(Debug, Serialize)]
pub struct ScannerStats {
    pub total_scans: u32,
    pub total_errors: u32,
    pub last_scan_age_ms: u64,
    pub is_locked: bool,
}

#[derive(Debug)]
pub struct ScannerLock;

impl ScannerLock {
    /// Try to acquire the scanner lock with timeout
    pub fn acquire_with_timeout(timeout: Duration) -> Result<bool, String> {
        let start = Instant::now();
        while start.elapsed() < timeout {
            if let Ok(mut state) = SCANNER_LOCK.try_lock() {
                if state.can_scan() {
                    state.record_scan();
                    return Ok(true);
                }
            }
            std::thread::sleep(RETRY_INTERVAL);
        }
        Err("Scanner lock acquisition timeout".to_string())
    }

    /// Try to acquire the scanner lock with default timeout
    pub fn acquire() -> Result<bool, String> {
        Self::acquire_with_timeout(DEFAULT_TIMEOUT)
    }

    /// Record an error in the scanner state
    pub fn record_error() -> Result<(), String> {
        if let Ok(mut state) = SCANNER_LOCK.try_lock() {
            state.record_error();
            Ok(())
        } else {
            Err("Could not record error: lock unavailable".to_string())
        }
    }

    /// Get current scanner statistics
    pub fn get_stats() -> Result<ScannerStats, String> {
        let guard = SCANNER_LOCK
            .lock()
            .map_err(|e| format!("Stats error: {}", e))?;

        Ok(ScannerStats {
            total_scans: guard.scan_count,
            total_errors: guard.errors,
            last_scan_age_ms: guard.last_scan.elapsed().as_millis() as u64,
            is_locked: guard.is_locked,
        })
    }

    /// Release the scanner lock
    pub fn release() -> Result<(), String> {
        if let Ok(mut state) = SCANNER_LOCK.try_lock() {
            state.is_locked = false;
            Ok(())
        } else {
            Err("Could not release lock: lock unavailable".to_string())
        }
    }
}
