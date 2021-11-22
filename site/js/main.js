var globals = {
  userLatLng: null,
  defaultLatLng: {
    lat: 44.8497,
    lng: -93.46
  }
}

function mapFactory() {


  let map = L.map('map', {zoomControl: false}).setView([44.855, -93.46], 13);
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
  map.locate({setView: false})
  function onLocationFound(e) {
    globals['latlng'] = e.latlng;

  }

  map.on('locationfound', onLocationFound);

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
    globals.overlayLayers = overlayLayers;



    console.log("IN QUERY AJAX AFTER ADDPOLYGONS");
    let layerControl = new L.control.layers(baseLayers, overlayLayers).addTo(map);

    let bounds = $.getJSON('./json/ep_boundary.json', function () {
      $.when(bounds).done(function () {

        let epBoundary = L.geoJSON(bounds.responseJSON, {
          style: {color: 'black', fillOpacity: 0}
        }).addTo(map);
        layerControl.addOverlay(epBoundary, 'Eden Prairie City Boundary');
        overlayLayers['Eden Prairie City Boundary'] = epBoundary;
      })
    });

    console.log('END OF MAPFACTORY');
    applyFilters(map, layerControl);
    reinitializeMapOverlays(map, layerControl);
    distanceSlider();



  });

}

function reinitializeMapOverlays(map, layerControl) {
  $("#reset-filters").click(function() {
    let data = $.getJSON('http://localhost:8001/query?latitude=44.8547&longitude=-93.4708&radius=10', function () {
      $.when(data).done(function () {
        return data
      });
      const geojson = data.responseJSON;
      console.log("IN QUERY AJAX BEFORE ADDPOLYGONS");

      // REMOVE EXISTING LAYERS
      map.eachLayer(function(layer){
        // DON'T REMOVE BASE LAYERS
        if (!layer.hasOwnProperty('_url')) {
          map.removeLayer(layer);
        }
      });

      layerControl.removeLayer(globals.overlayLayers['Site Markers']);
      layerControl.removeLayer(globals.overlayLayers['Playground Outlines']);
      layerControl.removeLayer(globals.overlayLayers['Eden Prairie City Boundary'])
      if (globals.overlayLayers.hasOwnProperty('Search Radius')) {
        layerControl.removeLayer(globals.overlayLayers['Search Radius'])
      }

      let overlayLayers = addPolygons(geojson, map);
      globals.overlayLayers = overlayLayers;

      console.log("IN QUERY AJAX AFTER ADDPOLYGONS");

      let bounds = $.getJSON('./json/ep_boundary.json', function () {
        $.when(bounds).done(function () {

          let epBoundary = L.geoJSON(bounds.responseJSON, {
            style: {color: 'black', fillOpacity: 0}
          }).addTo(map);
          layerControl.addOverlay(epBoundary, 'Eden Prairie City Boundary');
          overlayLayers['Eden Prairie City Boundary'] = epBoundary;
        })
      });

      layerControl.addOverlay(overlayLayers['Site Markers'], 'Site Markers');
      layerControl.addOverlay(overlayLayers['Playground Outlines'], 'Playground Outlines');
      map.setView([44.855, -93.4708], 12.5)
      console.log('END OF RE-INITIALIZE MAP OVERLAYS');

      $('#distance-slider').val(8)


      $("#equipmentAccordion").children("input:checked").map(function() {
        this.checked = false;
      });

      $("#amenitiesAccordion").children("input:checked").map(function() {
        this.checked = false;
      });

      $("sportsFacilitiesAccordion").children("input:checked").map(function() {
        this.checked = false;
      });
      $('#distance-label').html("4 ");

      $('.offcanvas-collapse').toggleClass('open')


    });
  });
}

function distanceSlider() {
  $("#distance-slider").on('input', function(){

    let rad = $(this).val() * .5;
    $('#distance-label').html(rad + " ");
  });
}

function resetFilters() {
  console.log("TOP OF RESETFILTERS")
  $('#reset-filters').click(function() {
    console.log('CLICKED RESET FILTERS')
  })

}

function applyFilters(map, layerControl) {
  console.log("TOP OF APPLYFILTERS")
  console.log(map)
  $('#apply-filters').click(function() {

    // GET THE SEARCH RADIUS
    console.log('INSIDE JQ SELECTOR CLICK ANONYMOUS FUNCTION')
    let params = {
      'radius': $('#distance-slider').val() * .5
    }

    // GET THE CHECKED FILTER OPTIONS
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

    // CHECK FOR SELECTIONS AND ADD TO QUERY PARAMETERS
    if (selectedEquipment.length > 0) {
      params['equipment'] = selectedEquipment
    }
    if (selectedAmenities.length > 0) {
      params['amenities'] = selectedAmenities
    }
    if (selectedSportsFacilities.length > 0) {
      params['sports_facilities'] = selectedSportsFacilities
    }

    // GET THE LAT/LNG; USE DEFAULT IF USER NOT LOCATED
    globals.latlng != null ? params['latitude'] = globals.latlng.lat : params['latitude'] = globals.defaultLatLng.lat
    globals.latlng != null ? params['longitude'] = globals.latlng.lng : params['longitude'] = globals.defaultLatLng.lng

    // BUILD THE QUERY STRING
    let queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
    //let queryString = $.param(params);

    // SEND THE QUERY AND GET THE DATA
    let data = $.getJSON('http://localhost:8001/query?' + queryString, function () {
      $.when(data).done(function () {
        console.log('FILTER RESPONSE CALLBACK');

        return data;
      });

      // UNPACK THE GEOJSON
      const geojson = data.responseJSON;
      console.log('AFTER UNPACKING GEOJSON');

      // REMOVE EXISTING LAYERS
      map.eachLayer(function(layer){
        // DON'T REMOVE BASE LAYERS
        if (!layer.hasOwnProperty('_url')) {
          map.removeLayer(layer);
        }
      });

      // DEFINE CENTER OF QUERY
      let center = [params['latitude'], params['longitude']];

      // ADD A MARKER FOR THE CENTER (USER LOCATION OR DEFAULT)
      // ALSO ADD A CIRCLE FOR THE SEARCH RADIUS VALUE
      // USE A ZOOM CIRCLE TO MAKE THE VIEW A LITTLE TIGHTER
      L.marker(center).addTo(map);
      let searchRadius = L.circle(center, (params['radius'] * 1609.34), {color: 'grey', opacity: .4}).addTo(map);
      let zoomRadius = L.circle(center, .8 * (params['radius'] * 1609.34), {color: 'white', opacity: 0}).addTo(map);
      map.fitBounds(zoomRadius.getBounds());
      map.removeLayer(zoomRadius);
      layerControl.removeLayer(globals.overlayLayers['Site Markers']);
      layerControl.removeLayer(globals.overlayLayers['Playground Outlines']);
      layerControl.removeLayer(globals.overlayLayers['Eden Prairie City Boundary'])
      if (globals.overlayLayers.hasOwnProperty('Search Radius')) {
        layerControl.removeLayer(globals.overlayLayers['Search Radius'])
      }

      // ADD THE QUERY-RETURNED SITES TO THE MAP
      let overlayLayers = addPolygons(geojson, map);

      let bounds = $.getJSON('./json/ep_boundary.json', function () {
        $.when(bounds).done(function () {
          console.log(bounds.responseJSON);
          let epBoundary = L.geoJSON(bounds.responseJSON, {
            style: {color: 'black', fillOpacity: 0}
          }).addTo(map);
          overlayLayers['Eden Prairie City Boundary'] = epBoundary;
          layerControl.addOverlay(epBoundary, 'Eden Prairie City Boundary')

        })
      });

      overlayLayers['Search Radius'] = searchRadius;

      // SITUATE LAYERS IN LAYER CONTROL
      globals.overlayLayers = overlayLayers;
      console.log(overlayLayers)
      layerControl.addOverlay(overlayLayers['Site Markers'], 'Site Markers');
      layerControl.addOverlay(overlayLayers['Playground Outlines'], 'Playground Outlines');
      layerControl.addOverlay(searchRadius, 'Search Radius')


      // CLOSE THE SIDEBAR TO RETURN VIEW TO MAP
      $('.offcanvas-collapse').toggleClass('open')

    });
  });
}

function popupFactory(feature, center) {
  console.log("START OF POPUPFACTORY")


  let props = feature.properties;
  console.log(props)

  let directionsUrl = 'https://www.google.com/maps/dir/Current+Location/' + center.lat + ',' + center.lng


  let popupString = `
  <div class="container">
    <div class="card">
        <div class="card-header lead text-center">`
          + props.site_name +
        `</div>
        <div class="card-body row address-box">
            <div class="col container popup-address">
                
                    <span class="text-md mt-1"><b>Address: </b></span><br>
                    <span class="text-left">`
                    + props.addr_street1 + '<br>' + props.addr_city + ', ' + props.addr_state + ' '+ props.addr_zip +
                  `</span>
                
                
          </div>
          <div class="col container">
            <span class="text-right align-right w-25">
                <a href="` + directionsUrl + `" type="button" class="btn btn-light directions-button" target="_blank" rel="noopener noreferrer">Directions</a>
            </span>
          </div>
        </div>
    </div>
  </div>
  `


  return popupString
}

function addPolygons(data, map) {
  console.log("ADDPOLYGONS")
  console.log(map)
  let geojson = data.features;
  let polyLayerGroup = new L.FeatureGroup();
  let pointLayerGroup = new L.FeatureGroup();
  map.addLayer(polyLayerGroup);
  map.addLayer(pointLayerGroup);

  let overlayLayer = {
    'Site Markers': pointLayerGroup,
    'Playground Outlines': polyLayerGroup
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

      iconAnchor: [26, 44], // point of the icon which will correspond to marker's location
      shadowAnchor: [26, 44],  // the same for the shadow
      popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
    });

    let marker = new L.Marker(centerArray, {icon: icon})
    let popupString = popupFactory(geojson[i], center) // we're in a loop, remember?
    let popup = L.popup({maxWidth: 350, minWidth: 350})
        .setLatLng(center)
        .setContent(popupString)
    marker.bindPopup(popup)
    pointLayerGroup.addLayer(marker)
  }

  return overlayLayer
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
  mapFactory();



// document ready
});
