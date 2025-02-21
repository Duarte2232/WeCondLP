import React from 'react';
import './dashtecnico.css';
import Lottie from 'lottie-react';
import animationData from '../../assets/underconstruction.json';

const DashTecnico = () => {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      maxWidth: '500px',
      maxHeight: '500px',
      margin: 'auto',
      marginTop:'50px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <Lottie
        animationData={animationData}
        loop={true}
        autoplay={true}
      />
      <h1 className="construction-title">EM CONSTRUÇÃO</h1>
    </div>
  );
};

export default DashTecnico;