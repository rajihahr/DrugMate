import React, { useState, useEffect } from 'react';
import './emergencySuggestion.css';
import { useJsApiLoader } from '@react-google-maps/api';
import HealthcareFacilitiesMap from '../healthcareFacilitiesMap/HealthcareFacilitiesMap';

// Define libraries to load
const libraries = ['places', 'geometry'];

const EmergencySuggestion = () => {
  // Add state for a manual location input
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [locationStatus, setLocationStatus] = useState('initial'); // initial, loading, success, error
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locationError, setLocationError] = useState("Unable to access your location. Please allow location access or try again.");
  
  // Load Google Maps API using the useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    version: 'weekly', // Ensure we're getting the latest version with AdvancedMarkerElement
  });
  
  // Extracted search functionality for reuse
  const searchNearbyHealthcareFacilities = (latitude, longitude) => {
    // Create a PlacesService instance
    // Create an actual DOM element for the PlacesService to avoid errors
    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);
    
    const placesService = new window.google.maps.places.PlacesService(mapDiv);
    
    // Define the request to search for healthcare facilities
    const request = {
      location: new window.google.maps.LatLng(latitude, longitude),
      radius: 5000, // 5km radius - use number instead of string
      types: ['hospital', 'health'], // Use types array instead of type
      keyword: 'hospital OR emergency OR urgent care OR clinic'
    };
    
    // Perform the search
    placesService.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Process the results
        const facilities = results.map(place => {
          // Calculate distance
          const placeLocation = place.geometry.location;
          const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
            new window.google.maps.LatLng(latitude, longitude), 
            placeLocation
          );
          
          // Round to one decimal place and convert to miles
          const distanceInMiles = (distance / 1609.34).toFixed(1);
          
          return {
            name: place.name,
            distance: `${distanceInMiles} miles`,
            distanceValue: distance,
            address: place.vicinity,
            phone: place.formatted_phone_number || 'Not available',
            open: null, // We'll determine this using getDetails() instead
            placeId: place.place_id,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(place.name + ' ' + place.vicinity)}`
          };
        });
        
        // Sort by distance and take top 3
        facilities.sort((a, b) => a.distanceValue - b.distanceValue);
        const topFacilities = facilities.slice(0, 3);
        
        // Set basic facilities data immediately
        setNearbyFacilities(topFacilities);
        setLocationStatus('success');
        setShowMap(true);
        
        // Get additional details for each facility asynchronously
        topFacilities.forEach(facility => {
          const detailRequest = {
            placeId: facility.placeId,
            fields: ['formatted_phone_number', 'opening_hours', 'url']
          };
          
          try {
            placesService.getDetails(detailRequest, (place, detailStatus) => {
              if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                // Update facilities with additional details
                setNearbyFacilities(prevFacilities => 
                  prevFacilities.map(f => {
                    if (f.placeId === facility.placeId) {
                      let isOpenNow = null;
                      
                      // Use isOpen() method instead of open_now property
                      if (place.opening_hours) {
                        try {
                          isOpenNow = place.opening_hours.isOpen();
                        } catch (e) {
                          console.warn("Error calling isOpen()", e);
                          isOpenNow = null;
                        }
                      }
                      
                      return {
                        ...f,
                        phone: place.formatted_phone_number || f.phone,
                        open: isOpenNow,
                        mapsUrl: place.url || f.mapsUrl
                      };
                    }
                    return f;
                  })
                );
              }
            });
          } catch (error) {
            console.error("Error getting place details:", error);
            // Continue with basic information if details fail
          }
        });
      } else {
        console.error("Error fetching nearby places:", status);
        setLocationStatus('error');
        setLocationError("No healthcare facilities found nearby. Please try a different location.");
      }
    });
  };
  
  // Fallback function when geolocation fails - use a default location or manual input
  const handleGeolocationError = () => {
    // For testing purposes, use a default location
    // In a real app with real users, you might want to use a location relevant to your audience
    const defaultLat = 5.4145; // Penang, Malaysia coordinates for more relevant testing
    const defaultLng = 100.3292;
    
    console.log("Using default location (Penang, Malaysia) for testing purposes");
    
    // Store the default location 
    setUserLocation({ lat: defaultLat, lng: defaultLng });
    
    // Continue with the search using the default location
    searchNearbyHealthcareFacilities(defaultLat, defaultLng);
  };
  
  // Function to find nearby healthcare facilities
  const findNearbyHealthcare = () => {
    if (!isLoaded) {
      console.error("Google Maps not loaded yet");
      return;
    }
    
    if (loadError) {
      console.error("Error loading Google Maps:", loadError);
      setLocationStatus('error');
      setLocationError("Error loading maps service. Please try again later.");
      return;
    }
    
    setLocationStatus('loading');
    
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Store user's location
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Continue with the search using the user's location
          searchNearbyHealthcareFacilities(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMessage = "Unable to access your location.";
          
          // Provide more specific error messages based on error code
          if (error.code === 1) {
            errorMessage = "Location permission denied. Please allow location access in your browser settings.";
          } else if (error.code === 2) {
            errorMessage = "Your location is currently unavailable. Using default location instead.";
            // Automatically use default location for this specific error
            handleGeolocationError();
            return;
          } else if (error.code === 3) {
            errorMessage = "Location request timed out. Please try again.";
          }
          
          setLocationStatus('error');
          setLocationError(errorMessage);
        },
        {
          // Geolocation options
          enableHighAccuracy: false, // Use less precise location for faster response
          timeout: 10000, // 10 second timeout
          maximumAge: 60000 // Accept cached positions up to 1 minute old
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser");
      setLocationStatus('error');
      setLocationError("Geolocation is not supported by your browser. Please use a different browser or enter a location manually.");
    }
  };
  
  // Clean up DOM elements when component unmounts
  useEffect(() => {
    return () => {
      // Remove any appended DOM elements
      const mapDivs = document.querySelectorAll('div[style="display: none;"]');
      mapDivs.forEach(div => {
        if (document.body.contains(div)) {
          document.body.removeChild(div);
        }
      });
    };
  }, []);
  
  return (
    <div className="emergency-suggestion">
      <div className="suggestion-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
        <h3>Need Healthcare Nearby?</h3>
      </div>
      
      <div className="suggestion-content">
        {locationStatus === 'initial' && (
          <>
            <p>I can help you find the nearest hospitals and urgent care centers based on your current location.</p>
            <button 
              className="find-healthcare-button"
              onClick={findNearbyHealthcare}
              disabled={!isLoaded}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3"></circle>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
              </svg>
              <span>Find Nearby Healthcare</span>
            </button>
            {!isLoaded && <p className="maps-loading">Loading maps service...</p>}
            {loadError && <p className="maps-error">Error loading maps service. Please try again later.</p>}
          </>
        )}
        
        {locationStatus === 'loading' && (
          <div className="location-loading">
            <div className="loading-spinner"></div>
            <p>Finding nearby healthcare facilities...</p>
          </div>
        )}
        
        {locationStatus === 'error' && (
          <div className="location-error">
            <p>{locationError}</p>
            <button 
              className="retry-button"
              onClick={findNearbyHealthcare}
            >
              Try Again
            </button>
            {/* Add a manual location input option */}
            <div className="manual-location-option">
              <p>Or use a default location for testing:</p>
              <button
                className="manual-location-button"
                onClick={handleGeolocationError}
              >
                Use Default Location
              </button>
            </div>
          </div>
        )}
        
        {locationStatus === 'success' && (
          <div className="nearby-facilities">
            <p>Here are healthcare facilities near you:</p>
            <div className="facilities-list">
              {nearbyFacilities.map((facility, index) => (
                <div key={index} className="facility-card">
                  <div className="facility-header">
                    <h4>{facility.name}</h4>
                    <span className="distance">{facility.distance}</span>
                  </div>
                  <p className="facility-address">{facility.address}</p>
                  <div className="facility-footer">
                    <span className="facility-phone">{facility.phone}</span>
                    <span className={`facility-status ${facility.open ? 'open' : facility.open === false ? 'closed' : 'unknown'}`}>
                      {facility.open ? 'Open Now' : facility.open === false ? 'Closed' : 'Hours Unknown'}
                    </span>
                  </div>
                  <a 
                    href={facility.mapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="directions-link"
                  >
                    Get Directions
                  </a>
                </div>
              ))}
            </div>
            
            {/* Show map with healthcare facilities */}
            {showMap && isLoaded && userLocation && nearbyFacilities.length > 0 && (
              <div className="map-container">
                <HealthcareFacilitiesMap 
                  facilities={nearbyFacilities}
                  userLocation={userLocation}
                  isLoaded={isLoaded} // Pass isLoaded to prevent double loading
                />
              </div>
            )}
            
            <div className="facility-note">
              <p>
                <strong>Note:</strong> In case of emergency, please call 911 immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencySuggestion;