/**
 * Service to monitor system performance and resource usage
 * Provides real-time metrics for the Developer Sneak Peek
 */

import os from 'os';
import { performance } from 'perf_hooks';

// Track application start time
const appStartTime = Date.now();

// Store baseline metrics for comparison
let baselineMetrics = {
  memory: process.memoryUsage(),
  cpu: process.cpuUsage(),
  timestamp: Date.now()
};

// Update baseline every 5 minutes
setInterval(() => {
  baselineMetrics = {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: Date.now()
  };
}, 5 * 60 * 1000);

/**
 * Get comprehensive system metrics
 * @returns {object} System performance metrics
 */
export async function getSystemMetrics() {
  // Current metrics
  const currentCpu = process.cpuUsage();
  const currentMemory = process.memoryUsage();
  const currentTime = Date.now();
  
  // Calculate CPU usage percentage
  const userCpuUsage = currentCpu.user - baselineMetrics.cpu.user;
  const systemCpuUsage = currentCpu.system - baselineMetrics.cpu.system;
  const elapsedTime = currentTime - baselineMetrics.timestamp;
  
  // CPU usage as percentage of one core
  const cpuUsagePercent = Math.min(100, Math.round(
    (userCpuUsage + systemCpuUsage) / (elapsedTime * 1000) * 100
  ));
  
  // Memory usage
  const memoryUsed = Math.round(currentMemory.rss / 1024 / 1024);
  const memoryTotal = Math.round(os.totalmem() / 1024 / 1024);
  const memoryPercent = Math.round((memoryUsed / memoryTotal) * 100);
  
  // Get system uptime
  const systemUptime = Math.floor(os.uptime());
  const appUptime = Math.floor((Date.now() - appStartTime) / 1000);
  
  // Get system load averages (1, 5, 15 minutes)
  const loadAvg = os.loadavg();
  
  // Count CPU cores
  const cpuCount = os.cpus().length;
  
  // Network interfaces (excluding internal loopback)
  const networkInterfaces = Object.entries(os.networkInterfaces())
    .filter(([name]) => !name.includes('lo'))
    .map(([name, interfaces]) => {
      const ipv4 = interfaces.find(iface => iface.family === 'IPv4');
      return {
        name,
        address: ipv4 ? ipv4.address : 'unknown',
        mac: ipv4 ? ipv4.mac : 'unknown'
      };
    });
  
  // Return all metrics
  return {
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpuModel: os.cpus()[0].model,
    cpuCount,
    cpuUsage: {
      percent: cpuUsagePercent,
      coreLoad: loadAvg.map(load => (load / cpuCount * 100).toFixed(1) + '%')
    },
    memory: {
      usedMB: memoryUsed,
      totalMB: memoryTotal,
      percentUsed: memoryPercent,
      heapUsedMB: Math.round(currentMemory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(currentMemory.heapTotal / 1024 / 1024)
    },
    uptime: {
      system: formatUptime(systemUptime),
      application: formatUptime(appUptime)
    },
    network: {
      interfaces: networkInterfaces
    },
    process: {
      pid: process.pid,
      title: process.title
    }
  };
}

/**
 * Format seconds into human-readable uptime
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}