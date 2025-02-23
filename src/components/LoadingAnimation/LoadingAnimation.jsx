import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/loading.json';
import './LoadingAnimation.css';

function LoadingAnimation() {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <Lottie 
          animationData={loadingAnimation} 
          loop={true}
          style={{ width: '30vw', maxWidth: '600px' }}
        />
        <div className="loading-text">Loading...</div>
      </div>
    </div>
  );
}

export default LoadingAnimation; 