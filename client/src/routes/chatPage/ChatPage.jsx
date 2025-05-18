import './chatPage.css'
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import { IKImage } from 'imagekitio-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Upload from '../../components/upload/Upload'; // Adjust the path to match your project structure

const ChatPage = () => {
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {}
  });
  
  const endRef = useRef(null);
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  
  // Query for getting chat data
  const { isPending, error: fetchError, data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`, {
        credentials: "include",
      }).then((res) => res.json()),
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data, isGenerating]);
  
  // Mutation for generating AI response
  const generateResponseMutation = useMutation({
    mutationFn: (message) => {
      setIsGenerating(true);
      setError("");
      
      return fetch(`${import.meta.env.VITE_API_URL}/api/generate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: chatId,
          message,
          img: img?.dbData?.filePath || undefined,
        }),
      }).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to generate response");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      // Invalidate and refetch after successful generation
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      
      // Reset form and image
      if (formRef.current) formRef.current.reset();
      setImg({
        isLoading: false,
        error: "",
        dbData: {},
        aiData: {}
      });
      
      // Set generating to false after data is refreshed
      setTimeout(() => {
        setIsGenerating(false);
      }, 100);
    },
    onError: (err) => {
      console.error(err);
      setError("Failed to generate a response. Please try again.");
      setIsGenerating(false);
    }
  });
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text || text.trim() === "") return;
    
    generateResponseMutation.mutate(text);
  };
  
  // Handle initial message when opening a new chat
  // Using similar approach to the example you shared
  const hasRun = useRef(false);
  
  useEffect(() => {
    // Only run this effect once when data is available
    // This is the key difference - we don't depend on isGenerating here
    if (data && !hasRun.current) {
      // Check if there's only the initial message
      if (data.history.length === 1) {
        // Generate response for the initial message
        const initialMessage = data.history[0].parts[0].text;
        generateResponseMutation.mutate(initialMessage);
      }
      // Mark as run regardless
      hasRun.current = true;
    }
  }, [data]); // Only depend on data changes, not isGenerating
  
  return (
    <div className="chatPage">
      <div className="wrapper">
        <div className="chat">
          {/* Chat history */}
          {isPending
            ? "Loading..."
            : fetchError
            ? "Something went wrong!"
            : data?.history?.map((message, i) => (
                <div key={i} className="message-container">
                  {message.img && (
                    <IKImage
                      urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                      path={message.img}
                      height="300"
                      width="400"
                      transformation={[{ height: 300, width: 400 }]}
                      loading="lazy"
                      lqip={{ active: true, quality: 20 }}
                    />
                  )}
                  <div className={message.role === "user" ? "message user" : "message"}>
                    <Markdown>{message.parts[0].text}</Markdown>
                  </div>
                </div>
              ))}
          
          {/* Image preview for current upload */}
          {img.isLoading && <div className='loading-indicator'>Loading image...</div>}
          {img?.dbData?.filePath && (
            <div className="message-container">
              <IKImage
                urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                path={img.dbData.filePath}
                width="380"
                transformation={[{ width: 380 }]}
              />
            </div>
          )}
          
          {/* Loading indicator for AI response */}
          {isGenerating && (
            <div className='message generating'>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && <div className='error-message'>{error}</div>}
          
          {/* Invisible element for scrolling to bottom */}
          <div className="endChat" ref={endRef}></div>
          
          {/* Input form */}
          <form className='newForm' onSubmit={handleSubmit} ref={formRef}>
            <Upload setImg={setImg} />
            <input id="file" type="file" multiple={false} hidden />
            <input 
              type="text" 
              name="text" 
              placeholder='Ask about medications, side effects, or health concerns...' 
              disabled={isGenerating}
            />
            <button type="submit" disabled={isGenerating}>
              <img src="/arrow.png" alt="" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;