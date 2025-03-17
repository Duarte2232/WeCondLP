import React, { useState, useEffect, useRef } from 'react';
import './hero.css';

const Hero = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [hideHeader, setHideHeader] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const menuRef = useRef(null);
    const hamburgerRef = useRef(null);
    const headerRef = useRef(null);
    const lastScrollY = useRef(0);

    const toggleMenu = () => {
        setMenuOpen((prev) => !prev);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Fechar o menu quando clicar fora dele
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuOpen && 
                menuRef.current && 
                !menuRef.current.contains(event.target) &&
                hamburgerRef.current && 
                !hamburgerRef.current.contains(event.target)) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    // Impedir scroll quando o menu estiver aberto
    useEffect(() => {
        if (menuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    // Handle header visibility on scroll
    useEffect(() => {
        const controlNavbar = () => {
            const currentScrollY = window.scrollY;
            
            // Set scrolled state to true if scrolled down more than 50px
            if (currentScrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
            
            // Hide header when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setHideHeader(true);
            } else {
                setHideHeader(false);
            }

            // Show scroll to top button when scrolled down more than 300px
            if (currentScrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
            
            lastScrollY.current = currentScrollY;
        };
        
        window.addEventListener('scroll', controlNavbar, { passive: true });
        return () => {
            window.removeEventListener('scroll', controlNavbar);
        };
    }, []);

    // Scroll animation observer
    useEffect(() => {
        const animatedElements = document.querySelectorAll(
            '.fade-in-element, .slide-in-left, .slide-in-right, .scale-in'
        );
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Optional: if you want the animation to play only once
                    // observer.unobserve(entry.target);
                } else {
                    // Optional: if you want the animation to play every time the element enters the viewport
                    // entry.target.classList.remove('visible');
                }
            });
        }, {
            threshold: 0.1, // Trigger when at least 10% of the element is visible
            rootMargin: '0px 0px -50px 0px' // Trigger slightly before the element enters the viewport
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
        <div className="component-container">
            <div className="background-image">
                <img
                    className="background-pattern"
                    src="https://d33wubrfki0l68.cloudfront.net/1e0fc04f38f5896d10ff66824a62e466839567f8/699b5/images/hero/3/background-pattern.png"
                    alt=""
                />
            </div>

            <header className={`header ${scrolled ? 'scrolled' : ''} ${hideHeader ? 'hide' : ''}`} ref={headerRef}>
                <div className="header-container">
                    <div className="logo slide-in-left">
                        <h1 className="hero-title">WeCond</h1>
                    </div>
                    
                    <div className="hamburger-menu slide-in-right" onClick={toggleMenu} ref={hamburgerRef}>
                        <span>☰</span>
                    </div>
                    <nav className={`nav-links ${menuOpen ? 'open' : ''}`} ref={menuRef}>
                        <a href="#Features" className="nav-item" onClick={closeMenu}>Funcionalidades</a>
                        <a href="#passos" className="nav-item" onClick={closeMenu}>Como Funciona</a>
                        <a href="#calltoaction" className="nav-item" onClick={closeMenu}>Saber Mais</a>
                        <a href="/login" className="nav-item login-button">Login</a>
                    </nav>
                    <div className={`menu-overlay ${menuOpen ? 'active' : ''}`} onClick={closeMenu}></div>
                </div>
            </header>

            <section className="hero">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title fade-in-element">
                            Conectamos <span className='ui'>Condomínios</span> com Trabalhadores de Confiança
                        </h1>
                        <div className="hero-imagetwo scale-in delay-200">
                        </div>
                        <div className="hero-stats fade-in-element delay-300">
                            <p className="stats-text">
                                A solução inteligente que conecta o seu condomínio aos melhores profissionais em minutos
                            </p>
                        </div>
                        <div className="hero-actions fade-in-element delay-400">
                            <a href="#calltoaction" className="primary-action">Saber Mais</a>
                        </div>
                    </div>
                    <div className="hero-imageone slide-in-right delay-200">
                    </div>
                </div>
            </section>

            <button 
                className={`scroll-to-top ${showScrollTop ? 'show' : ''}`} 
                onClick={scrollToTop}
                aria-label="Voltar ao topo"
            >
                ↑
            </button>
        </div>
    );
};

export default Hero;
