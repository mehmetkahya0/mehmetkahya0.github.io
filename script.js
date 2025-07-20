// Modern Portfolio JavaScript with Advanced Features

class PortfolioApp {
    constructor() {
        this.init();
    }

    init() {
        // Initialize all features when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.initCursor();
            this.initNavigation();
            this.initTypingAnimation();
            this.initScrollAnimations();
            this.initProjectFilters();
            this.initContactForm();
            this.initThemeToggle();
            this.initSmoothScroll();
        });
    }

    // Custom Cursor
    initCursor() {
        if (window.innerWidth <= 768) return; // Disable on mobile

        const cursor = document.getElementById('cursor');
        const cursorBlur = document.getElementById('cursor-blur');

        if (!cursor || !cursorBlur) return;

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            
            cursorBlur.style.left = e.clientX - 20 + 'px';
            cursorBlur.style.top = e.clientY - 20 + 'px';
        });

        // Cursor hover effects
        const hoverElements = document.querySelectorAll('a, button, .project-card, .skill-tag');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'scale(1.5)';
                cursorBlur.style.transform = 'scale(1.5)';
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'scale(1)';
                cursorBlur.style.transform = 'scale(1)';
            });
        });
    }

    // Navigation functionality
    initNavigation() {
        const navbar = document.getElementById('navbar');
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('nav-links');
        const navItems = document.querySelectorAll('.nav-link');

        if (!navbar) {
            console.error('Navbar element not found');
            return;
        }

        // Mobile menu toggle
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('active');
                
                // Prevent body scroll when menu is open
                if (navLinks.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });

            // Close menu when clicking on nav items
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }

        // Active nav item based on scroll position
        window.addEventListener('scroll', () => {
            // Navbar background on scroll
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(15, 23, 42, 0.95)';
            } else {
                navbar.style.background = 'rgba(15, 23, 42, 0.8)';
            }

            // Update active nav item
            this.updateActiveNavItem();
        });
    }

    updateActiveNavItem() {
        const sections = document.querySelectorAll('section');
        const navItems = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === current) {
                item.classList.add('active');
            }
        });
    }

    // Typing animation
    initTypingAnimation() {
        const typingText = document.getElementById('typing-text');
        if (!typingText) return;

        const textArray = [
            "Software Developer",
            "AI Enthusiast",
            "Electrical Engineer",
            "Problem Solver",
            "Space Technology Lover",
            "Backend Developer"
        ];

        let textArrayIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typeSpeed = 100;

        const type = () => {
            const currentText = textArray[textArrayIndex];
            
            if (isDeleting) {
                typingText.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
                typeSpeed = 50;
            } else {
                typingText.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
                typeSpeed = 100;
            }

            if (!isDeleting && charIndex === currentText.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textArrayIndex = (textArrayIndex + 1) % textArray.length;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        };

        // Start typing animation after a delay
        setTimeout(() => {
            type();
        }, 1000);
    }

    // Scroll animations
    initScrollAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        const animateElements = document.querySelectorAll('.project-card, .stat-item, .skill-category, .contact-card');
        animateElements.forEach((el, index) => {
            el.classList.add('scroll-animate');
            el.style.transitionDelay = `${index * 0.1}s`;
            observer.observe(el);
        });

        // Parallax effect for floating shapes
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const shapes = document.querySelectorAll('.shape');
            
            shapes.forEach((shape, index) => {
                const speed = 0.5 + index * 0.1;
                shape.style.transform = `translateY(${scrolled * speed}px)`;
            });
        });
    }

    // Project filtering (if needed for future expansion)
    initProjectFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');
                
                // Update active filter button
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter projects
                projectCards.forEach(card => {
                    if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                        card.style.display = 'block';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }

    // Contact form handling
    initContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const formButton = contactForm.querySelector('.form-submit');
            const buttonText = formButton.querySelector('span');
            const buttonIcon = formButton.querySelector('i');
            
            // Get form values
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            // Basic validation
            if (!name || !email || !subject || !message) {
                this.showNotification('Please fill in all fields', 'error');
                return;
            }

            if (!this.isValidEmail(email)) {
                this.showNotification('Please enter a valid email address', 'error');
                return;
            }

            // Update button state
            buttonText.textContent = 'Sending...';
            buttonIcon.className = 'fas fa-spinner fa-spin';
            formButton.disabled = true;

            try {
                // Create mailto link
                const mailtoLink = `mailto:mehmetkahyakas5@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
                    `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
                )}`;

                // Open default mail client
                window.location.href = mailtoLink;

                // Show success message
                this.showNotification('Thank you! Your message has been sent.', 'success');
                
                // Reset form
                contactForm.reset();

            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Failed to send message. Please try again.', 'error');
            } finally {
                // Reset button
                setTimeout(() => {
                    buttonText.textContent = 'Send Message';
                    buttonIcon.className = 'fas fa-paper-plane';
                    formButton.disabled = false;
                }, 1000);
            }
        });
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Theme toggle (if needed)
    initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        // For now, this is a placeholder for future theme switching functionality
        themeToggle.addEventListener('click', () => {
            // Future: Toggle between light and dark themes
            console.log('Theme toggle clicked - feature coming soon!');
        });
    }

    // Smooth scrolling
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Scroll to top functionality
        const scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollToTopBtn.className = 'scroll-to-top';
        scrollToTopBtn.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 50px;
            height: 50px;
            background: var(--gradient-primary);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: var(--shadow-lg);
        `;

        document.body.appendChild(scrollToTopBtn);

        // Show/hide scroll to top button
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollToTopBtn.style.opacity = '1';
                scrollToTopBtn.style.visibility = 'visible';
            } else {
                scrollToTopBtn.style.opacity = '0';
                scrollToTopBtn.style.visibility = 'hidden';
            }
        });

        // Scroll to top functionality
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Initialize the portfolio app
const portfolio = new PortfolioApp();

// Performance optimization
window.addEventListener('load', () => {
    // Remove loading states
    document.body.classList.add('loaded');
    
    // Preload images
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
    });
});

// Handle resize events
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Reinitialize cursor on desktop if window is resized
        if (window.innerWidth > 768) {
            portfolio.initCursor();
        }
    }, 250);
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortfolioApp;
}
