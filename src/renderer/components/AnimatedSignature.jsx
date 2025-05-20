import React from 'react';
import '../styles/components/AnimatedSignature.css';

const AnimatedSignature = () => {
    return (
        <div className="signature-container">
            <svg 
                viewBox="0 0 100 100" 
                className="signature"
            >
                {/* Sombra del libro */}
                <path 
                    d="M15,85 Q50,90 85,85" 
                    className="book-shadow"
                />

                {/* Portada del libro */}
                <path 
                    d="M20,20 L75,20 Q80,20 80,25 L80,75 Q80,80 75,80 L20,80 C25,80 25,20 20,20" 
                    className="book-cover"
                />
                
                {/* Lomo del libro */}
                <path 
                    d="M20,20 C19,20 19,80 20,80" 
                    className="book-spine"
                />
                

                {/* Páginas */}
                <path 
                    d="M25,25 L75,25 M25,35 L75,35 M25,45 L75,45 M25,55 L75,55 M25,65 L75,65 M25,75 L75,75" 
                    className="book-pages"
                />

                {/* Título del libro */}
                <path 
                    d="M35,30 L65,30" 
                    className="book-title"
                />

                {/* Marcador */}
                <path 
                    d="M70,25 L70,75 Q70,78 67,75 L65,73 L63,75 Q60,78 60,75 L60,30" 
                    className="book-bookmark"
                />
            </svg>
        </div>
    );
};

export default AnimatedSignature;