var globals = {
  userLatLng: null,
  defaultLatLng: {
    lat: 44.8497,
    lng: -93.46
  }
}

function mapFactory() {


  let map = L.map('map', {zoomControl: false}).setView([44.855, -93.46], 12.5);
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
    starsSlider();
    loginUser(map, layerControl);


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

      if (globals.hasOwnProperty('user')) {
        layerControl.removeLayer(globals.userFavoriteOverlay['User Favorites']);
        configureUserFavorites(map, globals.user)
        layerControl.addOverlay(globals.userFavoriteOverlay['User Favorites'], 'User Favorites');
      }

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

      map.setView([44.855, -93.46], 13)
      console.log('END OF RE-INITIALIZE MAP OVERLAYS');

      $('#distance-slider').val(8)


      $("#equipmentAccordion").children("input:checked").map(function() {
        this.checked = false;
      });

      $("#amenitiesAccordion").children("input:checked").map(function() {
        this.checked = false;
      });

      $("#sportsFacilitiesAccordion").children("input:checked").map(function() {
        this.checked = false;
      });
      $('#distance-label').html("4 ");

      $('.offcanvas-collapse').removeClass('open')

    });
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
          let epBoundary = L.geoJSON(bounds.responseJSON, {
            style: {color: 'black', fillOpacity: 0}
          }).addTo(map);
          overlayLayers['Eden Prairie City Boundary'] = epBoundary;
          layerControl.addOverlay(epBoundary, 'Eden Prairie City Boundary')

        })
      });
      if (globals.hasOwnProperty('user')) {
        layerControl.removeLayer(globals.userFavoriteOverlay['User Favorites'])
        configureUserFavorites(map, globals.user);
        layerControl.addOverlay(globals.userFavoriteOverlay['User Favorites'], 'User Favorites')
      }

      overlayLayers['Search Radius'] = searchRadius;

      // SITUATE LAYERS IN LAYER CONTROL
      globals.overlayLayers = overlayLayers;

      layerControl.addOverlay(overlayLayers['Site Markers'], 'Site Markers');
      layerControl.addOverlay(overlayLayers['Playground Outlines'], 'Playground Outlines');
      layerControl.addOverlay(searchRadius, 'Search Radius')


      // CLOSE THE SIDEBAR TO RETURN VIEW TO MAP
      $('.offcanvas-collapse').toggleClass('open')

    });
  });
}

function popupFactory(feature, center) {
  const average = (array) => array.reduce((a, b) => a + b) / array.length;
  console.log("START OF POPUPFACTORY")


  let props = feature.properties;
  let keys = Object.keys(props)
  let stars = []
  let comments = []
  let names = []

  if (keys.includes('reviews')) {
    let reviews = props['reviews'];
    for (var i = 0; i < reviews.length; i++) {
      stars.push(reviews[i].stars)
      comments.push(reviews[i].comment)
      names.push(reviews[i].first_name)
    }
  }
  let starText = ''
  if (stars.length > 0) {
    let starVal = Math.round(average(stars))
    for (var i = 0; i < starVal; i++)
    starText += '<img src="img/icons/star.png" height="15" width="15"> '
  } else {
    starText = 'No Reviews'
  }

  if (stars.length > 0) {
    starText += '(' + stars.length + " Reviews)"
  }
  let commentString = ""
  if (comments.length > 0) {
    for (let i = 0; i < comments.length; i++) {
      commentString += '<span class="text-start comment-text"><i>"'+ comments[i] +'"</i></span><br>'
    }
  }
  let directionsUrl = 'https://www.google.com/maps/dir/Current+Location/' + center.lat + ',' + center.lng

  let popupString = `
  <div class="container">
    <div class="card">
        <div class="card-header lead text-center">`
          + props.site_name +
        `</div>
        <div class="card-body row address-box">
            <div class="col container popup-address">
                
                    <span class="text-md mt-1"><h6><b>Address: </b></h6></span>
                    <span class="text-left">`
                    + props.addr_street1 + '<br>' + props.addr_city + ', ' + props.addr_state + ' '+ props.addr_zip +
                  `</span>
          </div>
          <div class="col container">
            <div class="row">
              <span class="text-right align-right w-25">
                  <a href="` + directionsUrl + `" type="button" class="btn custom-button" target="_blank" rel="noopener noreferrer">Directions</a>
              </span>
            </div>
          </div>
          <hr class="divider-line"/>
          <div class="row" id="review-` + props.site_id + `">
                <span><h6><b>User Reviews:</b></h6> `
                + starText +
               `</span>
                <br>
            </div>
            <div class="col container-fluid">`
              + commentString +
            `</div>`

  if (globals.hasOwnProperty('user')){
    // logic to add review
    let submitReviewButton = "<div class='col container-fluid'><button type='button' class='btn custom-button submit-button' id='" + props.site_id + "' data-bs-toggle='modal' data-bs-target='#submitReviewModal'>Submit Review</button></div>"
    popupString += submitReviewButton
    // SPLIT STRING AND APPEND THIS, THEN THE REST
    // TODO: make review modal
    // TODO: attach click listener to button that posts to API
  }

  popupString +=`
            </div>
        </div>
    </div>
  </div>
  `



  return popupString
}

function addPolygons(data, map) {
  console.log("ADDPOLYGONS")
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
    marker.data = geojson[i].properties
    pointLayerGroup.addLayer(marker)
  }

  return overlayLayer
}

function configureUserFavorites(map, user) {
  let userFavoritesLayer = new L.FeatureGroup();
  map.addLayer(userFavoritesLayer);

  // change map marker icon to favorite icon
  map.eachLayer(function (layer) {
    if (layer.hasOwnProperty('data')) {  // it's a marker
      if (user.favorite_parks.includes(layer.data.site_id)) {  // it's a favorite
        // here's the marker
        var icon = L.icon({
          iconUrl: 'img/icons/heart.png',
          shadowUrl: 'img/icons/heart_shadow.png',

          iconAnchor: [33, 65], // point of the icon which will correspond to marker's location
          shadowAnchor: [33, 65],  // the same for the shadow
          popupAnchor: [0, 0] // point from which the popup should open relative to the iconAnchor
        });

        layer.setIcon(icon);
        globals.overlayLayers['Site Markers'].removeLayer(layer);
        userFavoritesLayer.addLayer(layer);
      }
    }
  });

  globals.userFavoriteOverlay = {'User Favorites': userFavoritesLayer}
}

function loginUser(map, layerControl){
  $('#submitLogin').click(function (e){
    //stop submit the form, we will post it manually.

    // Get form
    var form = $('#loginForm')[0];

    // FormData object
    var data = new FormData(form);

    // If you want to add an extra field for the FormData

    // disabled the submit button
    $("#submitLogin").prop("disabled", true);

    // go get a token
    $.ajax({
      type: "POST",
      enctype: 'multipart/form-data',
      url: "http://localhost:8001/token",
      data: data,
      processData: false,
      contentType: false,
      cache: false,
      timeout: 800000,
      success: function (data) {
        // save token data
        globals.token = data
        $("#submitLogin").prop("disabled", false);
        $("#exampleModal").modal('hide')

        // clear map content and reset view
        //reinitializeMapOverlays();

        // get user info
        var url = "http://localhost:8001/users/me/favorites";

        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);

        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Authorization", "Bearer " + globals.token.access_token);

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            // our token was validated
            // get the user data
            var user = JSON.parse(xhr.responseText);
            globals.user = user
            console.log(user)
            // change the login button appropriately
            $("#dropdownMenuButton1").html("Logged in as " + user.first_name + " " + user.last_name)

            // change login/signup buttons to logout button
            // we're going to give the logout button a job in a moment
            $("#loginDropdown").html('<li><button type="button" class="btn width-75 filterButton" id="logoutButton">Log Out </button></li>')
            configureUserFavorites(map, user);

            $("#reset-filters").trigger('click')
            layerControl.addOverlay(globals.userFavoriteOverlay['User Favorites'], 'User Favorites')
            $(document).on('click','.submit-button', function(e) {
              // wtf really though with this
              globals.reviewedSite = this.id
              console.log(globals.reviewedSite)
            });
            // FUNCTIONALITY FOR SUBMIT REVIEW
            $('#submitReviewModalButton').click(function (e) {
              e.preventDefault();
              //stop submit the form, we will post it manually.

              // Get form
              var reviewForm = $('#submitReview')[0];
              console.log(reviewForm)
              // FormData object
              var reviewFormData = new FormData(reviewForm);

              let review = {
                'stars': reviewFormData.get('stars'),
                'comment': reviewFormData.get('comment'),
                'site_id': globals.reviewedSite
              }
              let reviewString = "?stars=" + review.stars + '&comment=' + review.comment + "&site_id=" + review.site_id;

              $("#submitReview").prop("disabled", false);
              $("#submitReviewModal").modal('hide')

              var submitReviewUrl = "http://localhost:8001/submit/review" + reviewString;

              var review_xhr = new XMLHttpRequest();
              review_xhr.open("POST", submitReviewUrl);
              review_xhr.setRequestHeader("Accept", "application/json");
              review_xhr.setRequestHeader("Authorization", "Bearer " + globals.token.access_token);
              review_xhr.onreadystatechange = function () {
                if (review_xhr.readyState === 4) {
                  console.log('oh snaps it worked')
                  }
              }
            review_xhr.send();
            });


          }};

        xhr.send();
        $('.offcanvas-collapse').removeClass('open')

      },
      error: function (e) {
        console.log("ERROR : ", e);
        alert('Unable to log user in.  Please try again.')
        $("#submitLogin").prop("disabled", false);
      }
    });

  });
}
function starsSlider() {
  $("#stars-slider").on('input', function(){

    let stars = $(this).val();
    let starText = '';
    for (var i = 0; i < stars; i++) {
      starText += '<img src="img/icons/star.png" height="25" width="25"> '
  }
    $('#stars-slider-label').html(starText);
  });
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

  var myModal = document.getElementById('myModal')
  var myInput = document.getElementById('myInput')

  //myModal.addEventListener('shown.bs.modal', function () {
  //  myInput.focus()
  //})
  mapFactory();

// document ready
});
