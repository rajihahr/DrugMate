import React from 'react';
import { useNavigate } from 'react-router-dom';
import './drugInteractionSuggestion.css';

const DrugInteractionSuggestion = () => {
  const navigate = useNavigate();
  
  return (
    <div className="drug-interaction-suggestion">
      <div className="suggestion-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.85 9.85a2 2 0 1 0 2.82 2.82" />
          <path d="M14.76 14.76a6 6 0 0 0-8.48-8.48" />
          <circle cx="17" cy="7" r="2" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
        <h3>Need to check more drugs?</h3>
      </div>
      
      <div className="suggestion-content">
        <p>You can check for interactions between other medications:</p>
        <button 
          className="check-more-button"
          onClick={() => navigate('/dashboard/drug-interaction')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <path d="M9 8h6"/>
            <path d="M8 16h8"/>
            <path d="M12 8v8"/>
          </svg>
          <span>Check Different Drugs</span>
        </button>
      </div>
    </div>
  );
};

export default DrugInteractionSuggestion;