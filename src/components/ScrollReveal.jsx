import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal - Animate elements when they enter viewport
 * Uses Intersection Observer for performance
 */
const ScrollReveal = ({
    children,
    animation = 'fadeUp', // fadeUp, fadeIn, slideLeft, slideRight, scale
    duration = 0.6,
    delay = 0,
    threshold = 0.1,
    once = true,
    className = ''
}) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) {
                        observer.unobserve(entry.target);
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [threshold, once]);

    const getAnimationStyles = () => {
        const baseStyle = {
            transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s`,
        };

        if (!isVisible) {
            switch (animation) {
                case 'fadeUp':
                    return {
                        ...baseStyle,
                        opacity: 0,
                        transform: 'translateY(30px)',
                    };
                case 'fadeIn':
                    return {
                        ...baseStyle,
                        opacity: 0,
                    };
                case 'slideLeft':
                    return {
                        ...baseStyle,
                        opacity: 0,
                        transform: 'translateX(-50px)',
                    };
                case 'slideRight':
                    return {
                        ...baseStyle,
                        opacity: 0,
                        transform: 'translateX(50px)',
                    };
                case 'scale':
                    return {
                        ...baseStyle,
                        opacity: 0,
                        transform: 'scale(0.8)',
                    };
                default:
                    return baseStyle;
            }
        }

        return {
            ...baseStyle,
            opacity: 1,
            transform: 'translateY(0) translateX(0) scale(1)',
        };
    };

    return (
        <div ref={ref} style={getAnimationStyles()} className={className}>
            {children}
        </div>
    );
};

/**
 * ScrollRevealList - Stagger animation for list of items
 */
export const ScrollRevealList = ({
    children,
    animation = 'fadeUp',
    staggerDelay = 0.1,
    threshold = 0.1,
    className = ''
}) => {
    return (
        <div className={className}>
            {React.Children.map(children, (child, index) => (
                <ScrollReveal
                    animation={animation}
                    delay={index * staggerDelay}
                    threshold={threshold}
                    key={index}
                >
                    {child}
                </ScrollReveal>
            ))}
        </div>
    );
};

export default ScrollReveal;
