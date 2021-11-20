var globals = {
  userLlatLng: null,
  defaultLatLng: {
    latitude: 44.8547,
    longitude: -93.4708
  }
}

function mapFactory() {


  let map = L.map('map', {zoomControl: false}).setView([44.8547, -93.4708], 13);

  let streetLayer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoiYnN0cm9jayIsImEiOiJja3cxZnN6MTRhMzBlMnVxcGtvZWtja3RhIn0.2Xs4HMBYwnUQh5wurxmeDA'
  }).addTo(map);

  function onLocationFound(e) {
    var radius = e.accuracy;
    globals['latlng'] = e.latlng
    L.marker(e.latlng).addTo(map)
    L.circle(e.latlng, radius).addTo(map);
  }

  map.on('locationfound', onLocationFound);

  map.locate({setView: true, maxZoom: 14});


  let mbAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

  let mbUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  let satLayer = L.tileLayer(mbUrl, {
    id: 'mapbox.streets',
    attribution: mbAttr
  });

  let baseLayers = {
    "Street Map": streetLayer,
    "Satellite View": satLayer
  }


  let data = $.getJSON('http://localhost:8001/query?latitude=44.8547&longitude=-93.4708&radius=10', function () {
    $.when(data).done(function () {
      return data
    });
    const geojson = data.responseJSON;
    console.log(geojson)
    let overlayLayers = addPolygons(geojson, map);
    let layerControl = new L.control.layers(baseLayers, overlayLayers).addTo(map);

  });


}


function distanceSlider() {
  $("#distance-slider").on('input', function(){
    console.log(this)
    let rad = $(this).val();
    $('#distance-label').html(rad + " Miles")

  })
}

function applyFilters() {
  $('#apply-filters').click(function() {
    let filterValues = {
      radius: 0,
      equipment: [],
      amenities: [],
      sportsFacilities: []
    }

    let params = {
      'radius': $('#distance-slider').val()
    }

    let selectedEquipment = []
    let selectedAmenities = []
    let selectedSportsFacilities = []

    $("#equipmentAccordion").children("input:checked").map(function() {
      selectedEquipment.push(this.value);
    });

    $("#amenitiesAccordion").children("input:checked").map(function() {
      selectedAmenities.push(this.value);
    });

    $("#sportsFacilitiesAccordion").children("input:checked").map(function() {
      selectedSportsFacilities.push(this.value);
    });


    if (selectedEquipment.length > 0) {
      params['equipment'] = selectedEquipment
    }
    if (selectedAmenities.length > 0) {
      params['amenities'] = selectedAmenities
    }
    if (selectedSportsFacilities.length > 0) {
      params['sportsFacilities'] = selectedSportsFacilities
    }
    if (globals.userLlatLng != null) {
      params['latitude'] = globals.userLlatLng.latitude;
      params['longitude'] = globals.userLlatLng.longitude;
    } else {
      params['latitude'] = globals.defaultLatLng.latitude;
      params['longitude'] = globals.defaultLatLng.longitude;
    }
    let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
    //let queryString = $.param(params);
    console.log(queryString);

    let data = $.getJSON('http://localhost:8001/query?' + queryString, function () {
      $.when(data).done(function () {
        console.log('FILTER RESPONSE')
        console.log(data)
        return data
      });
      const geojson = data.responseJSON;
      console.log(geojson)
      //let overlayLayers = addPolygons(geojson, map);

    });
  });
}

function addPolygons(data, map) {
  let geojson = data.features;
  let polyLayerGroup = new L.FeatureGroup();
  let pointLayerGroup = new L.FeatureGroup();
  map.addLayer(polyLayerGroup);
  map.addLayer(pointLayerGroup);
  globals.layerGroupIDs = {
    'Site Markers': pointLayerGroup._leaflet_id,
    'Playground Polygons': polyLayerGroup._leaflet_id
  }

  for (let i = 0; i < geojson.length; i++) {
    var gCoords = geojson[i].geometry.coordinates;
    var lCoords = []
    for (let i = 0; i < gCoords.length; i++) {
      let gLon = gCoords[i][0]
      let gLat = gCoords[i][1]
      lCoords.push([gLat, gLon])
    }

    var polygon = L.polygon(lCoords, {
      weight: 1,
      fillOpacity: 0.7,
      color: '#FF9933',
    });

    polyLayerGroup.addLayer(polygon);

    var center = polygon.getBounds().getCenter();
    const centerArray = [center.lat, center.lng]

    var icon = L.icon({
      iconUrl: 'img/icons/playground.png',
      shadowUrl: 'img/icons/playground_shadow.png',

      iconAnchor:   [26, 44], // point of the icon which will correspond to marker's location
      shadowAnchor: [26, 44],  // the same for the shadow
      popupAnchor:  [0, 0] // point from which the popup should open relative to the iconAnchor
    });

    let marker = new L.Marker(centerArray, {icon: icon})
    pointLayerGroup.addLayer(marker)
  }

  return {
    'Site Markers': pointLayerGroup,
    'Playground Outlines': polyLayerGroup
  }
}


$(document).ready(function() {
  // executes when HTML-Document is loaded and DOM is ready
  var collapseElementList = [].slice.call(document.querySelectorAll('.collapse'))
  var collapseList = collapseElementList.map(function (collapseEl) {
    return new bootstrap.Collapse(collapseEl)
  })

  $('[data-toggle="offcanvas"], #navToggle').on('click', function () {
    $('.offcanvas-collapse').toggleClass('open')
  })
  distanceSlider();
  applyFilters();
  mapFactory();


// document ready
});
