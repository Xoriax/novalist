"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const creatorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    }, observerOptions);

    // Observer les éléments
    if (titleRef.current) observer.observe(titleRef.current);
    if (subtitleRef.current) observer.observe(subtitleRef.current);
    if (buttonRef.current) observer.observe(buttonRef.current);
    if (creatorRef.current) observer.observe(creatorRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Banner */}
      <section ref={heroRef} className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="floating-particles">
            {[...Array(20)].map((_, i) => (
              <div key={i} className={`particle particle-${i + 1}`}></div>
            ))}
          </div>
        </div>
        
        <div className="hero-content">
          <h1 ref={titleRef} className="hero-title fade-up">
            Novalist
          </h1>
          
          <p ref={subtitleRef} className="hero-subtitle fade-up delay-1">
            Une solution opensource
          </p>
          
          <div ref={buttonRef} className="hero-actions fade-up delay-2">
            <Link href="/signin" className="connect-btn">
              <span>Se connecter</span>
              <div className="btn-glow"></div>
            </Link>
          </div>
          
          <p ref={creatorRef} className="creator-info fade-up delay-3">
            Créé par{" "}
            <a 
              href="https://github.com/Xoriax" 
              target="_blank" 
              rel="noopener noreferrer"
              className="creator-link"
            >
              https://github.com/Xoriax
            </a>
          </p>
        </div>
        
        <div className="scroll-indicator">
          <div className="scroll-dot"></div>
        </div>
      </section>
    </div>
  );
}
