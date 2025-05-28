import React, { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import './calltoaction.css';
import { FiPlusCircle, FiFilter, FiSearch, FiBell, FiEdit2, FiEye, FiCheck, FiX, FiCalendar, FiUpload, FiArrowLeft, FiFile, FiDownload, FiAlertCircle } from 'react-icons/fi';
import Contacts from '../Contacts/Contacts';

function CallToAction() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [option, setOption] = useState(""); // State for the selected option
  
  const handleButtonClick = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  useEffect(() => {
    const animatedElements = document.querySelectorAll(
      '.fade-in-element, .slide-in-left, .slide-in-right, .scale-in, .landing-page, .feature, .contacts-section'
    );
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(element => {
      observer.observe(element);
    });
    
    return () => {
      animatedElements.forEach(element => {
        observer.unobserve(element);
      });
    };
  }, []);

  const handleSendEmail = (e) => {
    e.preventDefault();

    // Choose template based on the selected option
    const templateId = option === "Técnico" 
      ? "template_5yqvor7" 
      : "template_uvskmzq";

    const templateParams = {
      user_name: name,
      user_email: email,
      user_option: option, // Pass the selected option for use in the template
    };

    emailjs.init({
        publicKey: 'FkHCLTZ8PZ0uuZYdk',
        // Do not allow headless browsers
        blockHeadless: true,
        blockList: {
          // Block the suspended emails
          list: ['foo@emailjs.com', 'bar@emailjs.com'],
          // The variable contains the email address
          watchVariable: 'userEmail',
        },
        limitRate: {
          // Set the limit rate for the application
          id: 'app',
          // Allow 1 request per 10s
          throttle: 10000,
        },
      });

    emailjs
      .send(
        "service_v386ohs", // Replace with your EmailJS service ID
        templateId, // Dynamic template ID
        templateParams // Replace with your EmailJS user ID
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          alert("Verifique as sua caixa de correio!");
        },
        (error) => {
          console.error("FAILED...", error);
          alert("Erro a enviar o e-mail. Tente de novo.");
        }
      );
  };

  return (
    <>
      <div className="landing-page fade-in-element" id="calltoaction">
        <h1 className="brev">Simplifique a Gestão do seu Condomínio com a WeCond</h1>
        <div className="features">
          <div className="feature slide-in-left delay-200">
            <span className="checkmark">✓</span> Interface Intuitiva
          </div>
          <div className="feature slide-in-left delay-300">
            <span className="checkmark">✓</span> Automático
          </div>
          <div className="feature slide-in-left delay-400">
            <span className="checkmark">✓</span> Rápido
          </div>
          <div className="feature slide-in-left delay-500">
            <span className="checkmark">✓</span> Seguro
          </div>
        </div>
        <button className="cta-button scale-in delay-500" onClick={handleButtonClick}>
          Junte-se a Nós
        </button>
      </div>

      {/* Componente de Contatos */}
      <Contacts />

      {isModalVisible && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={handleCloseModal}>
        ×
      </button>
          <h2>Escolha uma Opção</h2>
      <div className="radio-group">
        <label className="radio-label">
          <input 
            type="radio" 
            name="option" 
            value="Técnico" 
            className="radio-input" 
            onChange={(e) => setOption(e.target.value)}
          />
          Técnico
        </label>
        <label className="radio-label">
          <input 
            type="radio" 
            name="option" 
            value="Gestor de Condomínio" 
            className="radio-input" 
            onChange={(e) => setOption(e.target.value)}
          />
          Gestor de Condomínio
        </label>
      </div>
          <h2>Insira o nome da sua Empresa</h2>
          <input placeholder="Digite o nome" className="email-input" value={name} onChange={(e) => setName(e.target.value)}/>
            <h2>Insira o seu Email</h2>
            <input type="email" placeholder="Digite o seu email" className="email-input" value={email}
          onChange={(e) => setEmail(e.target.value)} />
            <button className="submit-button" onClick={handleSendEmail}>Enviar</button>
          </div>
        </div>
      )}
    </>
  );
};

export default CallToAction;
