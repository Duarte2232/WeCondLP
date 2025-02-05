import React, { useState } from 'react';
import './Hero.css';

const Hero = () => {
    const [menuOpen, setMenuOpen] = useState(false);

const toggleMenu = () => {
    setMenuOpen((prev) => !prev); // Toggle state
};
    return (
        <div className="component-container">
            <div className="background-image">
                <img
                    className="background-pattern"
                    src="https://d33wubrfki0l68.cloudfront.net/1e0fc04f38f5896d10ff66824a62e466839567f8/699b5/images/hero/3/background-pattern.png"
                    alt=""
                />
            </div>

            <header className="header">
                <div className="header-container">
                    <div className="logo">
                        
                        <h1 className="hero-title">WeCond</h1>
                        
                    </div>
                    
                    <div className="hamburger-menu" onClick={toggleMenu}>
                    ☰
                </div>
                <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
                    <a href="#Features" className="nav-item" onClick={toggleMenu}>Funcionalidades</a>
                    <a href="#passos" className="nav-item" onClick={toggleMenu}>Como Funciona</a>
                    <a href="#calltoaction" className="nav-item" onClick={toggleMenu}>Saber Mais</a>
                </nav>
                </div>
            </header>

            <section className="hero">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">Conectamos <span className='ui'>Condomínios</span> com Trabalhadores de Confiança</h1>
                        <div className="hero-imagetwo">
                    </div>
                        <div className="hero-stats">

                            <p className="stats-text">
                                A solução inteligente que conecta o seu condomínio aos melhores profissionais em minutos
                            </p>
                        </div>
                        <div className="hero-actions">
                            <a href="#calltoaction" className="primary-action">Saber Mais</a>
                            
                        </div>
                    </div>
                    <div className="hero-imageone">
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Hero;
