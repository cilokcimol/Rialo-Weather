// Configuration
const CONFIG = {
    WEATHER_API_KEY: 'dea260a04f844eb9922214011262001',
    MAPTILER_KEY: 'M3G7SJimZ3HyNUB07YAa',
    CMC_API_KEY: '5a53361fcadf48b492830ef88ccbd710',
    // Note: CMC API usually requires a backend proxy for browser requests due to CORS.
    // For this client-side script, we use a standard cors-to-proxy gateway for demonstration.
    CMC_PROXY: 'https://cors-anywhere.herokuapp.com/' 
};

// State
let map;
let weatherLayer;
let activeLayer = 'wind';

// DOM Elements
const els = {
    locationInput: document.getElementById('locationInput'),
    searchBtn: document.getElementById('searchBtn'),
    locateBtn: document.getElementById('locateBtn'),
    weatherPanel: document.getElementById('weatherResult'),
    city: document.getElementById('cityName'),
    time: document.getElementById('localTime'),
    icon: document.getElementById('weatherIcon'),
    temp: document.getElementById('currentTemp'),
    text: document.getElementById('conditionText'),
    wind: document.getElementById('windSpeed'),
    humidity: document.getElementById('humidity'),
    visibility: document.getElementById('visibility'),
    uv: document.getElementById('uvIndex'),
    pressure: document.getElementById('pressure'),
    layerBtns: document.querySelectorAll('.layer-btn'),
    cryptoInput: document.getElementById('cryptoInput'),
    cryptoSearchBtn: document.getElementById('cryptoSearchBtn'),
    cryptoResult: document.getElementById('cryptoResult'),
    cName: document.getElementById('cryptoName'),
    cSymbol: document.getElementById('cryptoSymbol'),
    cPrice: document.getElementById('cryptoPrice'),
    cChange: document.getElementById('cryptoChange')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEventListeners();
    // Prompt for location on load
    getLocationWeather();
});

// MapTiler Initialization
function initMap() {
    maptilersdk.config.apiKey = CONFIG.MAPTILER_KEY;
    
    map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.BACKDROP,
        center: [0, 20],
        zoom: 2,
        hash: true
    });

    map.on('load', () => {
        setWeatherLayer('wind');
    });
}

function setWeatherLayer(type) {
    if (weatherLayer) {
        map.removeLayer(weatherLayer.id);
    }

    const layerMap = {
        'wind': maptilerweather.WindLayer,
        'precipitation': maptilerweather.PrecipitationLayer,
        'temperature': maptilerweather.TemperatureLayer,
        'pressure': maptilerweather.PressureLayer,
        'radar': maptilerweather.RadarLayer
    };

    const LayerClass = layerMap[type];
    if (!LayerClass) return;

    weatherLayer = new LayerClass({
        opacity: 0.8,
        id: 'weather-layer'
    });

    map.addLayer(weatherLayer);
    
    // Only animate wind or radar for visual effect
    if(type === 'wind' || type === 'radar' || type === 'precipitation') {
        weatherLayer.animateByFactor(3600);
    }
}

// WeatherAPI Logic
async function fetchWeather(query) {
    const url = `https://api.weatherapi.com/v1/current.json?key=${CONFIG.WEATHER_API_KEY}&q=${query}&aqi=no`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Location not found');
        const data = await response.json();
        updateWeatherUI(data);
        
        // Update Map Center
        map.flyTo({
            center: [data.location.lon, data.location.lat],
            zoom: 10
        });
    } catch (error) {
        alert(error.message);
    }
}

function updateWeatherUI(data) {
    els.weatherPanel.classList.remove('hidden');
    els.city.textContent = `${data.location.name}, ${data.location.country}`;
    els.time.textContent = data.location.localtime;
    els.icon.src = `https:${data.current.condition.icon}`;
    els.temp.textContent = data.current.temp_c;
    els.text.textContent = data.current.condition.text;
    els.wind.textContent = data.current.wind_kph;
    els.humidity.textContent = data.current.humidity;
    els.visibility.textContent = data.current.vis_km;
    els.uv.textContent = data.current.uv;
    els.pressure.textContent = data.current.pressure_mb;
}

// Geolocation
function getLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const query = `${position.coords.latitude},${position.coords.longitude}`;
                fetchWeather(query);
            },
            (error) => {
                console.log("Geolocation denied or error.");
            }
        );
    }
}

// CoinMarketCap Logic
async function fetchCrypto(symbol) {
    // Note: For a static site, we utilize a CORS proxy. 
    // In a production environment, this request should go to your own backend.
    const url = `${CONFIG.CMC_PROXY}https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'X-CMC_PRO_API_KEY': CONFIG.CMC_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Token not found');
        const json = await response.json();
        const data = json.data[symbol.toUpperCase()];
        
        if(data) {
            updateCryptoUI(data);
        } else {
            alert('Token data unavailable');
        }
    } catch (error) {
        console.error(error);
        alert('Error fetching crypto data. Note: Browser CORS may block CMC API without a backend.');
    }
}

function updateCryptoUI(data) {
    els.cryptoResult.classList.remove('hidden');
    els.cName.textContent = data.name;
    els.cSymbol.textContent = data.symbol;
    els.cPrice.textContent = data.quote.USD.price.toFixed(2);
    
    const change = data.quote.USD.percent_change_24h;
    els.cChange.textContent = `${change.toFixed(2)}%`;
    els.cChange.style.color = change >= 0 ? '#00ff88' : '#ff4d4d';
}

// Event Listeners
function initEventListeners() {
    // Weather Search
    els.searchBtn.addEventListener('click', () => {
        const query = els.locationInput.value;
        if (query) fetchWeather(query);
    });

    els.locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') els.searchBtn.click();
    });

    els.locateBtn.addEventListener('click', getLocationWeather);

    // Crypto Search
    els.cryptoSearchBtn.addEventListener('click', () => {
        const query = els.cryptoInput.value.toUpperCase();
        if (query) fetchCrypto(query);
    });

    // Map Layer Switching
    els.layerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class
            els.layerBtns.forEach(b => b.classList.remove('active'));
            // Add active class
            e.target.classList.add('active');
            // Switch layer
            const layer = e.target.dataset.layer;
            setWeatherLayer(layer);
        });
    });
}
