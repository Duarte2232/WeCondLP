import React, { useEffect } from 'react';
import { FiMail, FiPhone, FiFacebook, FiLinkedin } from 'react-icons/fi';
import './Contacts.css';

const Contacts = () => {
  useEffect(() => {
    const section = document.querySelector('.contacts-section');
    if (section) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            section.classList.add('visible');
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(section);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div className="contacts-section fade-in-element" id="contatos">
      <h2 className="contacts-title">Contactos</h2>
      
      <div className="contacts-wrapper">
        <div className="contacts-row">
          <div className="contact-item slide-in-bottom delay-100">
            <div className="contact-icon-wrapper email-icon">
              <FiMail className="contact-icon" />
            </div>
            <a href="mailto:wecondlda@gmail.com" className="contact-text">wecondlda@gmail.com</a>
            <div className="contact-label">Email</div>
          </div>
          
          <div className="contact-item slide-in-bottom delay-200">
            <div className="contact-icon-wrapper phone-icon">
              <FiPhone className="contact-icon" />
            </div>
            <a href="tel:+351926767219" className="contact-text">+351 926 767 219</a>
            <div className="contact-label">Comercial</div>
          </div>
          
          <div className="contact-item slide-in-bottom delay-300 centered-contact" id="support-contact">
            <div className="contact-icon-wrapper support-icon">
              <FiPhone className="contact-icon" />
            </div>
            <a href="tel:+351917289333" className="contact-text">+351 917 289 333</a>
            <div className="contact-label">Suporte Técnico</div>
          </div>
          
          <div className="contact-item slide-in-bottom delay-400">
            <div className="contact-icon-wrapper facebook-icon">
              <FiFacebook className="contact-icon" />
            </div>
            <a href="https://www.facebook.com/profile.php?id=61571958924408&locale=pt_PT" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="contact-text">
              Facebook
            </a>
            <div className="contact-label">Facebook</div>
          </div>
          
          <div className="contact-item slide-in-bottom delay-500">
            <div className="contact-icon-wrapper linkedin-icon">
              <FiLinkedin className="contact-icon" />
            </div>
            <a href="https://www.linkedin.com/company/wecond/about/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="contact-text">
              LinkedIn
            </a>
            <div className="contact-label">LinkedIn</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contacts; 