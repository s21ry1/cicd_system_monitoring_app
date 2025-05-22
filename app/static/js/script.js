// System Monitor JavaScript

// Global variables
let socket;
let cpuGaugeChart;
let memoryChart;
let memoryBreakdownChart;
let realtimeChart;
let diskIOChart;
let networkChart;
let chartData = {
    labels: [],
    cpuData: [],
    memoryData: [],
    diskReadData: [],
    diskWriteData: [],
    netUploadData: [],
    netDownloadData: []
};
let sortDirection = 1; // 1 for ascending, -1 for descending
let sortColumn = 0; // Default sort by PID
let darkMode = true; // Default to dark mode
let activeProcessFilter = 'all'; // Default process filter

// Boot time for calculating uptime
let bootTime;

// Health score configurations
const healthThresholds = {
    excellent: 90,
    good: 70,
    fair: 50
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme preference
    checkThemePreference();
    
    // Set up theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Connect to Socket.IO
    socket = io();

    // Initialize charts
    initCharts();

    // Initial data loading
    loadSystemInfo();
    loadCPUInfo();
    loadMemoryInfo();
    loadDiskInfo();
    loadNetworkInfo();
    loadProcessInfo();
    loadHealthStatus();
    loadWeatherInfo();

    // Set up Socket.IO event listeners
    setupSocketEvents();

    // Set up other event listeners
    document.getElementById('process-search').addEventListener('input', filterProcessTable);
    
    // Process filter dropdown
    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            activeProcessFilter = this.getAttribute('data-filter');
            loadProcessInfo(); // Refresh processes with filter
        });
    });
    
    // Process refresh button
    document.getElementById('refresh-processes').addEventListener('click', loadProcessInfo);
    
    // Add scroll behavior to navbar links
    document.querySelectorAll('.navbar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Update active state
                document.querySelectorAll('.navbar .nav-link').forEach(navLink => {
                    navLink.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });

    // Update time and uptime every second
    updateTime();
    setInterval(updateTime, 1000);
    
    // Add scroll event for navbar active state
    window.addEventListener('scroll', updateActiveNavLink);
});

// Check for saved theme preference
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun');
        darkMode = false;
    } else {
        // Default is dark mode now, so make sure theme icon is correct
        document.getElementById('theme-icon').classList.replace('fa-sun', 'fa-moon');
    }
}

// Toggle theme between light and dark mode
function toggleTheme() {
    const themeIcon = document.getElementById('theme-icon');
    
    if (document.body.classList.contains('light-mode')) {
        // Switch to dark mode
        document.body.classList.remove('light-mode');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
        darkMode = true;
    } else {
        // Switch to light mode
        document.body.classList.add('light-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
        darkMode = false;
    }
    
    // Update charts for new theme
    updateChartsTheme();
}

// Update chart themes based on current mode
function updateChartsTheme() {
    // Charts have been removed, so there's nothing to update
    // This function is kept for compatibility with the existing code
    console.log("Chart themes update skipped as charts have been removed");
}

// Update active nav link based on scroll position
function updateActiveNavLink() {
    const scrollPosition = window.scrollY;
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.navbar .nav-link');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(navLink => {
                navLink.classList.remove('active');
                if (navLink.getAttribute('href') === '#' + sectionId) {
                    navLink.classList.add('active');
                }
            });
        }
    });
}

// Initialize all charts
function initCharts() {
    // Charts have been removed from the dashboard
    console.log("Charts disabled as they have been removed from the dashboard");
    
    // Initialize chart variables as null to prevent errors
    cpuGaugeChart = null;
    memoryChart = null;
    memoryBreakdownChart = null;
    realtimeChart = null;
    diskIOChart = null;
    networkChart = null;
}

// Load health status information
function loadHealthStatus() {
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            updateHealthStatus(data);
        })
        .catch(error => {
            console.error('Error loading health status:', error);
        });
}

// Update health status display
function updateHealthStatus(data) {
    // Update score circle
    const scoreCircle = document.getElementById('health-score-circle-value');
    const scoreText = document.getElementById('health-score-text');
    const statusBadge = document.getElementById('health-status-badge');
    const issuesText = document.getElementById('health-issues');
    
    // Set the text
    scoreText.textContent = data.score;
    
    // Update circle fill
    scoreCircle.setAttribute('stroke-dasharray', `${data.score}, 100`);
    
    // Set colors based on status
    let statusColor;
    switch(data.status.toLowerCase()) {
        case 'excellent':
            statusColor = 'var(--health-excellent)';
            break;
        case 'good':
            statusColor = 'var(--health-good)';
            break;
        case 'fair':
            statusColor = 'var(--health-fair)';
            break;
        case 'poor':
            statusColor = 'var(--health-poor)';
            break;
        default:
            statusColor = 'var(--health-good)';
    }
    
    scoreCircle.style.stroke = statusColor;
    statusBadge.style.color = statusColor;
    statusBadge.textContent = data.status;
    
    // Show issues if any
    if (data.issues && data.issues.length > 0) {
        issuesText.textContent = data.issues.join(', ');
    } else {
        issuesText.textContent = 'No issues detected';
    }
}

// Load weather information
function loadWeatherInfo() {
    fetch('/api/weather')
        .then(response => response.json())
        .then(data => {
            updateWeatherInfo(data);
        })
        .catch(error => {
            console.error('Error loading weather info:', error);
        });
}

// Update weather display
function updateWeatherInfo(data) {
    if (data.available) {
        document.getElementById('weather-location').textContent = data.location;
        document.getElementById('weather-temp').textContent = `${data.temperature}°C`;
        document.getElementById('weather-condition').textContent = data.condition;
        document.getElementById('weather-humidity').textContent = `${data.humidity}%`;
        document.getElementById('weather-wind').textContent = `${data.wind_speed} m/s`;
        
        // Show the weather card
        document.getElementById('weather-card').style.opacity = '1';
    } else {
        // Show placeholder data
        document.getElementById('weather-location').textContent = 'Not available';
        document.getElementById('weather-temp').textContent = '--°C';
        document.getElementById('weather-condition').textContent = 'Weather data unavailable';
        document.getElementById('weather-humidity').textContent = '--%';
        document.getElementById('weather-wind').textContent = '-- m/s';
    }
}

// Set up Socket.IO event listeners
function setupSocketEvents() {
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Get initial data
        socket.emit('get_data');
        
        // Update last refresh time
        document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // System info updates
    socket.on('system_info', (data) => {
        updateSystemInfo(data);
        // Also update health since it's related
        loadHealthStatus();
    });
    
    // CPU updates
    socket.on('cpu_info', (data) => {
        updateCPUInfo(data);
        updateCPUHeatmap(data);
        
        // Only update chart data if we're using charts
        if (realtimeChart) {
            // Update realtime chart data
            const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            chartData.labels.push(timestamp);
            chartData.cpuData.push(parseFloat(data.total_usage.replace('%', '')));
            
            // Keep only the last 30 data points
            if (chartData.labels.length > 30) {
                chartData.labels.shift();
                chartData.cpuData.shift();
            }
            
            updateRealtimeChart();
        }
    });
    
    // Memory updates
    socket.on('memory_info', (data) => {
        updateMemoryInfo(data);
        
        // Only update chart data if we're using charts
        if (realtimeChart) {
            // Update realtime chart data
            const memoryPercent = parseFloat(data.percentage.replace('%', ''));
            chartData.memoryData.push(memoryPercent);
            
            // Keep only the last 30 data points
            if (chartData.memoryData.length > 30) {
                chartData.memoryData.shift();
            }
            
            updateRealtimeChart();
        }
    });
    
    // Disk updates
    socket.on('disk_info', (data) => {
        updateDiskInfo(data);
    });
    
    // Network updates
    socket.on('network_info', (data) => {
        updateNetworkInfo(data);
    });
    
    // Process updates
    socket.on('process_info', (data) => {
        if (data && data.processes) {
            updateProcessTable(data.processes);
        }
    });
    
    // Get regular data updates
    setInterval(() => {
        socket.emit('get_data');
        
        // Periodically refresh non-socket data
        loadHealthStatus(); 
        loadWeatherInfo(); // Weather doesn't need to update as frequently, but we'll do it anyway
        
        // Update last refresh time
        document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
    }, 5000); // Update every 5 seconds
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Update quick stats display
function updateQuickStats(cpuData, memoryData) {
    // Update CPU quick stat
    const cpuUsage = parseFloat(cpuData.total_usage.replace('%', ''));
    document.getElementById('quick-cpu').textContent = `${cpuUsage.toFixed(1)}%`;
    
    // Update memory quick stat
    const memUsage = parseFloat(memoryData.percentage.replace('%', ''));
    document.getElementById('quick-memory').textContent = `${memUsage.toFixed(1)}%`;
    
    // Update disk usage if available
    const diskEl = document.getElementById('quick-disk');
    if (diskEl.getAttribute('data-updated') !== 'true') {
        fetch('/api/disk')
            .then(response => response.json())
            .then(data => {
                if (data.partitions && data.partitions.length > 0) {
                    // Use the root partition or first partition
                    const rootPartition = data.partitions.find(p => p.mountpoint === '/') || data.partitions[0];
                    if (rootPartition && rootPartition.percentage) {
                        diskEl.textContent = rootPartition.percentage;
                        diskEl.setAttribute('data-updated', 'true');
                    }
                }
            });
    }
    
    // Update network stat if available
    const networkEl = document.getElementById('quick-network');
    if (networkEl && networkEl.getAttribute('data-updated') !== 'true') {
        fetch('/api/network')
            .then(response => response.json())
            .then(data => {
                networkEl.textContent = data.bytes_received;
                networkEl.setAttribute('data-updated', 'true');
            });
    }
    
    // Update processes count if available
    const processesEl = document.getElementById('quick-processes');
    if (processesEl.getAttribute('data-updated') !== 'true') {
        fetch('/api/processes')
            .then(response => response.json())
            .then(data => {
                processesEl.textContent = data.length;
                processesEl.setAttribute('data-updated', 'true');
            });
    }
}

// Load system information
function loadSystemInfo() {
    fetch('/api/system')
        .then(response => response.json())
        .then(data => {
            // Store boot time for uptime calculations
            bootTime = new Date(data.boot_time);
        })
        .catch(error => console.error('Error fetching system info:', error));
}

// Load CPU information
function loadCPUInfo() {
    fetch('/api/cpu')
        .then(response => response.json())
        .then(data => {
            updateCPUInfo(data);
            updateCPUHeatmap(data);
        })
        .catch(error => {
            console.error('Error loading CPU info:', error);
        });
}

// Update CPU information
function updateCPUInfo(data) {
    // Update physical and total cores
    document.getElementById('physical-cores').textContent = data.physical_cores;
    document.getElementById('total-cores').textContent = data.total_cores;
    document.getElementById('total-cores-detail').textContent = data.total_cores;
    
    // Update frequencies
    let freqText = 'N/A';
    if (data.raw_frequencies && data.raw_frequencies.current) {
        freqText = `${(data.raw_frequencies.current / 1000).toFixed(2)} GHz`;
        if (data.raw_frequencies.min && data.raw_frequencies.max) {
            freqText += ` (Range: ${(data.raw_frequencies.min / 1000).toFixed(1)}-${(data.raw_frequencies.max / 1000).toFixed(1)} GHz)`;
        }
    }
    document.getElementById('current-frequency').textContent = freqText;
    document.getElementById('frequency-detail').textContent = freqText;
    
    // Update CPU usage
    const cpuUsage = parseFloat(data.total_usage.replace('%', ''));
    document.getElementById('cpu-usage-badge').textContent = data.total_usage;
    document.getElementById('quick-cpu').textContent = data.total_usage;
    
    // Update CPU temperature
    if (data.temperature && data.temperature !== 'N/A') {
        // Update temperature values in all locations
        const tempValue = data.temperature;
        if (document.getElementById('cpu-badge-temperature')) {
            document.getElementById('cpu-badge-temperature').textContent = `Temp: ${tempValue}`;
        }
        if (document.getElementById('cpu-badge-temperature-value')) {
            document.getElementById('cpu-badge-temperature-value').textContent = tempValue;
        }
        document.getElementById('cpu-temp').textContent = tempValue;
        document.getElementById('cpu-quick-temp').textContent = tempValue;
        
        // Show temperature element
        document.getElementById('cpu-temp-small').style.display = 'block';
    } else {
        // Set default values when temperature is not available
        if (document.getElementById('cpu-badge-temperature')) {
            document.getElementById('cpu-badge-temperature').textContent = 'Temp: N/A';
        }
        if (document.getElementById('cpu-badge-temperature-value')) {
            document.getElementById('cpu-badge-temperature-value').textContent = 'N/A';
        }
        document.getElementById('cpu-temp').textContent = 'N/A';
        document.getElementById('cpu-quick-temp').textContent = 'N/A';
        
        // Hide temperature element if not available
        document.getElementById('cpu-temp-small').style.display = 'none';
    }
    
    // Update CPU gauge
    updateCPUGauge(cpuUsage);
    
    // Update core usage bars
    if (data.raw_usage_per_core && data.raw_usage_per_core.length > 0) {
        updateCoreUsageBars(data.raw_usage_per_core);
    }
    
    // Update progress bar in the quick view
    document.getElementById('cpu-quick-progress').style.width = `${cpuUsage}%`;
    
    // Pulse animation for updates
    document.getElementById('cpu-section').classList.add('pulse-update');
    setTimeout(() => {
        document.getElementById('cpu-section').classList.remove('pulse-update');
    }, 1000);
}

// Update CPU gauge
function updateCPUGauge(cpuUsage) {
    // Skip if chart is removed/disabled
    if (!cpuGaugeChart) {
        // Update the text value instead
        const tempElement = document.getElementById('cpu-badge-temperature-value');
        if (tempElement) {
            // Get value from quick-temp since badge-temperature might be gone
            const tempValue = document.getElementById('cpu-quick-temp').textContent;
            tempElement.textContent = tempValue;
        }
        
        const loadElement = document.getElementById('cpu-badge-load-value');
        if (loadElement) {
            // Use load average value from system data
            fetch('/api/system')
                .then(response => response.json())
                .then(data => {
                    if (data && data.load_avg) {
                        loadElement.textContent = data.load_avg['1min'] || '0.00';
                    } else {
                        loadElement.textContent = '0.00';
                    }
                })
                .catch(() => {
                    loadElement.textContent = '0.00';
                });
        }
        return;
    }

    // Update the chart if it exists
    cpuGaugeChart.data.datasets[0].data = [cpuUsage, 100 - cpuUsage];
    cpuGaugeChart.update();
}

// Create and update the CPU core heatmap
function updateCPUHeatmap(data) {
    if (!data.raw_usage_per_core || data.raw_usage_per_core.length === 0) {
        return;
    }
    
    const heatmapContainer = document.getElementById('cpu-heatmap');
    heatmapContainer.innerHTML = ''; // Clear existing content
    
    data.raw_usage_per_core.forEach((usage, index) => {
        // Create a core cell
        const coreCell = document.createElement('div');
        coreCell.className = 'cpu-core-cell';
        
        // Add core number
        const coreNumber = document.createElement('div');
        coreNumber.className = 'cpu-core-number';
        coreNumber.textContent = `Core ${index}`;
        
        // Add usage value
        const coreUsage = document.createElement('div');
        coreUsage.className = 'cpu-core-usage';
        coreUsage.textContent = `${usage.toFixed(1)}%`;
        
        // Append elements
        coreCell.appendChild(coreNumber);
        coreCell.appendChild(coreUsage);
        
        // Add class based on usage for color
        if (usage > 85) {
            coreCell.classList.add('high');
        } else if (usage > 50) {
            coreCell.classList.add('medium');
        } else {
            coreCell.classList.add('low');
        }
        
        // Add to container
        heatmapContainer.appendChild(coreCell);
        
        // Set the fill height directly using style
        setTimeout(() => {
            const afterElement = window.getComputedStyle(coreCell, '::after');
            if (afterElement) {
                coreCell.style.setProperty('--fill-height', `${usage}%`);
                // Apply inline style since pseudo-elements can't be directly manipulated
                coreCell.style.background = `linear-gradient(to top, ${getHeatmapColor(usage)} ${usage}%, transparent ${usage}%)`;
            }
        }, 0);
    });
}

// Get appropriate color for CPU usage heat
function getHeatmapColor(usage) {
    if (usage > 85) {
        return 'var(--cpu-hot)';
    } else if (usage > 50) {
        return 'var(--cpu-warm)';
    } else {
        return 'var(--cpu-cool)';
    }
}

// Update core usage bars
function updateCoreUsageBars(coreUsages) {
    const coreContainer = document.getElementById('core-usage-container');
    coreContainer.innerHTML = ''; // Clear existing content
    
    coreUsages.forEach((usage, index) => {
        // Create core usage element
        const coreElement = document.createElement('div');
        coreElement.className = 'core-usage-item';
        
        // Create label
        const coreLabel = document.createElement('div');
        coreLabel.className = 'core-label';
        
        const coreName = document.createElement('span');
        coreName.textContent = `Core ${index}`;
        
        const coreValue = document.createElement('span');
        coreValue.textContent = `${usage.toFixed(1)}%`;
        
        coreLabel.appendChild(coreName);
        coreLabel.appendChild(coreValue);
        
        // Create progress bar
        const coreProgressContainer = document.createElement('div');
        coreProgressContainer.className = 'core-progress';
        
        const coreProgressBar = document.createElement('div');
        coreProgressBar.className = 'progress-bar';
        coreProgressBar.style.width = `${usage}%`;
        
        // Set color based on usage
        if (usage > 85) {
            coreProgressBar.classList.add('bg-danger');
        } else if (usage > 50) {
            coreProgressBar.classList.add('bg-warning');
        } else {
            coreProgressBar.classList.add('bg-success');
        }
        
        coreProgressContainer.appendChild(coreProgressBar);
        
        // Assemble the elements
        coreElement.appendChild(coreLabel);
        coreElement.appendChild(coreProgressContainer);
        
        // Add to container
        coreContainer.appendChild(coreElement);
    });
}

// Load memory information
function loadMemoryInfo() {
    fetch('/api/memory')
        .then(response => response.json())
        .then(data => {
            updateMemoryInfo(data);
        })
        .catch(error => {
            console.error('Error loading memory info:', error);
        });
}

// Update memory information display
function updateMemoryInfo(data) {
    try {
        // Update total, used, available memory
        document.getElementById('memory-total').textContent = data.total;
        document.getElementById('memory-used').textContent = data.used;
        document.getElementById('memory-available').textContent = data.available;
        document.getElementById('total-memory-quick').textContent = data.total;
        document.getElementById('used-memory-quick').textContent = data.used;
        
        // Update memory usage percentage
        const memoryPercent = parseFloat(data.percentage.replace('%', ''));
        document.getElementById('memory-usage-badge').textContent = data.percentage;
        document.getElementById('quick-memory').textContent = data.percentage;
        document.getElementById('memory-progress').style.width = data.percentage;
        document.getElementById('memory-progress-label').textContent = data.percentage;
        
        // Optional element that might have been removed in the HTML
        const availableBadge = document.getElementById('memory-badge-available');
        if (availableBadge) {
            availableBadge.textContent = `Available: ${data.available}`;
        }
        
        // Update memory quick progress
        document.getElementById('memory-quick-progress').style.width = data.percentage;
        document.getElementById('quick-memory-used').textContent = data.used;
        
        // Update swap information
        document.getElementById('swap-total').textContent = data.swap_total;
        document.getElementById('swap-used').textContent = data.swap_used;
        document.getElementById('swap-progress').style.width = data.swap_percentage;
        document.getElementById('swap-progress-label').textContent = data.swap_percentage;
        document.getElementById('swap-usage').textContent = data.swap_percentage;
        document.getElementById('swap-quick').textContent = data.swap_percentage;
        
        // Update swap activity
        document.getElementById('swap-in').textContent = data.swap_sin || '0 MB';
        document.getElementById('swap-out').textContent = data.swap_sout || '0 MB';

        // Update memory chart
        if (memoryChart) {
            updateMemoryChart(memoryPercent, 100 - memoryPercent);
        }
        
        // Update memory breakdown chart
        if (memoryBreakdownChart && data.raw_values) {
            updateMemoryBreakdownChart(data.raw_values);
        }
        
        // Pulse animation for updates
        document.getElementById('memory-section').classList.add('pulse-update');
        setTimeout(() => {
            document.getElementById('memory-section').classList.remove('pulse-update');
        }, 1000);
    } catch (error) {
        console.error('Error updating memory info:', error);
    }
}

// Update memory chart
function updateMemoryChart(used, available) {
    // Skip if chart is removed/disabled
    if (!memoryChart) return;
    
    memoryChart.data.datasets[0].data = [used, available];
    memoryChart.update();
}

// Update memory breakdown chart
function updateMemoryBreakdownChart(data) {
    // Skip if chart is removed/disabled
    if (!memoryBreakdownChart) {
        // Update the text values instead
        const usedElement = document.getElementById('memory-allocation-used');
        if (usedElement) {
            usedElement.textContent = (data.used / 1024).toFixed(2) + ' GB';
        }
        
        const cachedElement = document.getElementById('memory-allocation-cached');
        if (cachedElement) {
            cachedElement.textContent = (data.cached / 1024).toFixed(2) + ' GB';
        }
        
        const buffersElement = document.getElementById('memory-allocation-buffers');
        if (buffersElement) {
            buffersElement.textContent = (data.buffers / 1024).toFixed(2) + ' GB';
        }
        return;
    }
    
    memoryBreakdownChart.data.datasets[0].data = [
        data.used / 1024,      // Convert to GB
        data.buffers / 1024,
        data.cached / 1024,
        data.free / 1024
    ];
    memoryBreakdownChart.update();
}

// Load disk information
function loadDiskInfo() {
    fetch('/api/disk')
        .then(response => response.json())
        .then(data => {
            updateDiskInfo(data);
        })
        .catch(error => console.error('Error fetching disk info:', error));
}

// Update disk information in the UI
function updateDiskInfo(data) {
    // Update disk I/O stats
    if (data.read_since_boot) {
        document.getElementById('total-read').textContent = data.read_since_boot;
    }
    if (data.write_since_boot) {
        document.getElementById('total-write').textContent = data.write_since_boot;
    }
    
    // Update partition cards
    const partitionsContainer = document.getElementById('disk-partitions');
    partitionsContainer.innerHTML = '';
    
    data.partitions.forEach(partition => {
        // Create column
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-6 col-xl-4 mb-3';
        
        // Create card
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card partition-card h-100';
        
        // Create card body
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        // Create device icon based on mountpoint
        let iconClass = 'fas fa-hdd';
        if (partition.mountpoint === '/' || partition.mountpoint.startsWith('/boot')) {
            iconClass = 'fas fa-server';
        } else if (partition.mountpoint.includes('home')) {
            iconClass = 'fas fa-home';
        } else if (partition.mountpoint.includes('media') || partition.mountpoint.includes('mnt')) {
            iconClass = 'fas fa-external-link-alt';
        }
        
        // Create card title with icon
        const cardTitle = document.createElement('h5');
        cardTitle.className = 'card-title d-flex align-items-center';
        cardTitle.innerHTML = `<i class="${iconClass} me-2"></i> ${partition.device || 'Unknown'}`;
        
        // Create mountpoint subtitle
        const cardSubtitle = document.createElement('h6');
        cardSubtitle.className = 'card-subtitle mb-2 text-muted';
        cardSubtitle.textContent = partition.mountpoint;
        
        // Create filesystem type
        const fsType = document.createElement('p');
        fsType.className = 'mb-3 small';
        fsType.textContent = `Filesystem: ${partition.filesystem_type || 'Unknown'}`;
        
        // Create progress bar if we have usage data
        let progressDiv = null;
        if (!partition.error && partition.raw_values) {
            const usageText = document.createElement('div');
            usageText.className = 'progress-label mb-2';
            usageText.innerHTML = `<span>Used: <strong>${partition.used}</strong> / <strong>${partition.total_size}</strong></span><span>Free: <strong>${partition.free}</strong></span>`;
            
            progressDiv = document.createElement('div');
            progressDiv.className = 'progress';
            
            const progressBarDiv = document.createElement('div');
            progressBarDiv.className = 'progress-bar';
            const usageValue = parseFloat(partition.percentage);
            progressBarDiv.style.width = partition.percentage;
            progressBarDiv.setAttribute('role', 'progressbar');
            progressBarDiv.setAttribute('aria-valuenow', usageValue);
            progressBarDiv.setAttribute('aria-valuemin', '0');
            progressBarDiv.setAttribute('aria-valuemax', '100');
            
            // Set progress bar color based on usage
            if (usageValue < 50) {
                progressBarDiv.classList.add('bg-success');
            } else if (usageValue < 80) {
                progressBarDiv.classList.add('bg-warning');
            } else {
                progressBarDiv.classList.add('bg-danger');
            }
            
            progressDiv.appendChild(progressBarDiv);
            
            // Assemble card with progress bar
            cardBody.appendChild(cardTitle);
            cardBody.appendChild(cardSubtitle);
            cardBody.appendChild(fsType);
            cardBody.appendChild(usageText);
            cardBody.appendChild(progressDiv);
        } else {
            // Assemble card without progress bar
            const errorText = document.createElement('p');
            errorText.className = 'text-danger';
            errorText.textContent = partition.error || 'No usage data available';
            
            cardBody.appendChild(cardTitle);
            cardBody.appendChild(cardSubtitle);
            cardBody.appendChild(fsType);
            cardBody.appendChild(errorText);
        }
        
        cardDiv.appendChild(cardBody);
        colDiv.appendChild(cardDiv);
        partitionsContainer.appendChild(colDiv);
    });
}

// Load network information
function loadNetworkInfo() {
    fetch('/api/network')
        .then(response => response.json())
        .then(data => {
            updateNetworkInfo(data);
        })
        .catch(error => console.error('Error fetching network info:', error));
}

// Update network information in the UI
function updateNetworkInfo(data) {
    // Update network stats
    document.getElementById('bytes-sent').textContent = data.bytes_sent;
    document.getElementById('bytes-received').textContent = data.bytes_received;
    
    // Update network interfaces
    const interfacesContainer = document.getElementById('network-interfaces');
    interfacesContainer.innerHTML = '';
    
    data.interfaces.forEach((netInterface, index) => {
        // Create accordion item
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        
        // Create accordion header
        const headerDiv = document.createElement('h2');
        headerDiv.className = 'accordion-header';
        headerDiv.id = `heading-${index}`;
        
        // Choose appropriate icon based on interface name
        let iconClass = 'fas fa-network-wired';
        if (netInterface.name.includes('wl') || netInterface.name.includes('wifi')) {
            iconClass = 'fas fa-wifi';
        } else if (netInterface.name.includes('lo')) {
            iconClass = 'fas fa-sync-alt';
        } else if (netInterface.name.includes('docker') || netInterface.name.includes('veth')) {
            iconClass = 'fab fa-docker';
        } else if (netInterface.name.includes('tun') || netInterface.name.includes('vpn')) {
            iconClass = 'fas fa-shield-alt';
        }
        
        const button = document.createElement('button');
        button.className = `accordion-button ${index === 0 ? '' : 'collapsed'}`;
        button.type = 'button';
        button.setAttribute('data-bs-toggle', 'collapse');
        button.setAttribute('data-bs-target', `#collapse-${index}`);
        button.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
        button.setAttribute('aria-controls', `collapse-${index}`);
        
        const statusBadge = document.createElement('span');
        statusBadge.className = netInterface.isup === 'Up' ? 'badge bg-success ms-2' : 'badge bg-danger ms-2';
        statusBadge.textContent = netInterface.isup;
        
        button.innerHTML = `<i class="${iconClass} me-2"></i> ${netInterface.name} <span class="ms-2">${statusBadge.outerHTML}</span>`;
        
        headerDiv.appendChild(button);
        
        // Create accordion body
        const collapseDiv = document.createElement('div');
        collapseDiv.id = `collapse-${index}`;
        collapseDiv.className = `accordion-collapse collapse ${index === 0 ? 'show' : ''}`;
        collapseDiv.setAttribute('aria-labelledby', `heading-${index}`);
        collapseDiv.setAttribute('data-bs-parent', '#network-interfaces');
        
        const accordionBody = document.createElement('div');
        accordionBody.className = 'accordion-body';
        
        // Add interface details
        const speedItem = document.createElement('p');
        speedItem.innerHTML = `<i class="fas fa-tachometer-alt me-2"></i> <strong>Speed:</strong> ${netInterface.speed}`;
        accordionBody.appendChild(speedItem);
        
        // Add IP addresses
        if (netInterface.addresses && netInterface.addresses.length > 0) {
            const addressesTitle = document.createElement('p');
            addressesTitle.className = 'mb-2';
            addressesTitle.innerHTML = '<i class="fas fa-sitemap me-2"></i> <strong>IP Addresses:</strong>';
            accordionBody.appendChild(addressesTitle);
            
            const addressTable = document.createElement('table');
            addressTable.className = 'table table-sm table-bordered';
            
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>IP Address</th><th>Netmask</th></tr>';
            addressTable.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            netInterface.addresses.forEach(addr => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${addr.ip}</td><td>${addr.netmask || 'N/A'}</td>`;
                tbody.appendChild(row);
            });
            
            addressTable.appendChild(tbody);
            accordionBody.appendChild(addressTable);
        } else {
            const noAddress = document.createElement('p');
            noAddress.textContent = 'No IP addresses available';
            accordionBody.appendChild(noAddress);
        }
        
        collapseDiv.appendChild(accordionBody);
        
        // Assemble accordion item
        accordionItem.appendChild(headerDiv);
        accordionItem.appendChild(collapseDiv);
        interfacesContainer.appendChild(accordionItem);
    });
}

// Load process information
function loadProcessInfo() {
    fetch('/api/processes')
        .then(response => response.json())
        .then(data => {
            if (data && data.processes) {
                updateProcessTable(data.processes);
            }
        })
        .catch(error => {
            console.error('Error loading process info:', error);
        });
}

// Update process table with the latest data
function updateProcessTable(processes) {
    const tableBody = document.getElementById('process-table-body');
    tableBody.innerHTML = ''; // Clear existing rows
    
    // Apply active filter
    let filteredProcesses = processes;
    
    switch(activeProcessFilter) {
        case 'active':
            filteredProcesses = processes.filter(p => p.cpu_percent > 0);
            break;
        case 'memory':
            filteredProcesses = processes.filter(p => p.memory_percent > 1);
            break;
        case 'system':
            filteredProcesses = processes.filter(p => p.username === 'root' || p.username === 'system');
            break;
        case 'user':
            filteredProcesses = processes.filter(p => p.username !== 'root' && p.username !== 'system');
            break;
        default:
            // 'all', no filter
            break;
    }
    
    // Update the process count
    document.getElementById('process-count').textContent = `${filteredProcesses.length} processes`;
    document.getElementById('quick-processes').textContent = filteredProcesses.length;

    // Sort the processes based on current sort column and direction
    filteredProcesses.sort((a, b) => {
        let valA, valB;
        
        switch(sortColumn) {
            case 0: // PID
                valA = a.pid;
                valB = b.pid;
                break;
            case 1: // Name
                valA = a.name;
                valB = b.name;
                break;
            case 2: // User
                valA = a.username;
                valB = b.username;
                break;
            case 3: // Status
                valA = a.status;
                valB = b.status;
                break;
            case 4: // CPU%
                valA = a.cpu_percent;
                valB = b.cpu_percent;
                break;
            case 5: // Memory%
                valA = a.memory_percent;
                valB = b.memory_percent;
                break;
            case 6: // Memory MB
                valA = a.memory_mb || 0;
                valB = b.memory_mb || 0;
                break;
            case 7: // Threads
                valA = a.threads;
                valB = b.threads;
                break;
            case 8: // Files
                valA = a.open_files || 0;
                valB = b.open_files || 0;
                break;
            case 9: // Created
                valA = a.created;
                valB = b.created;
                break;
            default:
                valA = a.pid;
                valB = b.pid;
        }
        
        // Compare based on data type
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortDirection * valA.localeCompare(valB);
        } else {
            return sortDirection * (valA - valB);
        }
    });

    // Apply search filter
    const searchTerm = document.getElementById('process-search').value.toLowerCase();
    if (searchTerm) {
        filteredProcesses = filteredProcesses.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.username.toLowerCase().includes(searchTerm) || 
            p.pid.toString().includes(searchTerm)
        );
    }
    
    // Create table rows for processes
    filteredProcesses.forEach(process => {
        const row = document.createElement('tr');
        row.setAttribute('data-pid', process.pid);
        
        // Add row click event to show details
        row.addEventListener('click', function() {
            showProcessDetails(process);
        });
        
        // PID
        const pidCell = document.createElement('td');
        pidCell.textContent = process.pid;
        
        // Name
        const nameCell = document.createElement('td');
        nameCell.textContent = process.name;
        
        // User
        const userCell = document.createElement('td');
        userCell.textContent = process.username;
        
        // Status
        const statusCell = document.createElement('td');
        let statusBadgeClass = 'bg-secondary';
        switch(process.status) {
            case 'running':
                statusBadgeClass = 'bg-success';
                break;
            case 'sleeping':
                statusBadgeClass = 'bg-info';
                break;
            case 'stopped':
                statusBadgeClass = 'bg-warning';
                break;
            case 'zombie':
                statusBadgeClass = 'bg-danger';
                break;
        }
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${statusBadgeClass}`;
        statusBadge.textContent = process.status;
        statusCell.appendChild(statusBadge);
        
        // CPU %
        const cpuCell = document.createElement('td');
        cpuCell.textContent = `${process.cpu_percent}%`;
        if (process.cpu_percent > 50) {
            cpuCell.className = 'text-danger fw-bold';
        } else if (process.cpu_percent > 10) {
            cpuCell.className = 'text-warning';
        }
        
        // Memory %
        const memPercentCell = document.createElement('td');
        memPercentCell.textContent = `${process.memory_percent}%`;
        
        // Memory MB
        const memMbCell = document.createElement('td');
        if (process.memory_mb !== undefined) {
            memMbCell.textContent = `${process.memory_mb.toFixed(1)} MB`;
        } else {
            memMbCell.textContent = 'N/A';
        }
        
        // Threads
        const threadsCell = document.createElement('td');
        threadsCell.textContent = process.threads;
        
        // Open Files
        const filesCell = document.createElement('td');
        filesCell.textContent = process.open_files || 'N/A';
        
        // Started
        const startedCell = document.createElement('td');
        startedCell.textContent = process.created;
        startedCell.className = 'text-nowrap';
        
        // Append cells to row
        row.appendChild(pidCell);
        row.appendChild(nameCell);
        row.appendChild(userCell);
        row.appendChild(statusCell);
        row.appendChild(cpuCell);
        row.appendChild(memPercentCell);
        row.appendChild(memMbCell);
        row.appendChild(threadsCell);
        row.appendChild(filesCell);
        row.appendChild(startedCell);
        
        // Append row to table
        tableBody.appendChild(row);
    });
}

// Filter the process table based on search input
function filterProcessTable() {
    // Reload processes to apply filter
    loadProcessInfo();
}

// Process details view
function showProcessDetails(process) {
    const detailsContainer = document.getElementById('process-details');
    const contentContainer = document.getElementById('process-details-content');
    
    // Make sure details are visible
    detailsContainer.classList.remove('d-none');
    contentContainer.innerHTML = '';
    
    // Create detail cards
    const details = [
        { label: 'PID', value: process.pid },
        { label: 'Name', value: process.name },
        { label: 'User', value: process.username },
        { label: 'Status', value: process.status },
        { label: 'CPU Usage', value: `${process.cpu_percent}%` },
        { label: 'Memory Usage', value: `${process.memory_percent}%` },
        { label: 'Memory (MB)', value: process.memory_mb ? `${process.memory_mb.toFixed(1)} MB` : 'N/A' },
        { label: 'Threads', value: process.threads },
        { label: 'Open Files', value: process.open_files || 'N/A' },
        { label: 'Connections', value: process.connections || 'N/A' },
        { label: 'Created', value: process.created },
        { label: 'Command', value: process.cmdline || 'N/A' }
    ];
    
    // Create columns in a row
    details.forEach(detail => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';
        
        const card = document.createElement('div');
        card.className = 'process-detail-card';
        
        const label = document.createElement('div');
        label.className = 'detail-label';
        label.textContent = detail.label;
        
        const value = document.createElement('div');
        value.className = 'detail-value';
        value.textContent = detail.value;
        
        card.appendChild(label);
        card.appendChild(value);
        col.appendChild(card);
        contentContainer.appendChild(col);
    });
    
    // Scroll to show the details
    detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Sort the process table by column
function sortProcessTable(column) {
    // Toggle sort direction if clicking the same column
    if (sortColumn === column) {
        sortDirection *= -1;
    } else {
        sortColumn = column;
        sortDirection = 1;
    }
    
    // Update sorted column visual indicators
    const headers = document.querySelectorAll('.process-table th');
    headers.forEach((header, idx) => {
        const icon = header.querySelector('i.fas');
        if (idx === column) {
            header.classList.add(sortDirection === 1 ? 'sorted-asc' : 'sorted-desc');
            icon.className = `fas fa-sort-${sortDirection === 1 ? 'up' : 'down'}`;
        } else {
            header.classList.remove('sorted-asc', 'sorted-desc');
            icon.className = 'fas fa-sort';
        }
    });
    
    // Re-load processes with new sort
    loadProcessInfo();
}

// Update realtime chart with new data
function updateRealtimeChart() {
    // Skip if chart is removed/disabled
    if (!realtimeChart) {
        return;
    }
    
    try {
        // Get active chart type if the selector exists
        let chartType = 'cpu-memory'; // default
        const selector = document.querySelector('#chart-type-selector');
        if (selector) {
            const activeButton = selector.querySelector('.btn.active');
            if (activeButton) {
                chartType = activeButton.getAttribute('data-chart') || chartType;
            }
        }
        
        // Update chart based on type
        realtimeChart.data.labels = chartData.labels;
        
        // Clear current datasets
        realtimeChart.data.datasets = [];
        
        switch(chartType) {
            case 'cpu-memory':
                realtimeChart.data.datasets.push({
                    label: 'CPU Usage (%)',
                    data: chartData.cpuData,
                    borderColor: '#fa5252',
                    backgroundColor: 'rgba(250, 82, 82, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Memory Usage (%)',
                    data: chartData.memoryData,
                    borderColor: '#40c057',
                    backgroundColor: 'rgba(64, 192, 87, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                
                // Update y-axis to percentage
                realtimeChart.options.scales.y.title.text = 'Usage %';
                realtimeChart.options.scales.y.max = 100;
                break;
                
            case 'disk':
                realtimeChart.data.datasets.push({
                    label: 'Disk Read (MB/s)',
                    data: chartData.diskReadData,
                    borderColor: '#4dabf7',
                    backgroundColor: 'rgba(77, 171, 247, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Disk Write (MB/s)',
                    data: chartData.diskWriteData,
                    borderColor: '#fcc419',
                    backgroundColor: 'rgba(252, 196, 25, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                
                // Update y-axis to MB/s
                realtimeChart.options.scales.y.title.text = 'MB/s';
                realtimeChart.options.scales.y.max = null;
                break;
                
            case 'network':
                realtimeChart.data.datasets.push({
                    label: 'Upload (KB/s)',
                    data: chartData.netUploadData,
                    borderColor: '#7950f2',
                    backgroundColor: 'rgba(121, 80, 242, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Download (KB/s)',
                    data: chartData.netDownloadData,
                    borderColor: '#15aabf',
                    backgroundColor: 'rgba(21, 170, 191, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    fill: true,
                    tension: 0.3
                });
                
                // Update y-axis to KB/s
                realtimeChart.options.scales.y.title.text = 'KB/s';
                realtimeChart.options.scales.y.max = null;
                break;
                
            case 'all':
                // Show all metrics together
                realtimeChart.data.datasets.push({
                    label: 'CPU Usage (%)',
                    data: chartData.cpuData,
                    borderColor: '#fa5252',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 1,
                    yAxisID: 'percentage',
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Memory Usage (%)',
                    data: chartData.memoryData,
                    borderColor: '#40c057',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 1,
                    yAxisID: 'percentage',
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Disk I/O (MB/s)',
                    data: chartData.diskReadData.map((v, i) => v + (chartData.diskWriteData[i] || 0)),
                    borderColor: '#fcc419',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 1,
                    yAxisID: 'bytes',
                    tension: 0.3
                });
                realtimeChart.data.datasets.push({
                    label: 'Network (KB/s)',
                    data: chartData.netUploadData.map((v, i) => v + (chartData.netDownloadData[i] || 0)),
                    borderColor: '#15aabf',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 1,
                    yAxisID: 'bytes',
                    tension: 0.3
                });
                break;
        }
        
        realtimeChart.update();
    } catch (error) {
        console.error('Error updating realtime chart:', error);
    }
}

// Update time displays
function updateTime() {
    const now = new Date();
    
    // Update navbar time
    document.getElementById('live-time').textContent = now.toLocaleTimeString();
    
    // Update time widget
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Calculate and update uptime if we have boot time
    if (bootTime) {
        const uptimeSeconds = Math.floor((now.getTime() - new Date(bootTime).getTime()) / 1000);
        document.getElementById('uptime').textContent = formatUptime(uptimeSeconds);
    }
}

// Format uptime in days, hours, minutes, seconds
function formatUptime(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    
    let uptimeString = '';
    if (days > 0) {
        uptimeString += `${days}d `;
    }
    if (hours > 0 || days > 0) {
        uptimeString += `${hours}h `;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        uptimeString += `${minutes}m `;
    }
    uptimeString += `${seconds}s`;
    
    return uptimeString;
}

// Update system information
function updateSystemInfo(data) {
    // Store boot time for uptime calculations
    if (data.boot_time) {
        bootTime = new Date(data.boot_time);
    }
    
    // Update system information in the UI
    if (data.hostname) {
        document.getElementById('logged-users').textContent = data.users_logged_in || '0';
        document.getElementById('users-count').textContent = data.users_logged_in || '0';
    }
    
    // Update load averages if available
    if (data.load_avg) {
        const loadAvgText = `${data.load_avg['1min']} | ${data.load_avg['5min']} | ${data.load_avg['15min']}`;
        document.getElementById('load-averages').textContent = loadAvgText;
        document.getElementById('load-avg').textContent = data.load_avg['1min'];
    }
} 