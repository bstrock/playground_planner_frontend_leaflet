var globals = {
  userLatLng: null,
  defaultLatLng: {
    lat: 44.8547,
    lng: -93.4708
  }
}

function mapFactory() {


  let map = L.map('map', {zoomControl: false}).setView([44.8547, -93.4708], 13);
  map.on('click', function (){
    $('.offcanvas-collapse').removeClass('open')
    console.log('CLICK')
  })
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
    globals['latlng'] = e.latlng;
    L.marker(e.latlng).addTo(map);
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
    console.log("IN QUERY AJAX BEFORE ADDPOLYGONS");
    let overlayLayers = addPolygons(geojson, map);
    globals['overlayLayers'] = overlayLayers;
    console.log("IN QUERY AJAX AFTER ADDPOLYGONS");
    let layerControl = new L.control.layers(baseLayers, overlayLayers).addTo(map);
    console.log('END OF MAPFACTORY');
    applyFilters(map, layerControl);

  });

}


function distanceSlider() {
  $("#distance-slider").on('input', function(){

    let rad = $(this).val() * .5;
    $('#distance-label').html(rad + " ");
  });
}

function applyFilters(map, layerControl) {
  console.log("TOP OF APPLYFILTERS")
  console.log(map)
  $('#apply-filters').click(function() {
    let filterValues = {
      radius: 0,
      equipment: [],
      amenities: [],
      sports_facilities: []
    }
    console.log('INSIDE JQ SELECTOR CLICK ANONYMOUS FUNCTION')
    let params = {
      'radius': $('#distance-slider').val() * .5
    }

    let selectedEquipment = [];
    let selectedAmenities = [];
    let selectedSportsFacilities = [];

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
      params['sports_facilities'] = selectedSportsFacilities
    }
    globals.latlng != null ? params['latitude'] = globals.latlng.lat : params['latitude'] = globals.defaultLatLng.lat
    globals.latlng != null ? params['longitude'] = globals.latlng.lng : params['longitude'] = globals.defaultLatLng.lng
    let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
    //let queryString = $.param(params);

    let data = $.getJSON('http://localhost:8001/query?' + queryString, function () {
      $.when(data).done(function () {
        console.log('FILTER RESPONSE CALLBACK');
        console.log(map);
        return data;
      });

      const geojson = data.responseJSON;
      console.log('AFTER UNPACKING GEOJSON');
      map.eachLayer(function(layer){
        if (!layer.hasOwnProperty('_url')) {
          map.removeLayer(layer);
        }
      });
      let center = [params['latitude'], params['longitude']];

      L.marker(center).addTo(map);
      let searchRadius = L.circle(center, (params['radius'] * 1609.34), {color: 'grey', opacity: .4}).addTo(map);
      let zoomRadius = L.circle(center, .9 * (params['radius'] * 1609.34), {color: 'white', opacity: 0}).addTo(map);
      map.fitBounds(zoomRadius.getBounds());
      map.removeLayer(zoomRadius);
      layerControl.removeLayer(globals.overlayLayers['Site Markers']);
      layerControl.removeLayer(globals.overlayLayers['Playground Outlines']);

      let overlayLayers = addPolygons(geojson, map);
      globals.overlayLayers = overlayLayers;
      layerControl.addOverlay(overlayLayers['Site Markers'], 'Site Markers');
      layerControl.addOverlay(overlayLayers['Playground Outlines'], 'Playground Outlines');
      layerControl.addOverlay(searchRadius, 'Search Radius')
      $('.offcanvas-collapse').toggleClass('open')

    });
  });
}

function addPolygons(data, map) {
  console.log("ADDPOLYGONS")
  console.log(map)
  let geojson = data.features;
  let polyLayerGroup = new L.FeatureGroup();
  let pointLayerGroup = new L.FeatureGroup();
  map.addLayer(polyLayerGroup);
  map.addLayer(pointLayerGroup);

  let bounds = $.getJSON('./json/ep_boundary.json', function(){
    $.when(bounds).done(function() {
      console.log(bounds.responseJSON);
      L.geoJSON(bounds.responseJSON, {
        style: {color: 'grey', opacity: .3}
      }).addTo(map);

    })
  });
  console.log(bounds.reponseJSON)



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

  var offcanvasElementList = [].slice.call(document.querySelectorAll('.offcanvas'))
  var offcanvasList = offcanvasElementList.map(function (offcanvasEl) {
    return new bootstrap.Offcanvas(offcanvasEl)
  })

  $('[data-toggle="offcanvas"], #navToggle').on('click', function () {
    $('.offcanvas-collapse').toggleClass('open')
  })
  distanceSlider();
  mapFactory();


// document ready
});
