import './drugInteractionPage.css';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IKImage, IKContext, IKUpload } from 'imagekitio-react';

const DrugInteractionPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const urlEndpoint = import.meta.env.VITE_IMAGE_KIT_ENDPOINT;
  const publicKey = import.meta.env.VITE_IMAGE_KIT_PUBLIC_KEY;
  
  // References for the upload components
  const drug1UploadRef = useRef(null);
  const drug2UploadRef = useRef(null);
  
  // State for both drug images
  const [drug1, setDrug1] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
    extractedText: "", // Store extracted text
    identifiedDrug: null // Store identified drug
  });
  
  const [drug2, setDrug2] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
    extractedText: "", // Store extracted text
    identifiedDrug: null // Store identified drug
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
  const processImage = async (imageUrl, isDrug1) => {
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
      
      if (isDrug1) {
        setDrug1(prev => ({
          ...prev,
          extractedText: data.extractedText,
          identifiedDrug: data.identifiedDrug,
          isLoading: false,
        }));
      } else {
        setDrug2(prev => ({
          ...prev,
          extractedText: data.extractedText,
          identifiedDrug: data.identifiedDrug,
          isLoading: false,
        }));
      }

      return data;
    } catch (error) {
      console.error('Error processing image:', error);
      const errorMessage = 'Failed to identify drug from image';
      
      if (isDrug1) {
        setDrug1(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      } else {
        setDrug2(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      }
      
      throw error;
    }
  };
  
  // Handle upload events for Drug 1
  const onDrug1Error = err => {
    console.log("Error uploading Drug 1:", err);
    setDrug1(prev => ({...prev, isLoading: false, error: "Upload failed"}));
  };
  
  const onDrug1Success = res => {
    console.log("Drug 1 upload success:", res);
    setDrug1(prev => ({...prev, dbData: res}));
    
    // Process the uploaded image to extract text and identify the drug
    if (res.url) {
      processImage(res.url, true).catch(error => {
        console.error("Failed to process drug 1 image:", error);
      });
    }
  };
  
  const onDrug1UploadStart = evt => {
    const file = evt.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setDrug1(prev => ({
        ...prev, 
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
      }));
    };
    reader.readAsDataURL(file);
  };
  
  // Handle upload events for Drug 2
  const onDrug2Error = err => {
    console.log("Error uploading Drug 2:", err);
    setDrug2(prev => ({...prev, isLoading: false, error: "Upload failed"}));
  };
  
  const onDrug2Success = res => {
    console.log("Drug 2 upload success:", res);
    setDrug2(prev => ({...prev, dbData: res}));
    
    // Process the uploaded image to extract text and identify the drug
    if (res.url) {
      processImage(res.url, false).catch(error => {
        console.error("Failed to process drug 2 image:", error);
      });
    }
  };
  
  const onDrug2UploadStart = evt => {
    const file = evt.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setDrug2(prev => ({
        ...prev, 
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
      }));
    };
    reader.readAsDataURL(file);
  };
  
  // Mutation to create a new chat with the drug interaction check
  const createChatMutation = useMutation({
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
          chatType: "drugInteraction", // Specify chat type for GeminiService
          drugCheck: {
            drug1Image: drug1?.dbData?.filePath,
            drug2Image: drug2?.dbData?.filePath,
            drug1Info: drug1?.identifiedDrug,
            drug2Info: drug2?.identifiedDrug
          }
        }),
      }).then((res) => res.json());
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
    // Validate that at least one drug image is uploaded
    if (!drug1.dbData?.filePath && !drug2.dbData?.filePath) {
      alert("Please upload at least one drug image");
      return;
    }
    
    // Create the chat for drug interaction
    createChatMutation.mutate();
  };
  
  // Function to clear all drug images and data
  const handleClearAll = () => {
    setDrug1({
      isLoading: false,
      error: "",
      dbData: {},
      aiData: {},
      extractedText: "",
      identifiedDrug: null
    });
    
    setDrug2({
      isLoading: false,
      error: "",
      dbData: {},
      aiData: {},
      extractedText: "",
      identifiedDrug: null
    });
  };
  
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title drug-interaction-title">Drug Interaction Checker</h1>
          <p className="page-description">
            Scan your drugs so we can check the drugs and check for
            any potential interactions to keep you safe.
          </p>
        </div>
        
        <div className="drug-inputs">
          <div className="drug-input">
            <h2>Drug 1</h2>
            <div className="upload-wrapper">
              {drug1.isLoading && <div className="loading-indicator">Processing image...</div>}
              
              <IKContext
                urlEndpoint={urlEndpoint}
                publicKey={publicKey}
                authenticator={authenticator}
              >
                <IKUpload
                  fileName="drug1-upload.png"
                  onError={onDrug1Error}
                  onSuccess={onDrug1Success}
                  useUniqueFileName={true}
                  onUploadStart={onDrug1UploadStart}
                  style={{display:"none"}}
                  ref={drug1UploadRef}
                />
              </IKContext>
              
              {drug1.dbData?.filePath ? (
                <div className="drug-preview">
                  <div className="image-container">
                    <IKImage
                      urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                      path={drug1.dbData.filePath}
                      transformation={[{ width: 300, height: 200, cropMode: 'maintain_ratio' }]}
                      className="drug-image"
                    />
                  </div>
                  {drug1.identifiedDrug && (
                    <div className="drug-info">
                      <p><strong>Identified Drug:</strong> {drug1.identifiedDrug.name}</p>
                      <p><strong>Ingredients:</strong> {drug1.identifiedDrug.ingredients.join(", ")}</p>
                    </div>
                  )}
                  {drug1.extractedText && !drug1.identifiedDrug && (
                    <div className="drug-info">
                      <p><strong>Extracted Text:</strong> {drug1.extractedText}</p>
                      <p><strong>No matching drug found in database</strong></p>
                    </div>
                  )}
                  {drug1.error && <p className="error-message">{drug1.error}</p>}
                  <button 
                    className="remove-image" 
                    onClick={() => setDrug1({
                      isLoading: false,
                      error: "",
                      dbData: {},
                      aiData: {},
                      extractedText: "",
                      identifiedDrug: null
                    })}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  className="upload-container"
                  onClick={() => drug1UploadRef.current.click()}
                >
                  <div className="upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 14V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V14" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 10L12 15L17 10" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15V3" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="upload-placeholder">
                    <span className="upload-label">Click to upload a photo of Drug 1</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="drug-input">
            <h2>Drug 2</h2>
            <div className="upload-wrapper">
              {drug2.isLoading && <div className="loading-indicator">Processing image...</div>}
              
              <IKContext
                urlEndpoint={urlEndpoint}
                publicKey={publicKey}
                authenticator={authenticator}
              >
                <IKUpload
                  fileName="drug2-upload.png"
                  onError={onDrug2Error}
                  onSuccess={onDrug2Success}
                  useUniqueFileName={true}
                  onUploadStart={onDrug2UploadStart}
                  style={{display:"none"}}
                  ref={drug2UploadRef}
                />
              </IKContext>
              
              {drug2.dbData?.filePath ? (
                <div className="drug-preview">
                  <div className="image-container">
                    <IKImage
                      urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                      path={drug2.dbData.filePath}
                      transformation={[{ width: 300, height: 200, cropMode: 'maintain_ratio' }]}
                      className="drug-image"
                    />
                  </div>
                  {drug2.identifiedDrug && (
                    <div className="drug-info">
                      <p><strong>Identified Drug:</strong> {drug2.identifiedDrug.name}</p>
                      <p><strong>Ingredients:</strong> {drug2.identifiedDrug.ingredients.join(", ")}</p>
                    </div>
                  )}
                  {drug2.extractedText && !drug2.identifiedDrug && (
                    <div className="drug-info">
                      <p><strong>Extracted Text:</strong> {drug2.extractedText}</p>
                      <p><strong>No matching drug found in database</strong></p>
                    </div>
                  )}
                  {drug2.error && <p className="error-message">{drug2.error}</p>}
                  <button 
                    className="remove-image" 
                    onClick={() => setDrug2({
                      isLoading: false,
                      error: "",
                      dbData: {},
                      aiData: {},
                      extractedText: "",
                      identifiedDrug: null
                    })}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div 
                  className="upload-container"
                  onClick={() => drug2UploadRef.current.click()}
                >
                  <div className="upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 14V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V14" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 10L12 15L17 10" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15V3" stroke="#3A8D8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="upload-placeholder">
                    <span className="upload-label">Click to upload a photo of Drug 2</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="action-buttons">
          <button 
            className="primary-button check-button" 
            onClick={handleCheck}
            disabled={isSubmitting || (!drug1.dbData?.filePath && !drug2.dbData?.filePath)}
          >
            {isSubmitting ? "Checking..." : "Check Interactions"}
          </button>
          
          <button 
            className="secondary-button clear-button"
            onClick={handleClearAll}
            disabled={isSubmitting || (!drug1.dbData?.filePath && !drug2.dbData?.filePath)}
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