import React from 'react';
import { FiMail, FiPhone, FiFacebook, FiLinkedin } from 'react-icons/fi';
import './Contacts.css';

const Contacts = () => {
  return (
    <div className="contacts-section fade-in-element" id="contatos">
      <h2 className="contacts-title">Entre em Contato</h2>
      
      <div className="contacts-wrapper">
        <div className="contacts-group direct-contacts">
          <h3 className="contacts-group-title">Contactos Diretos</h3>
          <div className="contacts-container">
            <div className="contact-item">
              <div className="contact-icon-wrapper email-icon">
                <FiMail className="contact-icon" />
              </div>
              <a href="mailto:wecondlda@gmail.com" className="contact-text">wecondlda@gmail.com</a>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon-wrapper phone-icon">
                <FiPhone className="contact-icon" />
              </div>
              <a href="tel:+351926767219" className="contact-text">+351 926 767 219</a>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon-wrapper support-icon">
                <FiPhone className="contact-icon" />
              </div>
              <a href="tel:+351917289333" className="contact-text">+351 917 289 333</a>
            </div>
          </div>
          
          <div className="contact-labels">
            <div className="contact-label">Email</div>
            <div className="contact-label">Comercial</div>
            <div className="contact-label">Suporte Técnico</div>
          </div>
        </div>
        
        <div className="contacts-divider"></div>
        
        <div className="contacts-group social-contacts">
          <h3 className="contacts-group-title">Redes Sociais</h3>
          <div className="contacts-container">
            <div className="contact-item">
              <div className="contact-icon-wrapper facebook-icon">
                <FiFacebook className="contact-icon" />
              </div>
              <a href="https://www.facebook.com/profile.php?id=61571958924408&locale=pt_PT" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-text">
                Facebook
              </a>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon-wrapper linkedin-icon">
                <FiLinkedin className="contact-icon" />
              </div>
              <a href="https://www.linkedin.com/company/wecond/about/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-text">
                LinkedIn
              </a>
            </div>
          </div>
          
          <div className="contact-labels">
            <div className="contact-label">Facebook</div>
            <div className="contact-label">LinkedIn</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts; 