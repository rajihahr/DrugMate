import './drugInteractionPage.css';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IKImage, IKContext, IKUpload } from 'imagekitio-react';

const DrugInteractionPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const urlEndpoint = import.meta.env.VITE_IMAGE_KIT_ENDPOINT;
  const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY;
  
  // Create refs for uploads - we'll manage these separately
  const uploadRefs = useRef({});
  
  // Function to get or create ref for a drug
  const getUploadRef = (drugId) => {
    if (!uploadRefs.current[drugId]) {
      uploadRefs.current[drugId] = React.createRef();
    }
    return uploadRefs.current[drugId];
  };
  
  // State for multiple drugs - using an array instead of individual drug1/drug2
  const [drugs, setDrugs] = useState([
    {
      id: 1,
      isLoading: false,
      error: "",
      dbData: {},
      aiData: {},
      extractedText: "",
      identifiedDrug: null
    },
    {
      id: 2,
      isLoading: false,
      error: "",
      dbData: {},
      aiData: {},
      extractedText: "",
      identifiedDrug: null
    }
  ]);
  
  // Function to create a new empty drug object
  const createEmptyDrug = (id) => ({
    id,
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
    extractedText: "",
    identifiedDrug: null
  });
  
  // Authentication function for ImageKit
  const authenticator = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const { signature, expire, token } = data;
      return { signature, expire, token };
    } catch (error) {
      throw new Error(`Authentication request failed: ${error.message}`);
    }
  };

  // Process the uploaded image through the backend API
  const processImage = async (imageUrl, drugId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/process-drug-image`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error(`Image processing failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Update the specific drug in the array
      setDrugs(prevDrugs => 
        prevDrugs.map(drug => 
          drug.id === drugId 
            ? {
                ...drug,
                extractedText: data.extractedText,
                identifiedDrug: data.identifiedDrug,
                isLoading: false,
                error: ""
              }
            : drug
        )
      );

      return data;
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = 'Failed to identify drug from image';
      
      // Update the specific drug with error
      setDrugs(prevDrugs => 
        prevDrugs.map(drug => 
          drug.id === drugId 
            ? { ...drug, isLoading: false, error: errorMessage }
            : drug
        )
      );
      
      throw error;
    }
  };
  
  // Generic upload handlers that work with any drug
  const createUploadHandlers = (drugId) => ({
    onError: (err) => {
      console.log(`Error uploading Drug ${drugId}:`, err);
      setDrugs(prevDrugs => 
        prevDrugs.map(drug => 
          drug.id === drugId 
            ? { ...drug, isLoading: false, error: "Upload failed" }
            : drug
        )
      );
    },
    
    onSuccess: (res) => {
      console.log(`Drug ${drugId} upload success:`, res);
      setDrugs(prevDrugs => 
        prevDrugs.map(drug => 
          drug.id === drugId 
            ? { ...drug, dbData: res }
            : drug
        )
      );
      
      // Process the uploaded image
      if (res.url) {
        processImage(res.url, drugId).catch(error => {
          console.error(`Failed to process drug ${drugId} image:`, error);
        });
      }
    },
    
    onUploadStart: (evt) => {
      const file = evt.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setDrugs(prevDrugs => 
          prevDrugs.map(drug => 
            drug.id === drugId 
              ? {
                  ...drug,
                  isLoading: true,
                  error: "",
                  extractedText: "",
                  identifiedDrug: null,
                  aiData: {
                    inlineData: {
                      data: reader.result.split(",")[1],
                      mimeType: file.type,
                    },
                  }
                }
              : drug
          )
        );
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Add a new drug slot
  const addDrug = () => {
    const newId = Math.max(...drugs.map(d => d.id)) + 1;
    setDrugs(prevDrugs => [...prevDrugs, createEmptyDrug(newId)]);
  };
  
  // Remove a drug slot (minimum of 2 drugs required)
  const removeDrug = (drugId) => {
    if (drugs.length <= 2) {
      alert("You need at least 2 drugs to check for interactions");
      return;
    }
    setDrugs(prevDrugs => prevDrugs.filter(drug => drug.id !== drugId));
    cleanupRef(drugId);
  };
  
  // Clear a specific drug
  const clearDrug = (drugId) => {
    setDrugs(prevDrugs => 
      prevDrugs.map(drug => 
        drug.id === drugId 
          ? createEmptyDrug(drugId)
          : drug
      )
    );
  };
  
  // Clean up refs when drugs are removed
  const cleanupRef = (drugId) => {
    if (uploadRefs.current[drugId]) {
      delete uploadRefs.current[drugId];
    }
  };
  
  // Mutation to create a new chat with the drug interaction check
  const createChatMutation = useMutation({
    mutationFn: () => {
      setIsSubmitting(true);
      
      // Prepare drug data for all uploaded drugs
      const uploadedDrugs = drugs.filter(drug => drug.dbData?.filePath || drug.identifiedDrug);
      
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          useGemini: true,
          chatType: "drugInteraction",
          drugCheck: {
            drugs: uploadedDrugs.map(drug => ({
              name: drug.identifiedDrug?.name || "Unknown Drug",
              ingredients: drug.identifiedDrug?.ingredients || [],
              image: drug.dbData?.filePath || null,
              extractedText: drug.extractedText || ""
            })),
            drugCount: uploadedDrugs.length
          }
        }),
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      });
    },
    onSuccess: (id) => {
      // Prevent duplicate initial response
      sessionStorage.setItem(`chat_${id}_initial_sent`, "true");
      
      // Store flag to show drug interaction suggestions in the chat
      sessionStorage.setItem(`chat_${id}_drug_interaction`, "true");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      
      // Navigate to the new chat
      navigate(`/dashboard/chats/${id}`);
    },
    onError: () => {
      console.error("Error creating drug interaction chat");
      setIsSubmitting(false);
    }
  });
  
  const handleCheck = () => {
    // Count uploaded drugs
    const uploadedDrugs = drugs.filter(drug => drug.dbData?.filePath || drug.identifiedDrug);
    
    if (uploadedDrugs.length < 2) {
      alert("Please upload at least 2 drug images to check for interactions");
      return;
    }
    
    // Create the chat for drug interaction
    createChatMutation.mutate();
  };
  
  // Function to clear all drug images and data
  const handleClearAll = () => {
    setDrugs(prevDrugs => 
      prevDrugs.map(drug => createEmptyDrug(drug.id))
    );
  };
  
  // Check if any drugs are uploaded
  const hasUploadedDrugs = drugs.some(drug => drug.dbData?.filePath || drug.identifiedDrug);
  const uploadedCount = drugs.filter(drug => drug.dbData?.filePath || drug.identifiedDrug).length;
  
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title drug-interaction-title">Drug Interaction Checker</h1>
          <p className="page-description">
            Scan your drugs so we can check for any potential interactions to keep you safe.
            You can add multiple drugs for comprehensive interaction checking.
          </p>
          <div className="drug-counter">
            <span>Drugs uploaded: {uploadedCount}</span>
          </div>
        </div>
        
        <div className="drug-inputs-grid">
          {drugs.map((drug, index) => {
            const handlers = createUploadHandlers(drug.id);
            const uploadRef = getUploadRef(drug.id);
            
            return (
              <div key={drug.id} className="drug-input">
                <div className="drug-header">
                  <h2>Drug {index + 1}</h2>
                  {drugs.length > 2 && (
                    <button 
                      className="remove-drug-button"
                      onClick={() => removeDrug(drug.id)}
                      disabled={isSubmitting}
                      title="Remove this drug"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                <div className="upload-wrapper">
                  {drug.isLoading && <div className="loading-indicator">Processing image...</div>}
                  
                  <IKContext
                    urlEndpoint={urlEndpoint}
                    publicKey={publicKey}
                    authenticator={authenticator}
                  >
                    <IKUpload
                      fileName={`drug${drug.id}-upload.png`}
                      onError={handlers.onError}
                      onSuccess={handlers.onSuccess}
                      useUniqueFileName={true}
                      onUploadStart={handlers.onUploadStart}
                      style={{display:"none"}}
                      ref={uploadRef}
                    />
                  </IKContext>
                  
                  {drug.dbData?.filePath ? (
                    <div className="drug-preview">
                      <div className="image-container">
                        <IKImage
                          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                          path={drug.dbData.filePath}
                          transformation={[{ width: 300, height: 200, cropMode: 'maintain_ratio' }]}
                          className="drug-image"
                        />
                      </div>
                      {drug.identifiedDrug && (
                        <div className="drug-info">
                          <p><strong>Identified Drug:</strong> {drug.identifiedDrug.name}</p>
                          <p><strong>Ingredients:</strong> {drug.identifiedDrug.ingredients.join(", ")}</p>
                        </div>
                      )}
                      {drug.extractedText && !drug.identifiedDrug && (
                        <div className="drug-info">
                          <p><strong>Extracted Text:</strong> {drug.extractedText}</p>
                          <p><strong>No matching drug found in database</strong></p>
                        </div>
                      )}
                      {drug.error && <p className="error-message">{drug.error}</p>}
                      <button 
                        className="remove-image" 
                        onClick={() => clearDrug(drug.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="upload-container"
                      onClick={() => uploadRef.current?.click()}
                    >
                      <div className="upload-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 14V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V14" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 10L12 15L17 10" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15V3" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="upload-placeholder">
                        <span className="upload-label">Click to upload Drug {index + 1}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Add Drug Button */}
          <div className="add-drug-container">
            <button 
              className="add-drug-button"
              onClick={addDrug}
              disabled={isSubmitting || drugs.length >= 10} // Limit to 10 drugs max
              title="Add another drug"
            >
              <div className="add-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Add Drug</span>
              {drugs.length >= 10 && <small>(Maximum 10 drugs)</small>}
            </button>
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            className="primary-button check-button" 
            onClick={handleCheck}
            disabled={isSubmitting || uploadedCount < 2}
          >
            {isSubmitting ? "Checking..." : `Check Interactions (${uploadedCount} drugs)`}
          </button>
          
          <button 
            className="secondary-button clear-button"
            onClick={handleClearAll}
            disabled={isSubmitting || !hasUploadedDrugs}
          >
            Clear All
          </button>
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

export default DrugInteractionPage;