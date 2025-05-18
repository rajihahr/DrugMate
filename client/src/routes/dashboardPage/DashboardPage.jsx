import './dashboardPage.css';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Upload from '../../components/upload/Upload';
import { IKImage } from 'imagekitio-react';

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {}
  });
  
  const mutation = useMutation({
    mutationFn: (text) => {
      setIsSubmitting(true);
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          img: img?.dbData?.filePath || undefined
        }),
      }).then((res) => res.json());
    },
    onSuccess: (id) => {
      // Store a flag in sessionStorage to prevent duplicate initial messages
      sessionStorage.setItem(`chat_${id}_initial_sent`, "true");
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      // Navigate to the chat page
      navigate(`/dashboard/chats/${id}`);
    },
    onError: () => {
      setIsSubmitting(false);
    }
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text || text.trim() === "" || isSubmitting) return;
    mutation.mutate(text);
  };
  
  // Handle clicks on option buttons
  const handleOptionClick = (option) => {
    switch(option) {
      case 'chat':
        // Focus on input field
        const inputElement = document.querySelector('.formContainer input[type="text"]');
        if (inputElement) inputElement.focus();
        break;
      case 'drugInteraction':
        // Navigate to drug interaction checker page
        navigate('/drug-interaction');
        break;
      case 'emergency':
        // Navigate to emergency assistance page
        navigate('/emergency');
        break;
      default:
        break;
    }
  };
  
  return (
    <div className='dashboardPage'>
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>DrugMate</h1>
        </div>
      </div>
      
      <div className="option-buttons">
        <button 
          className="option-button"
          onClick={() => handleOptionClick('chat')}
        >
          <div className="option-content">
            <img src="/chat.png" alt="" className="option-icon" />
            <span className="option-text">Start New Chat</span>
          </div>
        </button>
        
        <button 
          className="option-button"
          onClick={() => handleOptionClick('drugInteraction')}
        >
          <div className="option-content">
            <img src="/drug-interaction.png" alt="" className="option-icon" />
            <span className="option-text">Drug Interaction Checker</span>
          </div>
        </button>
        
        <button 
          className="option-button"
          onClick={() => handleOptionClick('emergency')}
        >
          <div className="option-content">
            <img src="/emergency.png" alt="" className="option-icon" />
            <span className="option-text">Emergency Assistance</span>
          </div>
        </button>
      </div>
      
      {/* Image preview */}
      {img.isLoading && <div className="loading-indicator">Loading image...</div>}
      {img?.dbData?.filePath && (
        <div className="image-preview">
          <IKImage
            urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
            path={img.dbData.filePath}
            width="300"
            transformation={[{ width: 300 }]}
          />
        </div>
      )}
      
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <Upload setImg={setImg} />
          <input id="file" type="file" multiple={false} hidden />
          <input
            type="text"
            name="text"
            placeholder="Ask about medications, side effects, or health concerns..."
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>
            <img src="/arrow.png" alt="" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DashboardPage;