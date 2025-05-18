import './homepage.css'
import { Link } from 'react-router-dom';
import { TypeAnimation } from "react-type-animation";
import { useState } from 'react';

const Homepage = () => {
  const [typingStatus, setTypingStatus] = useState("human1");

  return (
    <div className="homepage">
      <img src='/orbital.png' alt="" className="orbital" />
      <div className="left">
        <h1>DrugMate</h1>
        <h2>Safety first with every dose.</h2>
        <h3>Whether you're curious about potential drug interactions, 
          need dosage advice, or want to ensure the safety of your medication regimen, 
          DrugMate is here to help. Your safety is our mission—because every dose matters.</h3>
        <Link to="/dashboard">Get Started</Link>
      </div>
      <div className='right'>
      <div className="imgContainer">
          <div className="bgContainer">
            <div className="bg"></div>
          </div>
          <img src="/bot.png" alt="" className="bot" />
          <div className='chat'>
          <img
              src={
                typingStatus === "human1"
                  ? "/human1.jpeg"
                  : typingStatus === "human2"
                  ? "/human2.jpeg"
                  : "bot.png"
              }
              alt=""
            />
            <TypeAnimation
              sequence={[
                // Same substring at the start will only be typed out once, initially
                "Is it dangerous to take Ibuprofen & Paracetamol together?",
                2000,
                () => {
                  setTypingStatus("bot");
                },
                "There are no interactions of these drugs.",
                2000,
                () => {
                  setTypingStatus("human2");
                },
                "I have a fever.",
                2000,
                () => {
                  setTypingStatus("bot");
                },
                "Take medications like Paracetamol or Ibuprofen.",
                2000,
                () => {
                  setTypingStatus("human1");
                },
              ]}
              wrapper="span"
              repeat={Infinity}
              cursor={true}
              omitDeletionAnimation={true}
            />
          </div>
          </div>
        </div>
        <div className="terms">
        <img src="/logo.png" alt="" />
        <div className="links">
          <Link to="/">Terms of Service</Link>
          <span>|</span>
          <Link to="/">Privacy Policy</Link>
        </div>
      </div>
      </div>
  );
};

export default Homepage;