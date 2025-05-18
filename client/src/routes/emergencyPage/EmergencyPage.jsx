import './emergencyPage.css';
import { useNavigate } from 'react-router-dom';

const EmergencyPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="emergency-page">
      <h1>Emergency Assistance</h1>
      <p className="description">
        This page provides quick access to emergency information and services.
      </p>
      
      <div className="emergency-contacts">
        <div className="contact-card">
          <h2>Emergency Services</h2>
          <p className="phone-number">911</p>
          <p className="description">For immediate life-threatening emergencies</p>
        </div>
        
        <div className="contact-card">
          <h2>Poison Control</h2>
          <p className="phone-number">1-800-222-1222</p>
          <p className="description">For exposure to harmful substances</p>
        </div>
        
        <div className="contact-card">
          <h2>Crisis Helpline</h2>
          <p className="phone-number">988</p>
          <p className="description">For mental health crises and suicide prevention</p>
        </div>
      </div>
      
      <div className="emergency-info">
        <h2>First Aid Information</h2>
        <ul className="info-list">
          <li>
            <h3>Choking</h3>
            <p>Perform the Heimlich maneuver by standing behind the person and wrapping your arms around their waist...</p>
          </li>
          <li>
            <h3>CPR Basics</h3>
            <p>Place the heel of your hand on the center of the person's chest. Place your other hand on top and press down hard and fast at a rate of 100-120 compressions per minute...</p>
          </li>
          <li>
            <h3>Severe Bleeding</h3>
            <p>Apply direct pressure to the wound using a clean cloth or bandage. If blood soaks through, add another layer without removing the first...</p>
          </li>
        </ul>
      </div>
      
      <button 
        className="back-button"
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default EmergencyPage;