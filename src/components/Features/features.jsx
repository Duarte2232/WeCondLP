import React, {useEffect
} from 'react';
import './features.css';

const Features = () => {
  useEffect(() => {
    const cards = document.querySelectorAll('.card');
    
    // Callback function when an element is in view
    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, 200);
          observer.unobserve(entry.target);
        }
      });
    };

    // Create the observer
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.9, // Trigger when 50% of the card is visible
    });

    // Observe each card
    cards.forEach(card => observer.observe(card));
    
    return () => {
      // Clean up the observer on component unmount
      cards.forEach(card => observer.unobserve(card));
    };
  }, []);
  return (
    <div className="containertwo" id="Features">
      <h1 className="title">Toma o próximo passo com a WeCond</h1>
      <div className="cards">
        <div className="card">
          <div className="icon um"></div>
          <h2>Gestão de Manutenção</h2>
          <p>Permite que inquilinos e proprietários submetam pedidos de manutenção com fotos e vídeos para detalhar o problema. O sistema gerencia todo o processo, desde a solicitação até a conclusão, garantindo maior eficiência e transparência.</p>
        </div>

        <div className="card fastest">
          <div className="icon dois" ></div>
          <h2>Automação de Processos</h2>
          <p>Automatiza tarefas como solicitações de cotações, aprovações de trabalhos e envio de faturas. Além disso, emite lembretes automáticos para evitar atrasos nas etapas, otimizando a gestão.</p>
        </div>

        <div className="card">
          <div className="icon tres"></div>
          <h2>Comunicação Multicanal</h2>
          <p>Integra diversos canais de comunicação, como e-mail, SMS, WhatsApp e Facebook Messenger. Facilita o contato entre gestores, moradores e técnicos, centralizando todas as interações em um só lugar.</p>
        </div>

        <div className="card">
          <div className="icon quatro"></div>
          <h2>Rede de Prestadores de Serviço</h2>
          <p>Conecta gestores e moradores a uma ampla rede de técnicos e fornecedores cadastrados, permitindo agendamentos diretos para serviços de manutenção e reparos, agilizando a resolução de problemas.</p>
        </div>
      </div>
    </div>
  );
};

export default Features;
