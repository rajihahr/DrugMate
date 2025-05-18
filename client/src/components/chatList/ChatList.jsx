import './chatList.css'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ChatList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [summarizingId, setSummarizingId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const menuRef = useRef(null);
  
  // Toggle sidebar collapse state
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    
    // Add collapsed class to the menu element
    const menuElement = document.querySelector('.menu');
    if (menuElement) {
      if (newState) {
        menuElement.classList.add('collapsed');
        document.querySelector('.content').classList.add('expanded');
      } else {
        menuElement.classList.remove('collapsed');
        document.querySelector('.content').classList.remove('expanded');
      }
    }
  };
  
  const { isPending, error, data } = useQuery({
    queryKey: ["userChats"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/userchats`, {
        credentials:"include",
      }).then((res) =>
        res.json(),
      ),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (chatId) => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },
    onMutate: (chatId) => {
      setDeletingId(chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      setDeletingId(null);
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error("Error deleting chat:", error);
      setDeletingId(null);
    }
  });

  const handleDelete = (chatId) => {
    deleteMutation.mutate(chatId);
    setOpenMenuId(null);
  };

  const summarizeMutation = useMutation({
    mutationFn: (chatId) => {
      setSummarizingId(chatId);
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}/summarize`, {
        credentials: 'include',
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      generateSummaryPDF(data);
      setSummarizingId(null);
    },
    onError: (error) => {
      console.error("Error summarizing chat:", error);
      setSummarizingId(null);
    }
  });
  
  const handleSummarize = (chatId) => {
    summarizeMutation.mutate(chatId);
    setOpenMenuId(null);
  };
  
  // Enhanced PDF generation function
  const generateSummaryPDF = (summaryData) => {
    // Create a temporary div element to render the content
    const tempDiv = document.createElement('div');
    tempDiv.className = 'summary-container';
    tempDiv.innerHTML = `
      <div class="summary-content">
        <div class="header">
          <img src="/logo.png" alt="DrugMate Logo" class="logo" />
          <h1>Chat Summary</h1>
        </div>
        <div class="meta">
          <p>Generated on ${summaryData.date}</p>
          <p>Chat ID: ${summaryData.chatId}</p>
        </div>
        <div class="title">
          <h2>${summaryData.title}</h2>
        </div>
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-text">${summaryData.summary.replace(/\n/g, '<br/>')}</div>
        </div>
        <div class="footer">
          <p>DrugMate - Your AI Health Assistant</p>
        </div>
      </div>
    `;
    
    // Add styling to the temporary element
    const style = document.createElement('style');
    style.textContent = `
      .summary-container {
        font-family: Arial, sans-serif;
        width: 800px;
        padding: 40px;
        background-color: #fff;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 2px solid #3A8D8D;
      }
      .logo {
        width: 50px;
        height: 50px;
        margin-right: 20px;
      }
      .header h1 {
        color: #3A8D8D;
        margin: 0;
      }
      .meta {
        font-size: 14px;
        color: #666;
        margin-bottom: 20px;
      }
      .title h2 {
        font-size: 18px;
        color: #333;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
      .summary h3 {
        font-size: 16px;
        color: #3A8D8D;
        margin-bottom: 10px;
      }
      .summary-text {
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
      }
    `;
    
    tempDiv.appendChild(style);
    document.body.appendChild(tempDiv);
    
    // Use html2canvas to convert the div to an image
    html2canvas(tempDiv, {
      scale: 2, // Increase quality
      useCORS: true,
      logging: false
    }).then(canvas => {
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      pdf.save(`DrugMate_Summary_${summaryData.chatId}.pdf`);
      
      // Clean up the temporary div
      document.body.removeChild(tempDiv);
    });
  };

  const toggleMenu = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (openMenuId === chatId) {
      setOpenMenuId(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
      setOpenMenuId(chatId);
    }
  };
  
  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !event.target.classList.contains('more-button')) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);
  
  // Filter chats based on search term
  const filteredChats = data?.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (isCollapsed) {
    return (
      <div className='chatList'>
        <div className="dashboard-header">
        <div className="toggle-arrow">
          <button 
            className="arrow-button" 
            onClick={toggleCollapse} 
            aria-label="Expand sidebar"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="13 17 18 12 13 7"></polyline>
            </svg>
          </button>
        </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className='chatList'>
        <div className="dashboard-header">
          <div className="toggle-arrow">
            <button 
              className="arrow-button" 
              onClick={toggleCollapse} 
              aria-label="Collapse sidebar"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="11 17 6 12 11 7"></polyline>
              </svg>
            </button>
          </div>
          <span className='title'>DASHBOARD</span>
        </div>
        
        <div className="actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
          <Link to="/dashboard" className="new-chat-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </Link>
        </div>
        <div className="navigation-links">
          <Link to="/">Explore DrugMate</Link>
          <Link to="/">Contact</Link>
        </div>
        <hr />
        
        <div className='list'>
          {isPending
            ? "Loading..."
            : error
            ? "Something went wrong!"
            : filteredChats?.length === 0
            ? <div className="no-results">No chats found</div>
            : filteredChats?.map((chat) => (
              <div className="chat-item" key={chat._id}>
                <Link to={`/dashboard/chats/${chat._id}`}>
                  {chat.title}
                </Link>
                <button
                  className="more-button"
                  onClick={(e) => toggleMenu(e, chat._id)}
                  aria-label="More options"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="12" cy="5" r="1"></circle>
                    <circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Dropdown menu positioned absolutely in the page */}
      {openMenuId && (
        <div 
          className="dropdown-menu-container"
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left - 120}px`, // Positioned to the left of the dots
            zIndex: 1000
          }}
        >
          <div className="dropdown-menu">
            <button
              onClick={() => handleDelete(openMenuId)}
              disabled={deletingId === openMenuId}
              className="menu-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>{deletingId === openMenuId ? "Deleting..." : "Delete"}</span>
            </button>
            <button
              onClick={() => handleSummarize(openMenuId)}
              disabled={summarizingId === openMenuId}
              className="menu-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>{summarizingId === openMenuId ? "Summarizing..." : "Summarize"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatList;