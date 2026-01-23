const WEATHER_API_KEY = 'dea260a04f844eb9922214011262001';
const MAPTILER_KEY = 'M3G7SJimZ3HyNUB07YAa';

maptilersdk.config.apiKey = MAPTILER_KEY;

const map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.BACKDROP,
    center: [0, 20],
    zoom: 1,
    hash: true
});

let weatherLayer = null;
const weatherLayerTypes = {
    'precipitation': maptilerweather.PrecipitationLayer,
    'temperature': maptilerweather.TemperatureLayer,
    'wind': maptilerweather.WindLayer,
    'radar': maptilerweather.RadarLayer
};

map.on('load', () => {
    map.setPaintProperty("Water", 'fill-color', "rgba(0, 0, 0, 0.4)");
    setWeatherLayer('precipitation');
});

document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        setWeatherLayer(e.target.dataset.layer);
    });
});

function setWeatherLayer(type) {
    if (weatherLayer) {
        map.removeLayer(weatherLayer.id);
    }
    
    const LayerClass = weatherLayerTypes[type];
    if (LayerClass) {
        weatherLayer = new LayerClass({
            opacity: 0.8
        });
        map.addLayer(weatherLayer, 'Water');
        if(weatherLayer.animateByFactor) {
            weatherLayer.animateByFactor(3600);
        }
    }
}

const searchInput = document.getElementById('searchInput');
const geoBtn = document.getElementById('geoBtn');

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchWeather(searchInput.value);
    }
});

geoBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        geoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const query = `${position.coords.latitude},${position.coords.longitude}`;
                fetchWeather(query);
                geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
            },
            (error) => {
                alert('Unable to retrieve your location');
                geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
            }
        );
    }
});

async function fetchWeather(query) {
    try {
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${query}&days=7&aqi=yes&alerts=yes`
        );
        
        if (!response.ok) throw new Error('Weather data not found');
        
        const data = await response.json();
        updateUI(data);
        
        if (data.location) {
            map.flyTo({
                center: [data.location.lon, data.location.lat],
                zoom: 10,
                essential: true
            });
        }
    } catch (error) {
        console.error(error);
        alert('Location not found. Please try again.');
    }
}

function updateUI(data) {
    const current = data.current;
    const location = data.location;
    const forecast = data.forecast.forecastday;

    document.getElementById('currentWeather').innerHTML = `
        <div class="location-header">
            <h1>${location.name}</h1>
            <p>${location.region}, ${location.country}</p>
            <p>${location.localtime}</p>
        </div>
        <div class="main-temp">
            <span class="temp-value">${current.temp_c}°C</span>
            <div class="weather-icon">
                <img src="https:${current.condition.icon}" alt="${current.condition.text}">
            </div>
        </div>
        <div class="condition-text">${current.condition.text}</div>
    `;

    document.getElementById('weatherDetails').innerHTML = `
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-wind"></i> Wind</span>
            <span class="detail-value">${current.wind_kph} km/h ${current.wind_dir}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-droplet"></i> Humidity</span>
            <span class="detail-value">${current.humidity}%</span>
        </div>
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-eye"></i> Visibility</span>
            <span class="detail-value">${current.vis_km} km</span>
        </div>
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-sun"></i> UV Index</span>
            <span class="detail-value">${current.uv}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-temperature-half"></i> Feels Like</span>
            <span class="detail-value">${current.feelslike_c}°C</span>
        </div>
        <div class="detail-item">
            <span class="detail-label"><i class="fa-solid fa-cloud"></i> Cloud Cover</span>
            <span class="detail-value">${current.cloud}%</span>
        </div>
    `;

    const forecastHTML = forecast.map(day => `
        <div class="forecast-item">
            <span class="forecast-day">${new Date(day.date).toLocaleDateString('en-US', {weekday: 'short'})}</span>
            <div class="forecast-icon">
                <img src="https:${day.day.condition.icon}" alt="icon">
            </div>
            <div class="forecast-temp">
                <span>${day.day.maxtemp_c}°</span> / 
                <span style="color: #666">${day.day.mintemp_c}°</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('forecastList').innerHTML = forecastHTML;
}

fetchWeather('London');
