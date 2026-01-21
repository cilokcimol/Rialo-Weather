const weatherApiKey = "dea260a04f844eb9922214011262001";
const maptilerKey = "M3G7SJimZ3HyNUB07YAa";
const cmcApiKey = "5a53361fcadf48b492830ef88ccbd710";

maptilersdk.config.apiKey = maptilerKey;

const map = new maptilersdk.Map({
    container: 'map',
    style: maptilersdk.MapStyle.BACKDROP,
    center: [0, 20],
    zoom: 2,
    hash: true,
});

let activeWeatherLayer = null;
const weatherLayers = {};

const initLayers = () => {
    weatherLayers.precipitation = new maptilerweather.PrecipitationLayer({ opacity: 0.8 });
    weatherLayers.pressure = new maptilerweather.PressureLayer({ opacity: 0.8 });
    weatherLayers.radar = new maptilerweather.RadarLayer({ opacity: 0.8 });
    weatherLayers.temperature = new maptilerweather.TemperatureLayer({ opacity: 0.8 });
    weatherLayers.wind = new maptilerweather.WindLayer({ opacity: 0.8 });
};

initLayers();

map.on('load', () => {
    map.setPaintProperty("Water", 'fill-color', "rgba(0, 0, 0, 0.4)");
    setActiveLayer('wind');
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.flyTo({ center: [longitude, latitude], zoom: 10 });
                fetchWeather(`${latitude},${longitude}`);
            }
        );
    }
    fetchCryptoData("BTC");
});

function setActiveLayer(layerName) {
    if (activeWeatherLayer) {
        map.removeLayer(activeWeatherLayer.id);
        activeWeatherLayer = null;
    }
    
    const layer = weatherLayers[layerName];
    if (layer) {
        map.addLayer(layer);
        activeWeatherLayer = layer;
        if(layer.animateByFactor) {
            layer.animateByFactor(3600);
        }
    }

    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.layer === layerName) btn.classList.add('active');
    });
}

document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        setActiveLayer(e.target.dataset.layer);
    });
});

async function fetchWeather(query) {
    try {
        const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${query}&days=1&aqi=no&alerts=no`);
        if (!res.ok) throw new Error("Weather not found");
        const data = await res.json();
        updateWeatherUI(data);
        
        if (data.location) {
            map.flyTo({ 
                center: [data.location.lon, data.location.lat], 
                zoom: 10 
            });
        }
    } catch (err) {
        alert("Location not found. Please try again.");
    }
}

function updateWeatherUI(data) {
    const current = data.current;
    const loc = data.location;

    document.getElementById('weather-info').classList.remove('hidden');
    document.getElementById('city-name').innerText = loc.name;
    document.getElementById('country-name').innerText = loc.country;
    document.getElementById('temperature').innerText = `${current.temp_c}°c`;
    document.getElementById('condition-text').innerText = current.condition.text;
    document.getElementById('condition-icon').src = `https:${current.condition.icon}`;
    
    document.getElementById('wind-speed').innerText = `${current.wind_kph} kph`;
    document.getElementById('humidity').innerText = `${current.humidity}%`;
    document.getElementById('pressure').innerText = `${current.pressure_mb} mb`;
    document.getElementById('uv-index').innerText = current.uv;
    document.getElementById('visibility').innerText = `${current.vis_km} km`;
    document.getElementById('feels-like').innerText = `${current.feelslike_c}°c`;
}

document.getElementById('search-btn').addEventListener('click', () => {
    const query = document.getElementById('location-input').value;
    if (query) fetchWeather(query);
});

document.getElementById('location-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = document.getElementById('location-input').value;
        if (query) fetchWeather(query);
    }
});

document.getElementById('geo-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`);
            },
            () => alert("Location access denied")
        );
    }
});

async function fetchCryptoData(symbol) {
    const container = document.getElementById('crypto-data');
    container.innerHTML = '<div class="crypto-row">Loading...</div>';
    
    try {
        const proxyUrl = "https://corsproxy.io/?";
        const targetUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`;
        
        const res = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
            headers: {
                'X-CMC_PRO_API_KEY': cmcApiKey
            }
        });

        const json = await res.json();
        
        if (json.status.error_code !== 0) throw new Error(json.status.error_message);

        const data = json.data[symbol.toUpperCase()];
        if(!data) throw new Error("Symbol not found"); // Handle array response in v2 if specific
        
        // Handle array or object return based on CMC versioning nuances
        const coinData = Array.isArray(data) ? data[0] : data;
        const quote = coinData.quote.USD;

        const changeClass = quote.percent_change_24h >= 0 ? 'pos' : 'neg';
        const sign = quote.percent_change_24h >= 0 ? '+' : '';

        container.innerHTML = `
            <div class="crypto-row">
                <span class="c-name" style="font-weight:bold; color: #a0e8d9;">${coinData.name} (${coinData.symbol})</span>
            </div>
            <div class="crypto-row">
                <span>Price</span>
                <span class="c-price">$${quote.price.toFixed(2)}</span>
            </div>
            <div class="crypto-row">
                <span>24h Change</span>
                <span class="c-change ${changeClass}">${sign}${quote.percent_change_24h.toFixed(2)}%</span>
            </div>
            <div class="crypto-row">
                <span>Market Cap</span>
                <span>$${(quote.market_cap / 1000000000).toFixed(2)}B</span>
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<div class="crypto-row" style="color:red">Error: ${err.message || "Not found"}</div>`;
    }
}

document.getElementById('crypto-search-btn').addEventListener('click', () => {
    const sym = document.getElementById('crypto-input').value;
    if(sym) fetchCryptoData(sym);
});
