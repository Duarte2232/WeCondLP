import React from 'react';
import './features.css';

const Features = () => {
  return (
    <div className="container">
      <h1 className="title">Take the next step without any hassle &amp; get results fast</h1>
      <div className="cards">
        <div className="card">
          <div className="icon">📊</div>
          <h2>Predictive Insights</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Eleifend nulla consectetur placerat pellentesque ut massa volutpat at. Diam pretium orci dui sagittis.</p>
        </div>

        <div className="card fastest">
          <div className="icon">⚙️</div>
          <h2>Fastest Speed</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Eleifend nulla consectetur placerat pellentesque ut massa volutpat at. Diam pretium orci dui sagittis.</p>
        </div>

        <div className="card">
          <div className="icon">📦</div>
          <h2>Filtered Data</h2>
          <p>Eleifend nulla consectetur placerat pellentesque ut massa volutpat at. Diam pretium orci dui sagittis. Norem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>

        <div className="card">
          <div className="icon">☁️</div>
          <h2>Everything in Cloud</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Eleifend nulla consectetur placerat pellentesque ut massa volutpat at. Diam pretium orci dui sagittis.</p>
        </div>
      </div>
    </div>
  );
};

export default Features;
