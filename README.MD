# Polygons on a Map with Geolocation

Frontend workshop project. The web page locates the user on a map, lets them draw a polygon by clicking, calculates its area and perimeter, and exports it as GeoJSON.

- **Live demo (HTTPS):** https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
- **Stack:** HTML, CSS, JavaScript, [Leaflet 1.9.4](https://leafletjs.com/), [Turf.js 7](https://turfjs.org/), OpenStreetMap tiles

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page structure, controls and library imports |
| `estilos.css` | Layout and appearance |
| `app.js` | Map, geolocation, drawing, measurement, export and challenges |
| `poligono.geojson` | Polygon of a real place, exported from the app |

## How to run locally

Geolocation only works on HTTPS or `localhost`, so do not open `index.html` by double-clicking it.

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.

## Features

- Locate the user with `navigator.geolocation`, with handling for the 3 error codes
- Draw a polygon with map clicks, a dashed guide line and a 3-vertex minimum
- Calculate area (m² and hectares) and perimeter (m) with Turf.js
- Undo the last point, clear the map and export to GeoJSON

## Challenges completed (9/9)

| # | Challenge | Level |
|---|---|---|
| 1 | Table of vertex coordinates with 6 decimals | Basic |
| 2 | Polygon color picker | Basic |
| 3 | Polygon name stored in the `nombre` property of the GeoJSON | Basic |
| 4 | Add a vertex using the current GPS location | Intermediate |
| 5 | Save and restore the polygon with `localStorage` | Intermediate |
| 6 | Import a `.geojson` file and draw it on the map | Intermediate |
| 7 | Detect whether the user is inside the polygon | Advanced |
| 8 | Real-time geofence with `watchPosition` | Advanced |
| 9 | Self-intersection warning with `turf.kinks` | Advanced |

## Privacy reflection

_Write your answer here: what privacy risks come with a page that requests and stores user location, and how would you mitigate them?_

## Notes

- GeoJSON stores coordinates as `[lng, lat]`, while Leaflet uses `[lat, lng]`. The `aGeoJSON()` function handles the conversion and repeats the first point to close the ring.
- The polygon is saved only in the browser (`localStorage`); nothing is sent to a server.
- An imported `.geojson` file is only displayed on the map; it is not converted into an editable polygon.