import React from 'react';
import './Hero.css';

const Hero = () => {
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
                        <a href="#" title="Logo">
                        <h1 className="hero-title">WeCond</h1>
                        </a>
                    </div>
                    <div className="menu-toggle lg:hidden">
                        <button type="button" className="menu-button">
                            <svg className="menu-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M4 6h16M4 12h16M4 18h16"
                                ></path>
                            </svg>
                        </button>
                    </div>
                    <nav className="nav-links hidden lg:flex">
                        <a href="#" className="nav-item">Funcionalidades</a>
                        <a href="#" className="nav-item">Como Funciona</a>
                        <a href="#" className="nav-item">Saber Mais</a>
                
                    </nav>
                </div>
            </header>

            <section className="hero">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">Conectamos Condomínios com Trabalhadores de Confiança</h1>
                        <div className="hero-stats">

                            <p className="stats-text">
                                A solução inteligente que conecta o seu condomínio aos melhores profissionais em minutos
                            </p>
                        </div>
                        <div className="hero-actions">
                            <a href="#" className="primary-action">Saber mais</a>
                            
                        </div>
                    </div>
                    <div className="hero-image">
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Hero;
