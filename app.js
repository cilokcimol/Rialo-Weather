const weatherApiKey = 'dea260a04f844eb9922214011262001';
const maptilerApiKey = 'M3G7SJimZ3HyNUB07YAa';

maptilersdk.config.apiKey = maptilerApiKey;

let map;
let weatherLayer;
let currentLayerId = 'precipitation';

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    fetchWeather('South Tangerang');
});

function initMap() {
    map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.BACKDROP.DARK,
        center: [106.6894, -6.3315],
        zoom: 3,
        hash: true,
    });

    map.on('load', () => {
        addWeatherLayer('precipitation');
    });
}

function addWeatherLayer(type) {
    if (weatherLayer) {
        map.removeLayer(weatherLayer.id);
    }

    const layerMap = {
        'precipitation': maptilerweather.PrecipitationLayer,
        'temperature': maptilerweather.TemperatureLayer,
        'wind': maptilerweather.WindLayer,
        'clouds': maptilerweather.RadarLayer
    };

    const LayerClass = layerMap[type];
    
    if (LayerClass) {
        weatherLayer = new LayerClass({
            opacity: 0.8,
            animation: true 
        });
        map.addLayer(weatherLayer);
        
        if(type === 'wind') {
            weatherLayer.setAnimationTime(Date.now() / 1000);
            weatherLayer.animateByFactor(3600);
        } else {
            weatherLayer.animateByFactor(3600);
        }
    }
}

function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('city-input').value;
        if (query) fetchWeather(query);
    });

    document.getElementById('city-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = document.getElementById('city-input').value;
            if (query) fetchWeather(query);
        }
    });

    document.getElementById('locate-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const q = `${position.coords.latitude},${position.coords.longitude}`;
                    fetchWeather(q);
                },
                (error) => {
                    alert('Unable to retrieve location.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    });

    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const layerType = e.target.getAttribute('data-layer');
            addWeatherLayer(layerType);
        });
    });
}

async function fetchWeather(query) {
    try {
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${query}&days=3&aqi=yes&alerts=no`);
        
        if (!response.ok) throw new Error('Location not found');
        
        const data = await response.json();
        updateUI(data);
        
        if (map) {
            map.flyTo({
                center: [data.location.lon, data.location.lat],
                zoom: 10,
                essential: true
            });
        }
    } catch (error) {
        console.error(error);
        alert('Location not found or API error.');
    }
}

function updateUI(data) {
    const current = data.current;
    const location = data.location;

    document.getElementById('city-name').innerText = `${location.name}, ${location.country}`;
    document.getElementById('date-time').innerText = location.localtime;
    document.getElementById('weather-icon').src = `https:${current.condition.icon}`;
    document.getElementById('temperature').innerText = `${current.temp_c}°c`;
    document.getElementById('condition').innerText = current.condition.text;

    document.getElementById('humidity').innerText = `${current.humidity}%`;
    document.getElementById('wind').innerText = `${current.wind_kph} km/h`;
    document.getElementById('visibility').innerText = `${current.vis_km} km`;
    document.getElementById('pressure').innerText = `${current.pressure_mb} mb`;
    document.getElementById('uv').innerText = current.uv;
    document.getElementById('precip').innerText = `${current.precip_mm} mm`;

    const forecastContainer = document.getElementById('forecast-list');
    forecastContainer.innerHTML = '';

    data.forecast.forecastday.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const html = `
            <div class="forecast-item">
                <span>${date}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="https:${day.day.condition.icon}" alt="icon">
                    <span style="font-weight:600;">${day.day.avgtemp_c}°c</span>
                </div>
                <span style="font-size:0.8rem; color:#94A3B8;">${day.day.condition.text}</span>
            </div>
        `;
        forecastContainer.insertAdjacentHTML('beforeend', html);
    });
}
