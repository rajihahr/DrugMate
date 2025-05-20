import './emergencyPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const EmergencyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create a mutation to create a new emergency assistance chat
  const createEmergencyChatMutation = useMutation({
    mutationFn: () => {
      setIsSubmitting(true);
      
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          useGemini: true, // Flag to use GeminiService
          chatType: "emergency", // Specify chat type for GeminiService
          isEmergency: true // Flag to indicate this is an emergency chat
        }),
      }).then((res) => res.json());
    },
    onSuccess: (id) => {
      // Prevent duplicate initial response
      sessionStorage.setItem(`chat_${id}_initial_sent`, "true");
      
      // Set a flag to show emergency-specific features in the chat
      sessionStorage.setItem(`chat_${id}_emergency`, "true");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      
      // Navigate to the new chat
      navigate(`/dashboard/chats/${id}`);
    },
    onError: () => {
      console.error("Error creating emergency chat");
      setIsSubmitting(false);
    }
  });
  
  const handleStartEmergencyChat = () => {
    createEmergencyChatMutation.mutate();
  };
  
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title emergency-title">Emergency Assistance</h1>
          <p className="page-description">
            If you're experiencing a medical emergency, please call emergency services immediately. 
            If you need guidance or assistance, our AI can help assess your situation and provide appropriate support.
          </p>
        </div>
        
        <div className="action-area">
          <div className="emergency-levels">
            <div className="emergency-level critical">
              <h2>For Immediate Emergencies</h2>
              <div className="phone-number">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>911</span>
              </div>
              <ul className="emergency-examples">
                <li>Severe chest pain</li>
                <li>Difficulty breathing</li>
                <li>Severe bleeding</li>
                <li>Unconsciousness</li>
              </ul>
            </div>
            
            <div className="emergency-level assistance">
              <h2>Need Help or Advice?</h2>
              <p>
                Our AI can help assess your situation, provide first aid guidance, 
                locate nearby healthcare facilities, or connect you with appropriate resources.
              </p>
              <button 
                className="start-chat-button" 
                onClick={handleStartEmergencyChat}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Starting Chat..." : "Start Emergency Chat"}
              </button>
            </div>
          </div>
        </div>
        
        <div className="emergency-contacts">
          <h2>Other Emergency Resources</h2>
          <div className="contact-cards">
            <div className="contact-card">
              <h3>Poison Control</h3>
              <p className="phone-number">1-800-222-1222</p>
              <p className="card-description">For exposure to harmful substances</p>
            </div>
            
            <div className="contact-card">
              <h3>Crisis Helpline</h3>
              <p className="phone-number">988</p>
              <p className="card-description">For mental health crises and suicide prevention</p>
            </div>
          </div>
        </div>
        
        <div className="back-button-container">
          <button
            className="outline-button back-button"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
          >
            Return to Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;