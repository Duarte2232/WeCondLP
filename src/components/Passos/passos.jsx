import React, { useState } from 'react';
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
  const [isLandlord, setIsLandlord] = useState(true);

  const toggleSteps = () => {
    setIsLandlord(!isLandlord);
  };

  const steps = isLandlord ? landlordSteps : tenantSteps;

  return (
    <div className="passos-container" id="passos">
      <h2 className="passos-title">Como funciona?</h2>
      <p className="passos-subtitle">
        {isLandlord
          ? "Se for gestor de condomínio"
          : "Se for um técnico."}
      </p>

      <div className="passos-steps-wrapper">
        <div className="arrow arrow-left" onClick={toggleSteps}>
          &#9664;
        </div>
        <div className="passos-steps">
          <img
            src="https://cdn.rareblocks.xyz/collection/celebration/images/steps/2/curved-dotted-line.svg"
            alt="Dotted Line"
            className="dotted-line-bg"
          />

          {steps.map((step) => (
            <div className="step" key={step.id}>
              <div className="step-icon">{step.id}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="arrow arrow-right" onClick={toggleSteps}>
          &#9654;
        </div>
      </div>
    </div>
  );
};

export default Passos;
