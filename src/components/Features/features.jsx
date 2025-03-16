import React, {useEffect} from 'react';
import './features.css';

const Features = () => {
  useEffect(() => {
    const cards = document.querySelectorAll('.card');
    const animatedElements = document.querySelectorAll('.fade-in-element, .slide-in-left, .slide-in-right, .scale-in');
    
    // Callback function when an element is in view
    const observerCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, 200);
          // Keep observing to re-trigger animations when scrolling back up
          // observer.unobserve(entry.target);
        }
      });
    };

    // Create the observer
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.2, // Trigger when 20% of the element is visible
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before the element enters the viewport
    });

    // Observe each card and animated element
    cards.forEach(card => observer.observe(card));
    animatedElements.forEach(element => observer.observe(element));
    
    return () => {
      // Clean up the observer on component unmount
      cards.forEach(card => observer.unobserve(card));
      animatedElements.forEach(element => observer.unobserve(element));
    };
  }, []);
  
  return (
    <div className="containertwo" id="Features">
      <h1 className="title fade-in-element">Toma o próximo passo com a WeCond</h1>
      <div className="cards">
        <div className="card fade-in-element delay-200">
          <div className="icon um"></div>
          <h2>Gestão de Manutenção</h2>
          <p>Permite que inquilinos e proprietários submetam pedidos de manutenção com fotos e vídeos para detalhar o problema. O sistema gerencia todo o processo, desde a solicitação até a conclusão, garantindo maior eficiência e transparência.</p>
        </div>

        <div className="card fade-in-element delay-300">
          <div className="icon dois" ></div>
          <h2>Automação de Processos</h2>
          <p>Automatiza tarefas como solicitações de cotações, aprovações de trabalhos e envio de faturas. Além disso, emite lembretes automáticos para evitar atrasos nas etapas, otimizando a gestão.</p>
        </div>

        <div className="card fade-in-element delay-400">
          <div className="icon tres"></div>
          <h2>Comunicação Multicanal</h2>
          <p>Integra diversos canais de comunicação, como e-mail, SMS, WhatsApp e Facebook Messenger. Facilita o contato entre gestores, moradores e técnicos, centralizando todas as interações em um só lugar.</p>
        </div>

        <div className="card fade-in-element delay-500">
          <div className="icon quatro"></div>
          <h2>Rede de Prestadores de Serviço</h2>
          <p>Conecta gestores e moradores a uma ampla rede de técnicos e fornecedores cadastrados, permitindo agendamentos diretos para serviços de manutenção e reparos, agilizando a resolução de problemas.</p>
        </div>
      </div>
    </div>
  );
};

export default Features;
