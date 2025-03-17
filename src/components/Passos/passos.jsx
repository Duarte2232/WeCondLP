import React, { useEffect } from 'react';
import './passos.css';

const landlordSteps = [
  {
    id: 1,
    title: "Registo de Solicitação",
    description: "O gestor recebe ou cria uma solicitação de manutenção, submetendo fotografias e especificando detalhes.",
  },
  {
    id: 2,
    title: "Conexão com Técnico",
    description: "A plataforma conecta o gestor com os prestadores de serviços, permitindo enviar pedido de orçamento ou agendar o serviço.",
  },
  {
    id: 3,
    title: "Acompanhamento e Conclusão",
    description: "O gestor pode acompanhar o progresso da solicitção, bem como dos trabalhos em curso.",
  },
];

const tenantSteps = [
  {
    id: 1,
    title: "Recebimento de Solicitação",
    description: "O técnico é notificado sobre uma nova solicitação de serviço.",
  },
  {
    id: 2,
    title: "Envio de Proposta",
    description: "O técnico analisa a solicitação e envia uma proposta pela plataforma incluindo disponbilidade e custos estimados.",
  },
  {
    id: 3,
    title: "Execução e Feedback",
    description: "Após aceitar, o técnico realiza o serviço, atualiza na plataforma e recebe feedback do gestor de.",
  },
];

const Passos = () => {
  useEffect(() => {
    const animatedElements = document.querySelectorAll(
      '.fade-in-element, .slide-in-left, .slide-in-right, .scale-in, .passos-box, .box-step'
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

  return (
    <div className="passos-container" id="passos">
      <h2 className="passos-title fade-in-element">Como funciona?</h2>
      
      <div className="passos-boxes-container">
        <div className="passos-box gestor-box slide-in-left">
          <h3 className="box-title">Para Gestores de Condomínio</h3>
          <div className="box-steps">
            {landlordSteps.map((step) => (
              <div className={`box-step fade-in-element delay-${step.id * 100}`} key={step.id}>
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="passos-box tecnico-box slide-in-right">
          <h3 className="box-title">Para Técnicos</h3>
          <div className="box-steps">
            {tenantSteps.map((step) => (
              <div className={`box-step fade-in-element delay-${step.id * 100 + 200}`} key={step.id}>
                <div className="step-number">{step.id}</div>
                <div className="step-content">
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Passos;
