import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './floatingActionButton.css';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.floating-action-button-container')) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const handleFabClick = () => {
    setShowMenu(!showMenu);
  };
  
  const handleDrugInteractionClick = () => {
    navigate('/dashboard/drug-interaction');
    setShowMenu(false);
  };
  
  return (
    <div className="floating-action-button-container">
      {showMenu && (
        <div className="fab-menu">
          <button 
            className="fab-menu-item" 
            onClick={handleDrugInteractionClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <span>Check Drug Interactions</span>
          </button>
        </div>
      )}
      <button className="fab" onClick={handleFabClick} aria-label="More options">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  );
};

export default FloatingActionButton;