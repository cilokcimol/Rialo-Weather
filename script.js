const WEATHER_API_KEY = 'dea260a04f844eb9922214011262001';
const MAPTILER_KEY = 'M3G7SJimZ3HyNUB07YAa';

maptilersdk.config.apiKey = MAPTILER_KEY;

let map;
let weatherLayer;
let currentLayerType = 'precipitation';

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    getWeather('Jakarta'); 
    setupEventListeners();
});

function initMap() {
    map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.BACKDROP.DARK,
        center: [106.8456, -6.2088],
        zoom: 3
    });

    map.on('load', () => {
        setWeatherLayer('precipitation');
    });
}

function setWeatherLayer(type) {
    if (weatherLayer) {
        map.removeLayer(weatherLayer);
    }

    currentLayerType = type;
    
    switch(type) {
        case 'precipitation':
            weatherLayer = new maptilerweather.PrecipitationLayer();
            break;
        case 'temperature':
            weatherLayer = new maptilerweather.TemperatureLayer({
                colorramp: maptilerweather.ColorRamp.builtin.TEMPERATURE_3
            });
            break;
        case 'wind':
            weatherLayer = new maptilerweather.WindLayer();
            break;
        case 'pressure':
            weatherLayer = new maptilerweather.PressureLayer();
            break;
        case 'radar':
            weatherLayer = new maptilerweather.RadarLayer();
            break;
        case 'clouds':
             // Using Radar as proxy for clouds visual if CloudLayer isn't explicitly separated in this version
             // Or using a generic tile layer if needed, defaulting to Radar for "busy" visual
             weatherLayer = new maptilerweather.RadarLayer({
                 opacity: 0.8
             });
             break;
        default:
            weatherLayer = new maptilerweather.PrecipitationLayer();
    }

    map.addLayer(weatherLayer);
    
    // Animate the layer
    if (type !== 'wind') { // Wind animates differently
        weatherLayer.animateByFactor(3600);
    }
}

function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', () => {
        const query = document.getElementById('location-input').value;
        if(query) getWeather(query);
    });

    document.getElementById('location-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = document.getElementById('location-input').value;
            if(query) getWeather(query);
        }
    });

    document.getElementById('geo-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const q = `${position.coords.latitude},${position.coords.longitude}`;
                    getWeather(q);
                },
                (error) => {
                    alert('Unable to retrieve your location');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    });

    const layerBtns = document.querySelectorAll('.layer-btn');
    layerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            layerBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            setWeatherLayer(e.target.dataset.layer);
        });
    });
}

async function getWeather(query) {
    try {
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${query}&days=7&aqi=yes&alerts=yes`);
        const data = await response.json();

        if (data.error) {
            alert(data.error.message);
            return;
        }

        updateUI(data);
        updateMapLocation(data.location.lat, data.location.lon);

    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
}

function updateUI(data) {
    const current = data.current;
    const location = data.location;
    const forecast = data.forecast.forecastday;

    // Current Weather
    const weatherHTML = `
        <div class="location-tag">${location.name}, ${location.country}</div>
        <img src="https:${current.condition.icon}" alt="${current.condition.text}" style="width: 100px; height: 100px;">
        <div class="temp-display">${current.temp_c}°</div>
        <div class="condition-text">${current.condition.text}</div>
        <p style="color: var(--accent-color); margin-top: 10px;">${location.localtime}</p>
    `;
    document.getElementById('current-weather').innerHTML = weatherHTML;

    // Details Grid
    const detailsHTML = `
        <div class="detail-item">
            <div class="detail-label">Feels Like</div>
            <div class="detail-value">${current.feelslike_c}°C</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Humidity</div>
            <div class="detail-value">${current.humidity}%</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Wind</div>
            <div class="detail-value">${current.wind_kph} km/h ${current.wind_dir}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">UV Index</div>
            <div class="detail-value">${current.uv}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Pressure</div>
            <div class="detail-value">${current.pressure_mb} mb</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Visibility</div>
            <div class="detail-value">${current.vis_km} km</div>
        </div>
    `;
    document.getElementById('weather-details').innerHTML = detailsHTML;

    // Forecast
    let forecastHTML = '';
    forecast.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        forecastHTML += `
            <div class="forecast-card">
                <p style="color: var(--text-secondary); margin-bottom: 10px;">${date}</p>
                <img src="https:${day.day.condition.icon}" alt="icon" width="50">
                <p style="font-weight: bold; font-size: 1.2rem; margin: 5px 0;">${Math.round(day.day.avgtemp_c)}°C</p>
                <p style="font-size: 0.9rem;">${day.day.condition.text}</p>
                <p style="font-size: 0.8rem; color: var(--accent-color); margin-top: 5px;">Rain: ${day.day.daily_chance_of_rain}%</p>
            </div>
        `;
    });
    document.getElementById('forecast-container').innerHTML = forecastHTML;

    // Astro Data
    const astro = forecast[0].astro;
    const astroHTML = `
        <h3 style="color: var(--cream-color); margin-bottom: 15px;">Sun & Moon</h3>
        <div class="info-row"><span>Sunrise</span> <span>${astro.sunrise}</span></div>
        <div class="info-row"><span>Sunset</span> <span>${astro.sunset}</span></div>
        <div class="info-row"><span>Moonrise</span> <span>${astro.moonrise}</span></div>
        <div class="info-row"><span>Phase</span> <span>${astro.moon_phase}</span></div>
    `;
    document.getElementById('astro-data').innerHTML = astroHTML;

    // AQI Data
    const aqi = current.air_quality;
    if(aqi) {
        const aqiHTML = `
            <h3 style="color: var(--cream-color); margin-bottom: 15px;">Air Quality</h3>
            <div class="info-row"><span>CO</span> <span>${aqi.co.toFixed(1)}</span></div>
            <div class="info-row"><span>NO2</span> <span>${aqi.no2.toFixed(1)}</span></div>
            <div class="info-row"><span>O3</span> <span>${aqi.o3.toFixed(1)}</span></div>
            <div class="info-row"><span>PM2.5</span> <span>${aqi.pm2_5.toFixed(1)}</span></div>
            <div class="info-row"><span>EPA Index</span> <span style="color: var(--accent-color); font-weight:bold;">${aqi['us-epa-index']}</span></div>
        `;
        document.getElementById('aqi-data').innerHTML = aqiHTML;
    }
}

function updateMapLocation(lat, lon) {
    map.flyTo({
        center: [lon, lat],
        zoom: 10
    });
}
