import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import './healthcareFacilitiesMap.css';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const HealthcareFacilitiesMap = ({ facilities, userLocation, isLoaded }) => {
  const [map, setMap] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  
  // Skip rendering if Maps API is not loaded
  if (!isLoaded) return <div className="map-loading">Loading map...</div>;
  
  const onLoad = useCallback(function callback(map) {
    // Fit bounds to include all markers and the user's location
    if (facilities && facilities.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add user location to bounds
      bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
      
      // Add all facilities to bounds
      facilities.forEach(facility => {
        bounds.extend(new window.google.maps.LatLng(facility.location.lat, facility.location.lng));
      });
      
      map.fitBounds(bounds);
    }
    
    setMap(map);
  }, [facilities, userLocation]);
  
  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);
  
  return (
    <div className="healthcare-facilities-map">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userLocation}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* User location marker */}
        <Marker
          position={userLocation}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          }}
          title="Your Location"
        />
        
        {/* Facility markers */}
        {facilities.map((facility, index) => (
          <Marker
            key={index}
            position={facility.location}
            onClick={() => setSelectedFacility(facility)}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />
        ))}
        
        {/* Info window for selected facility */}
        {selectedFacility && (
          <InfoWindow
            position={selectedFacility.location}
            onCloseClick={() => setSelectedFacility(null)}
          >
            <div className="facility-info-window">
              <h3>{selectedFacility.name}</h3>
              <p>{selectedFacility.address}</p>
              <p className="facility-distance">{selectedFacility.distance}</p>
              <p className="facility-phone">{selectedFacility.phone}</p>
              <div className="facility-status-container">
                <span className={`facility-status-tag ${selectedFacility.open ? 'open' : selectedFacility.open === false ? 'closed' : 'unknown'}`}>
                  {selectedFacility.open ? 'Open Now' : selectedFacility.open === false ? 'Closed' : 'Hours Unknown'}
                </span>
              </div>
              <a
                href={selectedFacility.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="directions-button"
              >
                Get Directions
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default HealthcareFacilitiesMap;