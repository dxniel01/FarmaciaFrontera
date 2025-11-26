//-------------------------------------------
//     CONFIGURACIÓN
//-------------------------------------------
const FARMACIA_LAT = 32.46100;
const FARMACIA_LNG = -116.82522;

// Tarifas
const TARIFA_BASE = 30;
const TARIFA_POR_KM = 9;
const ENVIO_MINIMO = 20;
const DISTANCIA_MAX_KM = 30;

//-------------------------------------------
//     INICIALIZAR MAPA (Leaflet)
//-------------------------------------------
const mapa = L.map('mapa').setView([FARMACIA_LAT, FARMACIA_LNG], 14);

// Capa base (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(mapa);

// Marker farmacia
L.marker([FARMACIA_LAT, FARMACIA_LNG])
  .addTo(mapa)
  .bindPopup("Farmacia Salud+");

let rutaLayer;

//-------------------------------------------
// GEOCODING con Nominatim (FREE)
//-------------------------------------------
async function obtenerCoordenadas(direccion) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&addressdetails=1&countrycodes=mx`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}

//-------------------------------------------
// DIRECTIONS con OSRM (NO API KEY)
//-------------------------------------------
async function obtenerRutaOSRM(origLat, origLng, destLat, destLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || !data.routes.length) return null;

  return data.routes[0];
}

// ========================
// ANIMACIÓN DE SCROLL LENTA
// ========================
function smoothScroll(element, distance, duration) {
  let start = element.scrollLeft;
  let startTime = null;

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;
    let progress = currentTime - startTime;

    let scrollPos = easeOutCubic(
      progress,
      start,
      distance,
      duration
    );

    element.scrollLeft = scrollPos;

    if (progress < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

function easeOutCubic(t, b, c, d) {
  t /= d;
  t--;
  return c * (t * t * t + 1) + b;
}

//-------------------------------------------
// BOTÓN: Usar ubicación actual
//-------------------------------------------
document.getElementById("btnUbicacion").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      document.getElementById("direccion").value = `${latitude}, ${longitude}`;
    },
    () => alert("No se pudo obtener la ubicación.")
  );
});

//-------------------------------------------
// BOTÓN: Calcular costo y distancia
//-------------------------------------------
document.getElementById("btnCalcular").addEventListener("click", async () => {

  const direccion = document.getElementById("direccion").value.trim();
  if (!direccion) return alert("Ingresa una dirección.");

  let destino;

  // Si el usuario ingresó lat,lng directamente
  if (direccion.includes(",")) {
    const partes = direccion.split(",");
    destino = {
      lat: parseFloat(partes[0]),
      lng: parseFloat(partes[1])
    };
  } else {
    destino = await obtenerCoordenadas(direccion);
  }

  if (!destino) return alert("No se pudo encontrar esa dirección.");

  // Obtener ruta real con OSRM
  const ruta = await obtenerRutaOSRM(destino.lat, destino.lng, FARMACIA_LAT, FARMACIA_LNG);
  if (!ruta) return alert("No se pudo obtener la ruta.");

  // Distancia en KM y tiempo en minutos
  const distancia = ruta.distance / 1000;
  const tiempo = ruta.duration / 60;

  // Mostrar
  document.getElementById("resultadoDistancia").textContent = distancia.toFixed(1) + " km";
  document.getElementById("resultadoTiempo").textContent = tiempo.toFixed(0) + " min";

  // Validar rango
  if (distancia > DISTANCIA_MAX_KM) {
    document.getElementById("resultadoCosto").textContent = "Fuera de rango";
    return alert("Lo sentimos, solo entregamos dentro de 30 km.");
  }

  // Cálculo de costo
  let costo = TARIFA_BASE + distancia * TARIFA_POR_KM;
  if (costo < ENVIO_MINIMO) costo = ENVIO_MINIMO;

  document.getElementById("resultadoCosto").textContent = "$" + costo.toFixed(0) + " MXN";

  // Crear mensaje WhatsApp
  const mensaje = encodeURIComponent(
    `Hola, quiero hacer un pedido.\n\nMi dirección:\n${direccion}\nDistancia: ${distancia.toFixed(1)} km\nTiempo estimado: ${tiempo.toFixed(0)} min\nCosto de envío: $${costo.toFixed(0)} MXN`
  );

  document.getElementById("btnWspPedido").href =
    `https://wa.me/5216649876543?text=${mensaje}`;
});

//-------------------------------------------
// BOTÓN: Mostrar ruta en el mapa
//-------------------------------------------
document.getElementById("btnRuta").addEventListener("click", async () => {
  const direccion = document.getElementById("direccion").value.trim();
  if (!direccion) return alert("Ingresa una dirección.");

  let destino;

  if (direccion.includes(",")) {
    const partes = direccion.split(",");
    destino = {
      lat: parseFloat(partes[0]),
      lng: parseFloat(partes[1])
    };
  } else {
    destino = await obtenerCoordenadas(direccion);
  }

  if (!destino) return alert("No se pudo obtener coordenadas.");

  const ruta = await obtenerRutaOSRM(destino.lat, destino.lng, FARMACIA_LAT, FARMACIA_LNG);
  if (!ruta) return alert("No se pudo obtener la ruta.");

  // Limpiar ruta previa
  if (rutaLayer) mapa.removeLayer(rutaLayer);

  rutaLayer = L.geoJSON(ruta.geometry, {
    style: { color: "#0096C7", weight: 4 }
  }).addTo(mapa);

  mapa.fitBounds(rutaLayer.getBounds());
});

//-------------------------------------------
// CARRUSEL
//-------------------------------------------
//-------------------------------------------
// CARRUSEL TIPO NETFLIX INFINITO
//-------------------------------------------
const carousels = document.querySelectorAll(".carousel-container");

carousels.forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const btnLeft = carousel.querySelector(".carousel-btn.left");
    const btnRight = carousel.querySelector(".carousel-btn.right");

    const cards = Array.from(track.children);
    const cardWidth = cards[0].offsetWidth + 20; // card + gap
    const visibleCards = 5;
    const moveBy = cardWidth * 1.05; // desplazamiento exacto

    // -----------------------------------------------------
    // 1) Crear clones al inicio y al final (para infinito)
    // -----------------------------------------------------
    cards.forEach(card => {
        let clone = card.cloneNode(true);
        clone.classList.add("clone");
        track.appendChild(clone);
    });

    cards.forEach(card => {
        let clone = card.cloneNode(true);
        clone.classList.add("clone");
        track.insertBefore(clone, track.firstChild);
    });

    // -----------------------------------------------------
    // 2) Posicionar el scroll en el inicio exacto
    // -----------------------------------------------------
    track.scrollLeft = cardWidth * cards.length;

    let allowClick = true;

    // -----------------------------------------------------
    // 3) Botón Derecha (mover + infinito)
    // -----------------------------------------------------
    btnRight.addEventListener("click", () => {
        if (!allowClick) return;
        allowClick = false;

        smoothScroll(track, moveBy, 500);


        setTimeout(() => {
            if (track.scrollLeft >= cardWidth * (cards.length * 2)) {
                track.scrollLeft = cardWidth * cards.length;
            }
            allowClick = true;
        }, 520);
    });

    // -----------------------------------------------------
    // 4) Botón Izquierda (mover + infinito)
    // -----------------------------------------------------
    btnLeft.addEventListener("click", () => {
        if (!allowClick) return;
        allowClick = false;

        smoothScroll(track, moveBy, 500);

        setTimeout(() => {
            if (track.scrollLeft <= cardWidth) {
                track.scrollLeft = cardWidth * (cards.length + 1);
            }
            allowClick = true;
        }, 520);
    });

    // -----------------------------------------------------
    // 5) Corrección automática cuando el usuario hace scroll manual
    // -----------------------------------------------------
    track.addEventListener("scroll", () => {
        if (track.scrollLeft <= cardWidth) {
            track.scrollLeft = cardWidth * (cards.length + 1);
        }
        if (track.scrollLeft >= cardWidth * (cards.length * 2)) {
            track.scrollLeft = cardWidth * cards.length;
        }
    });
});
