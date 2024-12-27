import React from 'react';
import './passos.css';

const Passos = () => {
  return (
    <div className="passos-container">
      <h2 className="passos-title">Como funciona?</h2>
      <p className="passos-subtitle">
        Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis.
      </p>

      <div className="passos-steps">
        <img
          src="https://cdn.rareblocks.xyz/collection/celebration/images/steps/2/curved-dotted-line.svg"
          alt="Dotted Line"
          className="dotted-line-bg"
        />

        <div className="step">
          <div className="step-icon">1</div>
          <h3 className="step-title">Create a free account</h3>
          <p className="step-description">
            Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.
          </p>
        </div>

        <div className="step">
          <div className="step-icon">2</div>
          <h3 className="step-title">Build your website</h3>
          <p className="step-description">
            Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.
          </p>
        </div>

        <div className="step">
          <div className="step-icon">3</div>
          <h3 className="step-title">Release & Launch</h3>
          <p className="step-description">
            Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Passos;
