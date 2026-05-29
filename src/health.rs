use crate::models::SystemHealthResponse;
use chrono::Utc;
use std::fs;

pub struct SystemHealth;

impl SystemHealth {
    pub fn collect() -> SystemHealthResponse {
        let cpu_usage = Self::get_cpu_usage();
        let (mem_used, mem_total) = Self::get_memory_info();
        let memory_available_mb = if mem_total > mem_used {
            mem_total - mem_used
        } else {
            0
        };

        let running_processes = Self::count_processes();

        SystemHealthResponse {
            cpu_usage,
            memory_usage: if mem_total > 0 {
                (mem_used as f64 / mem_total as f64) * 100.0
            } else {
                0.0
            },
            memory_total_mb: mem_total,
            memory_available_mb,
            running_processes,
            timestamp: Utc::now(),
        }
    }

    fn get_cpu_usage() -> f64 {
        // Read from /proc/stat
        match fs::read_to_string("/proc/stat") {
            Ok(content) => {
                let lines: Vec<&str> = content.lines().collect();
                if let Some(first_line) = lines.first() {
                    let parts: Vec<&str> = first_line.split_whitespace().collect();
                    if parts.len() >= 5 {
                        let user: u64 = parts[1].parse().unwrap_or(0);
                        let nice: u64 = parts[2].parse().unwrap_or(0);
                        let system: u64 = parts[3].parse().unwrap_or(0);
                        let idle: u64 = parts[4].parse().unwrap_or(1);

                        let total = user + nice + system + idle;
                        if total > 0 {
                            ((total - idle) as f64 / total as f64) * 100.0
                        } else {
                            0.0
                        }
                    } else {
                        0.0
                    }
                } else {
                    0.0
                }
            }
            Err(_) => 0.0,
        }
    }

    fn get_memory_info() -> (u64, u64) {
        // Read from /proc/meminfo
        match fs::read_to_string("/proc/meminfo") {
            Ok(content) => {
                let mut mem_total = 0u64;
                let mut mem_available = 0u64;

                for line in content.lines() {
                    if line.starts_with("MemTotal:") {
                        mem_total = Self::parse_meminfo_line(line);
                    } else if line.starts_with("MemAvailable:") {
                        mem_available = Self::parse_meminfo_line(line);
                    }
                }

                let mem_used = if mem_total > mem_available {
                    mem_total - mem_available
                } else {
                    0
                };

                (mem_used, mem_total)
            }
            Err(_) => (0, 0),
        }
    }

    fn parse_meminfo_line(line: &str) -> u64 {
        line.split_whitespace()
            .nth(1)
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0)
    }

    fn count_processes() -> usize {
        // Count entries in /proc
        match fs::read_dir("/proc") {
            Ok(entries) => entries
                .filter_map(|entry| entry.ok())
                .filter(|entry| {
                    entry
                        .file_name()
                        .to_string_lossy()
                        .parse::<u32>()
                        .is_ok()
                })
                .count(),
            Err(_) => 0,
        }
    }
}
