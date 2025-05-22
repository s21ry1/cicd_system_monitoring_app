#!/usr/bin/env python3
import time
import json
import psutil
import platform
import socket
import os
import subprocess
import logging
import requests
from datetime import datetime
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('system_monitor')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'systemmonitor2023!' # In production, use environment variable
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Cache for storing last values for rate calculations
last_disk_io = None
last_network_io = None
last_check_time = None

# Health threshold constants
HEALTH_THRESHOLDS = {
    'cpu': {
        'good': 70,
        'warning': 85
    },
    'memory': {
        'good': 70,
        'warning': 85
    },
    'temperature': {
        'good': 70,
        'warning': 85
    },
    'disk': {
        'good': 70,
        'warning': 85
    }
}

# Calculate system health score (0-100)
def calculate_health_score():
    try:
        health = {
            'score': 100,
            'status': 'Excellent',
            'issues': []
        }
        
        # CPU usage penalty
        cpu_usage = psutil.cpu_percent()
        if cpu_usage > HEALTH_THRESHOLDS['cpu']['warning']:
            health['score'] -= 20
            health['issues'].append('High CPU usage')
        elif cpu_usage > HEALTH_THRESHOLDS['cpu']['good']:
            health['score'] -= 10
            health['issues'].append('Elevated CPU usage')
        
        # Memory usage penalty
        memory = psutil.virtual_memory()
        if memory.percent > HEALTH_THRESHOLDS['memory']['warning']:
            health['score'] -= 20
            health['issues'].append('High memory usage')
        elif memory.percent > HEALTH_THRESHOLDS['memory']['good']:
            health['score'] -= 10
            health['issues'].append('Elevated memory usage')
        
        # Temperature check (if available)
        try:
            if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
                with open('/sys/class/thermal/thermal_zone0/temp') as f:
                    temp = int(f.read().strip()) / 1000
                    if temp > HEALTH_THRESHOLDS['temperature']['warning']:
                        health['score'] -= 15
                        health['issues'].append(f'High CPU temperature: {temp:.1f}°C')
                    elif temp > HEALTH_THRESHOLDS['temperature']['good']:
                        health['score'] -= 5
                        health['issues'].append(f'Elevated CPU temperature: {temp:.1f}°C')
        except:
            pass
        
        # Check disk usage
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                if usage.percent > HEALTH_THRESHOLDS['disk']['warning']:
                    health['score'] -= 15
                    health['issues'].append(f'High disk usage on {partition.mountpoint}')
                elif usage.percent > HEALTH_THRESHOLDS['disk']['good']:
                    health['score'] -= 5
                    health['issues'].append(f'Elevated disk usage on {partition.mountpoint}')
            except:
                pass
        
        # Determine status based on score
        if health['score'] >= 90:
            health['status'] = 'Excellent'
        elif health['score'] >= 70:
            health['status'] = 'Good'
        elif health['score'] >= 50:
            health['status'] = 'Fair'
        else:
            health['status'] = 'Poor'
        
        return health
    except Exception as e:
        logger.error(f"Error calculating health score: {str(e)}")
        return {"score": "N/A", "status": "Unknown", "issues": ["Unable to calculate health"]}

# Get system information
def get_system_info():
    try:
        info = {}
        info['platform'] = platform.system()
        info['platform_release'] = platform.release()
        info['platform_version'] = platform.version()
        info['architecture'] = platform.machine()
        info['hostname'] = socket.gethostname()
        info['processor'] = platform.processor()
        info['boot_time'] = datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
        
        # Get number of users logged in
        info['users_logged_in'] = len(psutil.users())
        info['user_details'] = []
        for user in psutil.users():
            user_info = {
                'name': user.name,
                'terminal': user.terminal,
                'host': user.host,
                'started': datetime.fromtimestamp(user.started).strftime("%Y-%m-%d %H:%M:%S"),
                'pid': user.pid if hasattr(user, 'pid') else "N/A"
            }
            info['user_details'].append(user_info)
        
        # Get load averages (Linux/macOS only)
        if hasattr(os, 'getloadavg'):
            load1, load5, load15 = os.getloadavg()
            info['load_avg'] = {
                '1min': round(load1, 2),
                '5min': round(load5, 2),
                '15min': round(load15, 2)
            }
        
        # Get kernel version (Linux)
        if os.path.exists('/proc/version'):
            with open('/proc/version', 'r') as f:
                info['kernel_version'] = f.read().strip()
        
        # Get distro info (Linux)
        if os.path.exists('/etc/os-release'):
            with open('/etc/os-release', 'r') as f:
                os_release = {}
                for line in f:
                    if '=' in line:
                        key, value = line.rstrip().split('=', 1)
                        os_release[key] = value.strip('"')
                if 'PRETTY_NAME' in os_release:
                    info['distro'] = os_release['PRETTY_NAME']
        
        # Get uptime
        info['uptime_seconds'] = int(time.time() - psutil.boot_time())
        
        return info
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        return {"error": str(e)}

# Get CPU information with temperature data if available
def get_cpu_info():
    try:
        cpu_info = {}
        cpu_info['physical_cores'] = psutil.cpu_count(logical=False)
        cpu_info['total_cores'] = psutil.cpu_count(logical=True)
        cpu_freq = psutil.cpu_freq()
        if cpu_freq:
            cpu_info['max_frequency'] = f"{cpu_freq.max:.2f}Mhz" if hasattr(cpu_freq, 'max') else "N/A"
            cpu_info['min_frequency'] = f"{cpu_freq.min:.2f}Mhz" if hasattr(cpu_freq, 'min') else "N/A"
            cpu_info['current_frequency'] = f"{cpu_freq.current:.2f}Mhz" if hasattr(cpu_freq, 'current') else "N/A"
            cpu_info['raw_frequencies'] = {
                'max': cpu_freq.max if hasattr(cpu_freq, 'max') else None,
                'min': cpu_freq.min if hasattr(cpu_freq, 'min') else None,
                'current': cpu_freq.current if hasattr(cpu_freq, 'current') else None
            }
        
        # Get per-core frequencies if available
        try:
            if hasattr(psutil.cpu_freq, '__call__') and 'percpu' in psutil.cpu_freq.__code__.co_varnames:
                per_cpu_freq = psutil.cpu_freq(percpu=True)
                if per_cpu_freq:
                    cpu_info['per_core_frequencies'] = [f"{freq.current:.2f}Mhz" for freq in per_cpu_freq]
                    cpu_info['raw_per_core_frequencies'] = [freq.current for freq in per_cpu_freq]
        except:
            pass
        
        cpu_info['usage_per_core'] = [f"{percentage:.2f}%" for percentage in psutil.cpu_percent(percpu=True, interval=1)]
        cpu_info['raw_usage_per_core'] = [percentage for percentage in psutil.cpu_percent(percpu=True, interval=0)]
        cpu_info['total_usage'] = f"{psutil.cpu_percent()}%"
        cpu_info['raw_total_usage'] = psutil.cpu_percent()
        
        # Try to get CPU temperature (works on many Linux systems)
        try:
            if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
                with open('/sys/class/thermal/thermal_zone0/temp') as f:
                    temp = int(f.read().strip()) / 1000
                    cpu_info['temperature'] = f"{temp:.1f}°C"
                    cpu_info['raw_temperature'] = temp
            elif platform.system() == 'Linux':
                # Try using sensors command on Linux
                try:
                    sensors_output = subprocess.check_output(['sensors'], universal_newlines=True)
                    for line in sensors_output.split('\n'):
                        if 'Core 0' in line and ':' in line:
                            temp_str = line.split(':')[1].strip().split()[0]
                            if '°C' in temp_str:
                                cpu_info['temperature'] = temp_str
                                try:
                                    cpu_info['raw_temperature'] = float(temp_str.replace('°C', '').strip())
                                except:
                                    pass
                                break
                except:
                    pass
        except:
            cpu_info['temperature'] = "N/A"
            cpu_info['raw_temperature'] = None
        
        # Get detailed CPU info from /proc/cpuinfo (Linux)
        if os.path.exists('/proc/cpuinfo'):
            cpu_detailed_info = {}
            current_processor = None
            
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.strip():
                        if line.startswith('processor'):
                            current_processor = int(line.split(':')[1].strip())
                            cpu_detailed_info[current_processor] = {}
                        elif current_processor is not None and ':' in line:
                            key, value = line.split(':', 1)
                            cpu_detailed_info[current_processor][key.strip()] = value.strip()
            
            if cpu_detailed_info:
                cpu_info['detailed_info'] = cpu_detailed_info
        
        return cpu_info
    except Exception as e:
        logger.error(f"Error getting CPU info: {str(e)}")
        return {"error": str(e)}

# Get GPU information if available (NVIDIA GPUs using nvidia-smi)
def get_gpu_info():
    try:
        gpu_info = {'available': False}
        
        try:
            # Try nvidia-smi for NVIDIA GPUs
            nvidia_output = subprocess.check_output(['nvidia-smi', '--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,fan.speed', '--format=csv,noheader,nounits'], universal_newlines=True)
            if nvidia_output:
                gpu_info['available'] = True
                gpu_info['gpus'] = []
                
                lines = nvidia_output.strip().split('\n')
                for line in lines:
                    parts = line.split(', ')
                    if len(parts) >= 5:
                        gpu = {
                            'name': parts[0],
                            'temperature': f"{parts[1]}°C",
                            'utilization': f"{parts[2]}%",
                            'memory_used': f"{parts[3]} MB",
                            'memory_total': f"{parts[4]} MB",
                            'memory_percent': f"{(float(parts[3])/float(parts[4])*100):.1f}%",
                            'raw_values': {
                                'temperature': float(parts[1]),
                                'utilization': float(parts[2]),
                                'memory_used': float(parts[3]),
                                'memory_total': float(parts[4]),
                                'memory_percent': float(parts[3])/float(parts[4])*100
                            }
                        }
                        
                        # Add power and fan info if available
                        if len(parts) >= 8:
                            gpu['power_draw'] = f"{parts[5]} W"
                            gpu['power_limit'] = f"{parts[6]} W"
                            gpu['fan_speed'] = f"{parts[7]}%"
                            gpu['raw_values']['power_draw'] = float(parts[5]) if parts[5] != 'N/A' else None
                            gpu['raw_values']['power_limit'] = float(parts[6]) if parts[6] != 'N/A' else None
                            gpu['raw_values']['fan_speed'] = float(parts[7]) if parts[7] != 'N/A' else None
                            
                        gpu_info['gpus'].append(gpu)
        except Exception as nvidia_error:
            logger.debug(f"NVIDIA GPU detection failed: {str(nvidia_error)}")
            # Try AMD GPU detection
            try:
                rocm_smi_path = '/opt/rocm/bin/rocm-smi'
                if os.path.exists(rocm_smi_path):
                    rocm_output = subprocess.check_output([rocm_smi_path, '--showuse', '--showtemp'], universal_newlines=True)
                    if 'GPU' in rocm_output:
                        gpu_info['available'] = True
                        gpu_info['amd_gpus'] = []
                        gpu_info['raw_output'] = rocm_output
                        # Extract relevant data from rocm-smi output
                        # (Implementation would parse the specific output format)
            except Exception as amd_error:
                logger.debug(f"AMD GPU detection failed: {str(amd_error)}")
            
            # Try lspci for basic detection
            try:
                lspci_output = subprocess.check_output(['lspci', '-vnn'], universal_newlines=True)
                if 'VGA' in lspci_output or '3D controller' in lspci_output:
                    gpu_info['available'] = True
                    gpu_info['basic_info'] = []
                    
                    for line in lspci_output.split('\n'):
                        if 'VGA' in line or '3D controller' in line:
                            parts = line.split(': ')
                            if len(parts) >= 2:
                                gpu_info['basic_info'].append(parts[1].strip())
            except Exception as lspci_error:
                logger.debug(f"LSPCI GPU detection failed: {str(lspci_error)}")
        
        return gpu_info
    except Exception as e:
        logger.error(f"Error getting GPU info: {str(e)}")
        return {"error": str(e), "available": False}

# Get memory information
def get_memory_info():
    try:
        memory_info = {}
        svmem = psutil.virtual_memory()
        memory_info['total'] = f"{svmem.total / (1024**3):.2f}GB"
        memory_info['available'] = f"{svmem.available / (1024**3):.2f}GB"
        memory_info['used'] = f"{svmem.used / (1024**3):.2f}GB"
        memory_info['percentage'] = f"{svmem.percent}%"
        
        # Add more detailed memory information
        memory_info['buffered'] = f"{getattr(svmem, 'buffers', 0) / (1024**3):.2f}GB"
        memory_info['cached'] = f"{getattr(svmem, 'cached', 0) / (1024**3):.2f}GB"
        memory_info['shared'] = f"{getattr(svmem, 'shared', 0) / (1024**3):.2f}GB"
        
        swap = psutil.swap_memory()
        memory_info['swap_total'] = f"{swap.total / (1024**3):.2f}GB"
        memory_info['swap_free'] = f"{swap.free / (1024**3):.2f}GB"
        memory_info['swap_used'] = f"{swap.used / (1024**3):.2f}GB"
        memory_info['swap_percentage'] = f"{swap.percent}%"
        memory_info['swap_sin'] = f"{swap.sin / (1024**2):.2f}MB" if hasattr(swap, 'sin') else "N/A"
        memory_info['swap_sout'] = f"{swap.sout / (1024**2):.2f}MB" if hasattr(swap, 'sout') else "N/A"
        
        # Raw values for charts
        memory_info['raw_values'] = {
            'total': svmem.total / (1024**3),
            'available': svmem.available / (1024**3),
            'used': svmem.used / (1024**3),
            'percent': svmem.percent,
            'buffered': getattr(svmem, 'buffers', 0) / (1024**3),
            'cached': getattr(svmem, 'cached', 0) / (1024**3),
            'shared': getattr(svmem, 'shared', 0) / (1024**3)
        }
        
        memory_info['raw_swap'] = {
            'total': swap.total / (1024**3),
            'free': swap.free / (1024**3),
            'used': swap.used / (1024**3),
            'percent': swap.percent,
            'sin': swap.sin / (1024**2) if hasattr(swap, 'sin') else 0, 
            'sout': swap.sout / (1024**2) if hasattr(swap, 'sout') else 0
        }
        
        return memory_info
    except Exception as e:
        logger.error(f"Error getting memory info: {str(e)}")
        return {"error": str(e)}

# Get disk information
def get_disk_info():
    try:
        disk_info = {}
        partitions = psutil.disk_partitions()
        disk_info['partitions'] = []
        
        for partition in partitions:
            partition_info = {}
            partition_info['device'] = partition.device
            partition_info['mountpoint'] = partition.mountpoint
            partition_info['filesystem_type'] = partition.fstype
            
            try:
                partition_usage = psutil.disk_usage(partition.mountpoint)
                partition_info['total_size'] = f"{partition_usage.total / (1024**3):.2f}GB"
                partition_info['used'] = f"{partition_usage.used / (1024**3):.2f}GB"
                partition_info['free'] = f"{partition_usage.free / (1024**3):.2f}GB"
                partition_info['percentage'] = f"{partition_usage.percent}%"
                
                # Raw values for charts
                partition_info['raw_values'] = {
                    'total': partition_usage.total / (1024**3),
                    'used': partition_usage.used / (1024**3),
                    'free': partition_usage.free / (1024**3),
                    'percent': partition_usage.percent
                }
            except Exception as mount_error:
                logger.warning(f"Could not get usage for {partition.mountpoint}: {str(mount_error)}")
                partition_info['error'] = "Could not get usage information"
            
            disk_info['partitions'].append(partition_info)
        
        # Get I/O statistics
        disk_io = psutil.disk_io_counters(perdisk=True)
        disk_info['io_stats'] = {}
        
        # Total for all disks
        total_io = psutil.disk_io_counters()
        if total_io:
            disk_info['read_since_boot'] = f"{total_io.read_bytes / (1024**3):.2f}GB"
            disk_info['write_since_boot'] = f"{total_io.write_bytes / (1024**3):.2f}GB"
            disk_info['io_time'] = f"{total_io.busy_time / 1000:.2f}s" if hasattr(total_io, 'busy_time') else "N/A"
        
        # Per disk I/O stats
        if disk_io:
            for disk_name, counters in disk_io.items():
                disk_info['io_stats'][disk_name] = {
                    'read_count': counters.read_count,
                    'write_count': counters.write_count,
                    'read_bytes': f"{counters.read_bytes / (1024**3):.2f}GB",
                    'write_bytes': f"{counters.write_bytes / (1024**3):.2f}GB"
                }
        
        return disk_info
    except Exception as e:
        logger.error(f"Error getting disk info: {str(e)}")
        return {"error": str(e)}

# Get network information
def get_network_info():
    try:
        network_info = {}
        net_io = psutil.net_io_counters()
        network_info['bytes_sent'] = f"{net_io.bytes_sent / (1024**3):.2f}GB"
        network_info['bytes_received'] = f"{net_io.bytes_recv / (1024**3):.2f}GB"
        network_info['packets_sent'] = f"{net_io.packets_sent}"
        network_info['packets_recv'] = f"{net_io.packets_recv}"
        network_info['errin'] = f"{net_io.errin}"
        network_info['errout'] = f"{net_io.errout}"
        network_info['dropin'] = f"{net_io.dropin}"
        network_info['dropout'] = f"{net_io.dropout}"
        
        # Raw values for charts
        network_info['raw_values'] = {
            'bytes_sent': net_io.bytes_sent,
            'bytes_received': net_io.bytes_recv
        }
        
        network_info['interfaces'] = []
        net_if_stats = psutil.net_if_stats()
        net_if_addrs = psutil.net_if_addrs()
        
        for interface_name, stats in net_if_stats.items():
            if interface_name in net_if_addrs:
                interface_info = {}
                interface_info['name'] = interface_name
                interface_info['isup'] = "Up" if stats.isup else "Down"
                interface_info['speed'] = f"{stats.speed}MB" if stats.speed > 0 else "N/A"
                interface_info['duplex'] = stats.duplex.name if hasattr(stats, 'duplex') else "N/A"
                interface_info['mtu'] = stats.mtu if hasattr(stats, 'mtu') else "N/A"
                
                addresses = []
                for addr in net_if_addrs[interface_name]:
                    address_info = {}
                    if addr.family.name == 'AF_INET':  # IPv4
                        address_info['ip'] = addr.address
                        address_info['netmask'] = addr.netmask
                        address_info['broadcast'] = addr.broadcast if hasattr(addr, 'broadcast') else None
                        address_info['type'] = 'IPv4'
                        addresses.append(address_info)
                    elif addr.family.name == 'AF_INET6':  # IPv6
                        address_info['ip'] = addr.address
                        address_info['netmask'] = addr.netmask
                        address_info['broadcast'] = addr.broadcast if hasattr(addr, 'broadcast') else None
                        address_info['type'] = 'IPv6'
                        addresses.append(address_info)
                    elif addr.family.name == 'AF_PACKET':  # MAC address
                        address_info['mac'] = addr.address
                        addresses.append(address_info)
                
                interface_info['addresses'] = addresses
                network_info['interfaces'].append(interface_info)
        
        return network_info
    except Exception as e:
        logger.error(f"Error getting network info: {str(e)}")
        return {"error": str(e)}

# Calculate I/O rates
def calculate_io_rates():
    global last_disk_io, last_network_io, last_check_time
    current_time = time.time()
    rates = {
        'disk_read_rate': 0,
        'disk_write_rate': 0,
        'net_upload_rate': 0,
        'net_download_rate': 0
    }
    
    try:
        # Get current I/O stats
        current_disk_io = psutil.disk_io_counters()
        current_net_io = psutil.net_io_counters()
        
        # Calculate rates if we have previous values
        if last_disk_io and last_network_io and last_check_time:
            time_delta = current_time - last_check_time
            
            if time_delta > 0:
                # Disk I/O rates (bytes/sec)
                disk_read_delta = current_disk_io.read_bytes - last_disk_io.read_bytes
                disk_write_delta = current_disk_io.write_bytes - last_disk_io.write_bytes
                rates['disk_read_rate'] = disk_read_delta / time_delta
                rates['disk_write_rate'] = disk_write_delta / time_delta
                
                # Network I/O rates (bytes/sec)
                net_upload_delta = current_net_io.bytes_sent - last_network_io.bytes_sent
                net_download_delta = current_net_io.bytes_recv - last_network_io.bytes_recv
                rates['net_upload_rate'] = net_upload_delta / time_delta
                rates['net_download_rate'] = net_download_delta / time_delta
        
        # Update last values
        last_disk_io = current_disk_io
        last_network_io = current_net_io
        last_check_time = current_time
        
    except Exception as e:
        logger.error(f"Error calculating I/O rates: {str(e)}")
    
    return rates

# Get process information
def get_process_info():
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'status', 'cpu_percent', 'memory_percent', 'create_time', 'num_threads', 'cmdline']):
            try:
                pinfo = proc.info
                
                # Skip processes with 0% CPU usage to reduce data size, unless they're using significant memory
                if pinfo['cpu_percent'] < 0.1 and pinfo['memory_percent'] < 0.1:
                    continue
                    
                process_data = {
                    'pid': pinfo['pid'],
                    'name': pinfo['name'],
                    'username': pinfo['username'],
                    'status': pinfo['status'],
                    'cpu_percent': round(pinfo['cpu_percent'], 1),
                    'memory_percent': round(pinfo['memory_percent'], 1),
                    'created': datetime.fromtimestamp(pinfo['create_time']).strftime("%Y-%m-%d %H:%M:%S"),
                    'threads': pinfo['num_threads']
                }
                
                # Try to get more detailed information
                try:
                    # Get memory usage in MB
                    mem_info = proc.memory_info()
                    process_data['memory_mb'] = round(mem_info.rss / (1024 * 1024), 2)
                    
                    # Get open files count
                    process_data['open_files'] = len(proc.open_files()) if hasattr(proc, 'open_files') else 'N/A'
                    
                    # Get network connections count
                    process_data['connections'] = len(proc.connections()) if hasattr(proc, 'connections') else 'N/A'
                    
                    # Get I/O counters if available
                    if hasattr(proc, 'io_counters'):
                        io = proc.io_counters()
                        process_data['io_read_mb'] = round(io.read_bytes / (1024 * 1024), 2)
                        process_data['io_write_mb'] = round(io.write_bytes / (1024 * 1024), 2)
                
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    # Some processes may not allow access to all information
                    pass
                
                # Get command line (sanitized)
                try:
                    process_data['cmdline'] = ' '.join(pinfo['cmdline']) if pinfo['cmdline'] else ''
                except:
                    process_data['cmdline'] = ''
                
                processes.append(process_data)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
            
        # Sort processes by CPU usage (descending)
        processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        
        return {'processes': processes[:100]}  # Limit to top 100 processes
    except Exception as e:
        logger.error(f"Error getting process info: {str(e)}")
        return {"error": str(e)}

# Get weather information (if API key is available)
def get_weather_info():
    try:
        # This function would use a weather API to get local weather
        # For demonstration, we'll return mock data
        weather = {
            'available': False,
            'temperature': 22,
            'condition': 'Cloudy',
            'humidity': 65,
            'wind_speed': 5.5,
            'location': 'Demo City'
        }
        
        # Uncomment and configure with your own API key to get real weather data
        # OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY')
        # if OPENWEATHER_API_KEY:
        #     # Get location by IP (in a real app, you might want to set this manually)
        #     ip_response = requests.get('https://ipapi.co/json/')
        #     if ip_response.status_code == 200:
        #         ip_data = ip_response.json()
        #         lat, lon = ip_data['latitude'], ip_data['longitude']
        #         city = ip_data['city']
        #         
        #         # Get weather data
        #         weather_response = requests.get(
        #             f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric'
        #         )
        #         if weather_response.status_code == 200:
        #             data = weather_response.json()
        #             weather = {
        #                 'available': True,
        #                 'temperature': data['main']['temp'],
        #                 'condition': data['weather'][0]['main'],
        #                 'humidity': data['main']['humidity'],
        #                 'wind_speed': data['wind']['speed'],
        #                 'location': city
        #             }
        
        return weather
    except Exception as e:
        logger.error(f"Error getting weather info: {str(e)}")
        return {"available": False, "error": str(e)}

# Routes
@app.route('/')
def index():
    return render_template('index.html', system_info=get_system_info())

@app.route('/api/system')
def api_system():
    return jsonify(get_system_info())

@app.route('/api/health')
def api_health():
    return jsonify(calculate_health_score())

@app.route('/api/cpu')
def api_cpu():
    return jsonify(get_cpu_info())

@app.route('/api/gpu')
def api_gpu():
    return jsonify(get_gpu_info())

@app.route('/api/memory')
def api_memory():
    return jsonify(get_memory_info())

@app.route('/api/disk')
def api_disk():
    return jsonify(get_disk_info())

@app.route('/api/network')
def api_network():
    return jsonify(get_network_info())

@app.route('/api/processes')
def api_processes():
    return jsonify(get_process_info())

@app.route('/api/weather')
def api_weather():
    return jsonify(get_weather_info())

# Background task to emit data to clients
def background_task():
    """Background task to emit system metrics to connected clients."""
    global last_disk_io, last_network_io, last_check_time
    
    try:
        # Calculate rates for first time
        if last_check_time is None:
            last_check_time = time.time()
            last_disk_io = psutil.disk_io_counters()
            last_network_io = psutil.net_io_counters()
            time.sleep(1)  # Wait to get initial rates
        
        while True:
            # Exit if no clients connected
            if not socketio.server.manager.rooms:
                time.sleep(5)  # Check every 5 seconds for new connections
                continue
                
            try:
                # Get IO rates
                io_rates = calculate_io_rates()
                
                # Emit system info
                socketio.emit('system_info', get_system_info())
                
                # Emit CPU info
                socketio.emit('cpu_info', get_cpu_info())
                
                # Emit Memory info
                socketio.emit('memory_info', get_memory_info())
                
                # Emit Disk info
                disk_info = get_disk_info()
                if io_rates:
                    disk_info['io_rates'] = io_rates
                socketio.emit('disk_info', disk_info)
                
                # Emit Network info
                network_info = get_network_info()
                if io_rates:
                    network_info['io_rates'] = io_rates
                socketio.emit('network_info', network_info)
                
                # Emit Process info
                socketio.emit('process_info', get_process_info())
                
                # Add timestamp
                timestamp = datetime.now().strftime('%H:%M:%S')
                socketio.emit('timestamp', {'time': timestamp})
                
                # Log activity
                logger.debug(f"Data emitted at {timestamp}")
                
            except Exception as e:
                logger.error(f"Error in background task: {str(e)}")
            
            # Sleep between updates
            time.sleep(2)
            
    except Exception as e:
        logger.error(f"Background task error: {str(e)}")

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    logger.info('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    logger.info('Client disconnected')

@socketio.on('get_data')
def handle_get_data():
    """Handle client request for fresh data."""
    try:
        # Get IO rates
        io_rates = calculate_io_rates()
        
        # Emit all data
        socketio.emit('system_info', get_system_info(), room=request.sid)
        socketio.emit('cpu_info', get_cpu_info(), room=request.sid)
        socketio.emit('memory_info', get_memory_info(), room=request.sid)
        
        # Emit Disk info
        disk_info = get_disk_info()
        if io_rates:
            disk_info['io_rates'] = io_rates
        socketio.emit('disk_info', disk_info, room=request.sid)
        
        # Emit Network info
        network_info = get_network_info()
        if io_rates:
            network_info['io_rates'] = io_rates
        socketio.emit('network_info', network_info, room=request.sid)
        
        # Emit Process info
        socketio.emit('process_info', get_process_info(), room=request.sid)
        
        # Add timestamp
        timestamp = datetime.now().strftime('%H:%M:%S')
        socketio.emit('timestamp', {'time': timestamp}, room=request.sid)
        
    except Exception as e:
        logger.error(f"Error handling get_data: {str(e)}")

if __name__ == '__main__':
    # Start background task for real-time updates
    socketio.start_background_task(background_task)
    
    # Get host and port from environment or use defaults
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Note: debug=True can cause the background task to run twice
    socketio.run(app, host=host, port=port, debug=debug) 