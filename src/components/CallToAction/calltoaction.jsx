import React from 'react';
import './calltoaction.css';

const CallToAction = () => {
  return (
    <div className="landing-page">
      <h1>Create any landing page with Rareblocks</h1>
      <div className="features">
        <div className="feature">
          <span className="checkmark">✔</span> 150+ UI Blocks
        </div>
        <div className="feature">
          <span className="checkmark">✔</span> Fully Responsive
        </div>
        <div className="feature">
          <span className="checkmark">✔</span> Just Copy & Paste
        </div>
      </div>
      <button className="cta-button">Get Rareblocks</button>
      <p className="no-credit">No credit card required</p>
    </div>
  );
};

export default CallToAction;
