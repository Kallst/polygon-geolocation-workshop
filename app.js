const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación
const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; OpenStreetMap contributors',
}).addTo(mapa);

let puntos = []; // array de [lat, lng]
let vertices = []; // marcadores visibles de cada vértice
let poligono = null;
let capaImportada = null;
let marcadorUsuario = null;
let circuloPrecision = null;
let idRastreo = null;
let estabaDentro = null;

const lineaGuia = L.polyline([], { color: '#e67e22', dashArray: '6 6' }).addTo(mapa);

function mostrarInfo(texto) {
	document.getElementById('info').textContent = texto;
}

function mostrarAviso(texto) {
	const aviso = document.getElementById('aviso');
	aviso.textContent = texto;
	aviso.hidden = texto === '';
}

// Geolocalización

const MENSAJES_ERROR = {
	1: 'Permiso denegado. Activa la ubicación en el navegador.',
	2: 'No se pudo determinar la ubicación.',
	3: 'Se agotó el tiempo de espera.',
};
const OPCIONES_GPS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

function obtenerPosicion(exito) {
	if (!('geolocation' in navigator)) {
		mostrarInfo('Tu navegador no soporta geolocalización.');
		return;
	}
	mostrarInfo('Buscando tu ubicación...');
	navigator.geolocation.getCurrentPosition(
		exito,
		(err) => mostrarInfo(MENSAJES_ERROR[err.code] || 'Error desconocido.'),
		OPCIONES_GPS,
	);
}

function dibujarUsuario(punto, accuracy) {
	if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
	if (circuloPrecision) mapa.removeLayer(circuloPrecision);
	marcadorUsuario = L.marker(punto).addTo(mapa).bindPopup('Estás aquí');
	circuloPrecision = L.circle(punto, { radius: accuracy, fillOpacity: 0.1 }).addTo(mapa);
}

function ubicarUsuario(centrar) {
	obtenerPosicion((pos) => {
		const { latitude, longitude, accuracy } = pos.coords;
		const punto = [latitude, longitude];
		dibujarUsuario(punto, accuracy);
		if (centrar) {
			mapa.setView(punto, 17);
			marcadorUsuario.openPopup();
		}
		mostrarInfo(
			`Ubicación encontrada (precisión: ${Math.round(accuracy)} m). Haz clic para dibujar.`,
		);
	});
}

// Vértices

function agregarPunto(lat, lng) {
	puntos.push([lat, lng]);
	const v = L.circleMarker([lat, lng], { radius: 6, color: '#e67e22', fillOpacity: 1 }).addTo(mapa);
	vertices.push(v);
	lineaGuia.setLatLngs(puntos);
	refrescar();
	mostrarInfo(`${puntos.length} vértice(s). Necesitas al menos 3 para cerrar.`);
}

mapa.on('click', (e) => {
	if (poligono) return; // si ya está cerrado, no se agregan más puntos
	agregarPunto(e.latlng.lat, e.latlng.lng);
});

function actualizarBotones() {
	document.getElementById('btnCerrar').disabled = puntos.length < 3 || poligono !== null;
	document.getElementById('btnDeshacer').disabled = puntos.length === 0 || poligono !== null;
	document.getElementById('btnExportar').disabled = poligono === null;
	document.getElementById('btnDentro').disabled = poligono === null;
	document.getElementById('btnGeocerca').disabled = poligono === null;
}

// Cerrar y medir

function aGeoJSON() {
	const anillo = puntos.map(([lat, lng]) => [lng, lat]);
	anillo.push(anillo[0]); // cerrar el anillo
	const nombre = document.getElementById('inputNombre').value || 'Mi polígono';
	return turf.polygon([anillo], { nombre, creado: new Date().toISOString() });
}

function medir() {
	const geo = aGeoJSON();
	const area = turf.area(geo); // metros cuadrados
	const perimetro = turf.length(turf.polygonToLine(geo), { units: 'meters' });
	return { area, perimetro };
}

function cerrarPoligono() {
	if (puntos.length < 3) return;
	const color = document.getElementById('inputColor').value;
	poligono = L.polygon(puntos, { color, fillOpacity: 0.35 }).addTo(mapa);
	lineaGuia.setLatLngs([]);
	mapa.fitBounds(poligono.getBounds());
	const { area, perimetro } = medir();
	poligono
		.bindPopup(`Área: ${area.toFixed(1)} m²<br>Perímetro: ${perimetro.toFixed(1)} m`)
		.openPopup();
	mostrarInfo(`Polígono cerrado. Área: ${area.toFixed(1)} m² (${(area / 10000).toFixed(3)} ha).`);
	refrescar();
}

// Deshacer y limpiar

function deshacerPunto() {
	if (puntos.length === 0) return;
	puntos.pop();
	mapa.removeLayer(vertices.pop());
	lineaGuia.setLatLngs(puntos);
	refrescar();
	mostrarInfo(`${puntos.length} vértice(s).`);
}

function limpiar() {
	puntos = [];
	vertices.forEach((v) => mapa.removeLayer(v));
	vertices = [];
	lineaGuia.setLatLngs([]);
	if (poligono) {
		mapa.removeLayer(poligono);
		poligono = null;
	}
	if (capaImportada) {
		mapa.removeLayer(capaImportada);
		capaImportada = null;
	}
	detenerGeocerca();
	mostrarAviso('');
	refrescar();
	mostrarInfo('Mapa limpio. Haz clic para empezar de nuevo.');
}

// Exportar

function exportar() {
	const texto = JSON.stringify(aGeoJSON(), null, 2);
	const blob = new Blob([texto], { type: 'application/geo+json' });
	const enlace = document.createElement('a');
	enlace.href = URL.createObjectURL(blob);
	enlace.download = 'poligono.geojson';
	enlace.click();
	setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

// Reto 1: tabla de coordenadas
function actualizarTabla() {
	const cuerpo = document.getElementById('tablaVertices');
	cuerpo.innerHTML = '';
	puntos.forEach(([lat, lng], i) => {
		const fila = document.createElement('tr');
		[i + 1, lat.toFixed(6), lng.toFixed(6)].forEach((valor) => {
			const celda = document.createElement('td');
			celda.textContent = valor;
			fila.appendChild(celda);
		});
		cuerpo.appendChild(fila);
	});
}

// Reto 5: guardar y recuperar con localStorage
function guardar() {
	localStorage.setItem(
		'poligono',
		JSON.stringify({
			puntos,
			cerrado: poligono !== null,
			nombre: document.getElementById('inputNombre').value,
			color: document.getElementById('inputColor').value,
		}),
	);
}

function recuperar() {
	const datos = JSON.parse(localStorage.getItem('poligono'));
	if (!datos || datos.puntos.length === 0) return;
	document.getElementById('inputNombre').value = datos.nombre;
	document.getElementById('inputColor').value = datos.color;
	datos.puntos.forEach(([lat, lng]) => agregarPunto(lat, lng));
	if (datos.cerrado) cerrarPoligono();
	mapa.fitBounds(L.latLngBounds(datos.puntos));
	mostrarInfo('Se recuperó el polígono guardado.');
}

// Reto 9: advertir si el polígono se cruza
function revisarCruce() {
	const seCruza = puntos.length >= 4 && turf.kinks(aGeoJSON()).features.length > 0;
	if (idRastreo === null) {
		mostrarAviso(seCruza ? 'El polígono se cruza consigo mismo: el área no es correcta.' : '');
	}
}

function refrescar() {
	actualizarBotones();
	actualizarTabla();
	revisarCruce();
	guardar();
}

// Reto 2 y 3: color y nombre
document.getElementById('inputColor').addEventListener('input', (e) => {
	if (poligono) poligono.setStyle({ color: e.target.value });
	guardar();
});
document.getElementById('inputNombre').addEventListener('input', guardar);

// Reto 4: vértice con la ubicación actual
function verticeEnMiUbicacion() {
	if (poligono) return;
	obtenerPosicion((pos) => {
		const { latitude, longitude, accuracy } = pos.coords;
		dibujarUsuario([latitude, longitude], accuracy);
		agregarPunto(latitude, longitude);
		mapa.panTo([latitude, longitude]);
	});
}

// Reto 6: importar un archivo .geojson
function importarArchivo(archivo) {
	const lector = new FileReader();
	lector.onload = () => {
		try {
			const datos = JSON.parse(lector.result);
			if (capaImportada) mapa.removeLayer(capaImportada);
			capaImportada = L.geoJSON(datos).addTo(mapa);
			mapa.fitBounds(capaImportada.getBounds());
			mostrarInfo('Archivo importado.');
		} catch (error) {
			mostrarInfo('El archivo no es un GeoJSON válido.');
		}
	};
	lector.readAsText(archivo);
}

// Reto 7: punto dentro o fuera del polígono
function estaDentro(lat, lng) {
	return turf.booleanPointInPolygon(turf.point([lng, lat]), aGeoJSON());
}

function preguntarDentro() {
	obtenerPosicion((pos) => {
		const { latitude, longitude, accuracy } = pos.coords;
		dibujarUsuario([latitude, longitude], accuracy);
		mostrarInfo(
			estaDentro(latitude, longitude) ? 'Estás dentro del polígono.' : 'Estás fuera del polígono.',
		);
	});
}

// Reto 8: geocerca con watchPosition
function detenerGeocerca() {
	if (idRastreo === null) return;
	navigator.geolocation.clearWatch(idRastreo);
	idRastreo = null;
	estabaDentro = null;
	document.getElementById('btnGeocerca').textContent = 'Activar geocerca';
}

function alternarGeocerca() {
	if (idRastreo !== null) {
		detenerGeocerca();
		mostrarAviso('');
		mostrarInfo('Geocerca desactivada.');
		return;
	}
	if (!('geolocation' in navigator)) {
		mostrarInfo('Tu navegador no soporta geolocalización.');
		return;
	}
	document.getElementById('btnGeocerca').textContent = 'Detener geocerca';
	mostrarInfo('Geocerca activa.');
	idRastreo = navigator.geolocation.watchPosition(
		(pos) => {
			const { latitude, longitude, accuracy } = pos.coords;
			dibujarUsuario([latitude, longitude], accuracy);
			const dentro = estaDentro(latitude, longitude);
			if (dentro !== estabaDentro) {
				mostrarAviso(dentro ? 'Entraste al polígono.' : '¡Saliste del polígono!');
			}
			estabaDentro = dentro;
		},
		(err) => {
			mostrarInfo(MENSAJES_ERROR[err.code] || 'Error desconocido.');
			detenerGeocerca();
		},
		OPCIONES_GPS,
	);
}

document.getElementById('btnUbicar').addEventListener('click', () => ubicarUsuario(true));
document.getElementById('btnCerrar').addEventListener('click', cerrarPoligono);
document.getElementById('btnDeshacer').addEventListener('click', deshacerPunto);
document.getElementById('btnLimpiar').addEventListener('click', limpiar);
document.getElementById('btnExportar').addEventListener('click', exportar);
document.getElementById('btnVerticeGPS').addEventListener('click', verticeEnMiUbicacion);
document.getElementById('btnDentro').addEventListener('click', preguntarDentro);
document.getElementById('btnGeocerca').addEventListener('click', alternarGeocerca);
document.getElementById('inputArchivo').addEventListener('change', (e) => {
	if (e.target.files[0]) importarArchivo(e.target.files[0]);
	e.target.value = '';
});

recuperar();
ubicarUsuario(poligono === null);