import React, { useEffect, useRef } from 'react';

/**
 * ParticleBackground - Canvas-based animated particle system
 * Creates floating particles that respond to mouse movement
 */
const ParticleBackground = ({
    particleCount = 50,
    particleColor = 'rgba(124, 77, 255, 0.5)',
    particleSize = 2,
    speed = 0.5,
    interactive = true
}) => {
    const canvasRef = useRef(null);
    const particles = useRef([]);
    const mouse = useRef({ x: null, y: null });
    const animationFrameId = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = -10;
                this.size = Math.random() * particleSize + 1;
                this.speedX = (Math.random() - 0.5) * speed;
                this.speedY = Math.random() * speed + 0.2;
                this.opacity = Math.random() * 0.5 + 0.2;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Interactive mouse effect
                if (interactive && mouse.current.x !== null) {
                    const dx = mouse.current.x - this.x;
                    const dy = mouse.current.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDistance = 150;

                    if (distance < maxDistance) {
                        const force = (maxDistance - distance) / maxDistance;
                        this.x -= (dx / distance) * force * 2;
                        this.y -= (dy / distance) * force * 2;
                    }
                }

                // Reset particle when it goes off screen
                if (this.y > canvas.height + 10 || this.x < -10 || this.x > canvas.width + 10) {
                    this.reset();
                }
            }

            draw() {
                ctx.fillStyle = particleColor.replace(/[\d.]+\)$/g, `${this.opacity})`);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Optional: Add glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = particleColor;
            }
        }

        // Initialize particles
        particles.current = [];
        for (let i = 0; i < particleCount; i++) {
            particles.current.push(new Particle());
        }

        // Mouse move handler
        const handleMouseMove = (e) => {
            mouse.current.x = e.clientX;
            mouse.current.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.current.x = null;
            mouse.current.y = null;
        };

        if (interactive) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseleave', handleMouseLeave);
        }

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.shadowBlur = 0;

            particles.current.forEach(particle => {
                particle.update();
                particle.draw();
            });

            // Draw connections between nearby particles
            particles.current.forEach((particle, i) => {
                for (let j = i + 1; j < particles.current.length; j++) {
                    const dx = particle.x - particles.current[j].x;
                    const dy = particle.y - particles.current[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.strokeStyle = particleColor.replace(/[\d.]+\)$/g, `${0.1 * (1 - distance / 120)})`);
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(particles.current[j].x, particles.current[j].y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId.current = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (interactive) {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseleave', handleMouseLeave);
            }
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [particleCount, particleColor, particleSize, speed, interactive]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1
            }}
        />
    );
};

export default ParticleBackground;
