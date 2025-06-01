# System Monitor application for both linux and windows
# this project is efficient to monitor the system activity

Real-time system monitoring application built with Flask and Socket.IO that provides comprehensive insights into your system's performance.

## Features

- **Real-time Monitoring**: Live updates of system metrics without page refreshes
- **Comprehensive Data**: Track CPU, memory, disk, network, and process information
- **Interactive Visualizations**: Charts and gauges for easy performance analysis
- **Responsive Design**: Works on desktop and mobile devices
- **Process Management**: Filter, sort, and monitor running processes

## Requirements

- Python 3.7+
- Flask and Flask-SocketIO
- psutil for system metrics
- Modern web browser with JavaScript enabled

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/system-monitor.git
cd system-monitor
```

2. Create a virtual environment (recommended):
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

## Usage

### Option 1: Using run scripts

#### Linux/Mac:
```
chmod +x run.sh  # Make script executable (if needed)
./run.sh
```

#### Windows:
```
run.bat
```

### Option 2: Manual setup

1. Start the application:
```
cd app
python app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

3. View real-time system information in your browser

### Option 3: Using Docker

```
docker-compose up -d
```

Then access the application at http://localhost:5000

## Project Structure

```
system-monitor/
├── app/
│   ├── app.py                  # Main Flask application
│   ├── static/                 # Static assets
│   │   ├── css/
│   │   │   └── style.css       # Custom CSS styles
│   │   └── js/
│   │       └── script.js       # Client-side JavaScript
│   └── templates/
│       └── index.html          # Main HTML template
├── requirements.txt            # Python dependencies
├── run.sh                      # Linux/Mac startup script
├── run.bat                     # Windows startup script
├── Dockerfile                  # Docker container definition
├── docker-compose.yml          # Docker Compose configuration
└── README.md                   # Project documentation
```

## Technologies Used

- Backend: Flask, Flask-SocketIO, psutil
- Frontend: HTML5, CSS3, JavaScript, Bootstrap 5
- Data Visualization: Chart.js
- Real-time Communication: Socket.IO


