// Handle UI Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="showPage('${pageId}')"]`).classList.add('active');

    if (pageId === 'page-map' && window.map) {
        setTimeout(() => window.map.invalidateSize(), 200);
    }
}

// Handle Login
function doLogin() {
    const role = document.getElementById('loginRole').value;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appWrapper').classList.add('visible');
    
    // Load data
    fetchData();
    initMap();
}

function doLogout() {
    document.getElementById('appWrapper').classList.remove('visible');
    document.getElementById('loginScreen').classList.remove('hidden');
}

// Particle Background for Login
function initParticles() {
    const canvas = document.getElementById('particles-bg');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray;

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x; this.y = y;
            this.directionX = directionX; this.directionY = directionY;
            this.size = size; this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 1) - 0.5;
            let directionY = (Math.random() * 1) - 0.5;
            let color = '#3b82f6';
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0,0,innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    function connect() {
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + 
                               ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                if (distance < (canvas.width/7) * (canvas.height/7)) {
                    ctx.strokeStyle = 'rgba(59,130,246,0.1)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    init();
    animate();
}

// Map Initialization
function initMap() {
    if (window.map) return;
    window.map = L.map('leaflet-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(window.map);
}

// Fetch Data Strategy: Trying API first, falling back to static files (for github pages)
async function fetchData() {
    try {
        const res = await fetch('./data/stats.json');
        const stats = await res.json();
        document.getElementById('stat-crop').innerText = stats.cropHealth;
        document.getElementById('stat-water').innerText = stats.waterScore + '%';
        document.getElementById('stat-alerts').innerText = stats.alerts;
    } catch(e) {
        console.log("Using default stat values");
    }

    try {
        const resAlerts = await fetch('./data/alerts.json');
        const alerts = await resAlerts.json();
        const alertHtml = alerts.map(a => `
            <div style="margin-bottom:10px; padding:10px; border:1px solid #1e2c45; border-radius:6px; background: rgba(0,0,0,0.2);">
                <div style="font-weight:bold; margin-bottom:5px;">
                   <span class="status-pill ${a.severity}">${a.severity.toUpperCase()}</span> ${a.title}
                </div>
                <div style="font-size:12px; color:#8896ab;">${a.desc}</div>
            </div>
        `).join('');
        document.getElementById('alerts-container').innerHTML = alertHtml;
    } catch(e) {
        console.log("No alerts found");
    }

    try {
        const resCountries = await fetch('./data/countries.json');
        const countries = await resCountries.json();
        
        const tbody = document.getElementById('food-security-body');
        tbody.innerHTML = '';
        
        countries.forEach(c => {
            // Add marker to map
            if (window.map) {
                const markerColor = c.food === 'Phase 4' ? 'red' : (c.food === 'Phase 2' || c.food === 'Phase 3' ? 'orange' : 'green');
                const circle = L.circleMarker(c.location, {
                    color: markerColor,
                    fillColor: markerColor,
                    fillOpacity: 0.5,
                    radius: 8
                }).addTo(window.map);
                circle.bindPopup(`<b>${c.name}</b><br>NDVI: ${c.ndvi}<br>Water: ${c.water}%<br>Food Sec: ${c.food}`);
            }

            // Populate table
            const tr = document.createElement('tr');
            let phaseColor = 'info';
            if (c.food.includes('Phase 4')) phaseColor = 'critical';
            else if (c.food.includes('Phase 2') || c.food.includes('Phase 3')) phaseColor = 'warning';
            
            tr.innerHTML = `
                <td>${c.name}</td>
                <td><span class="status-pill ${phaseColor}">${c.food}</span></td>
                <td>${c.pop}</td>
                <td>NDVI: ${c.ndvi}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {
        console.error("Map data missing", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
});
