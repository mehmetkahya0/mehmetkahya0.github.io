// Modern Contact Form Handler
class ContactFormManager {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupContactForm();
            this.setupFormValidation();
        });
    }

    setupContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmission(contactForm);
        });
    }

    async handleFormSubmission(form) {
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('span:first-child');
        
        // Get form values
        const name = formData.get('name')?.trim();
        const email = formData.get('email')?.trim();
        const subject = formData.get('subject')?.trim();
        const message = formData.get('message')?.trim();

        // Validate form
        const validation = this.validateForm({ name, email, subject, message });
        if (!validation.isValid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        // Update button state
        this.updateButtonState(submitButton, buttonText, 'sending');

        try {
            // Create enhanced mailto link
            const mailtoLink = this.createMailtoLink(name, email, subject, message);
            
            // Open default mail client
            window.location.href = mailtoLink;
            
            // Show success message
            this.showNotification('Thank you! Your message has been prepared in your default email client.', 'success');
            
            // Reset form after a short delay
            setTimeout(() => {
                form.reset();
                this.clearFormErrors(form);
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            this.showNotification('Failed to open email client. Please try again or contact me directly.', 'error');
        } finally {
            // Reset button
            setTimeout(() => {
                this.updateButtonState(submitButton, buttonText, 'default');
            }, 2000);
        }
    }

    validateForm({ name, email, subject, message }) {
        if (!name) {
            return { isValid: false, message: 'Please enter your name' };
        }

        if (name.length < 2) {
            return { isValid: false, message: 'Name must be at least 2 characters long' };
        }

        if (!email) {
            return { isValid: false, message: 'Please enter your email address' };
        }

        if (!this.isValidEmail(email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        if (!subject) {
            return { isValid: false, message: 'Please enter a subject' };
        }

        if (subject.length < 5) {
            return { isValid: false, message: 'Subject must be at least 5 characters long' };
        }

        if (!message) {
            return { isValid: false, message: 'Please enter your message' };
        }

        if (message.length < 10) {
            return { isValid: false, message: 'Message must be at least 10 characters long' };
        }

        return { isValid: true };
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email);
    }

    createMailtoLink(name, email, subject, message) {
        const enhancedSubject = `Portfolio Contact: ${subject}`;
        const enhancedMessage = `
Hello Mehmet,

I hope this message finds you well. I'm reaching out regarding your portfolio.

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from your portfolio website.
Best regards,
${name}
        `.trim();

        return `mailto:mehmetkahyakas5@gmail.com?subject=${encodeURIComponent(enhancedSubject)}&body=${encodeURIComponent(enhancedMessage)}`;
    }

    updateButtonState(button, textElement, state) {
        const states = {
            default: {
                text: 'Send Message',
                disabled: false
            },
            sending: {
                text: 'Opening Email Client...',
                disabled: true
            },
            success: {
                text: 'Message Prepared!',
                disabled: true
            }
        };

        const currentState = states[state] || states.default;
        
        if (textElement) textElement.textContent = currentState.text;
        if (button) button.disabled = currentState.disabled;
    }

    setupFormValidation() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        const inputs = form.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            // Clear errors on focus
            input.addEventListener('focus', () => {
                this.clearFieldError(input);
            });

            // Character count for textarea
            if (input.tagName === 'TEXTAREA') {
                this.addCharacterCount(input);
            }
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'name':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters';
                }
                break;
            
            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email';
                }
                break;
            
            case 'subject':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Subject is required';
                } else if (value.length < 5) {
                    isValid = false;
                    errorMessage = 'Subject must be at least 5 characters';
                }
                break;
            
            case 'message':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Message is required';
                } else if (value.length < 10) {
                    isValid = false;
                    errorMessage = 'Message must be at least 10 characters';
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: var(--danger-color);
            font-size: 0.85rem;
            margin-top: 0.25rem;
            animation: fadeInUp 0.3s ease;
        `;
        
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    clearFormErrors(form) {
        const errorElements = form.querySelectorAll('.field-error');
        errorElements.forEach(el => el.remove());
        
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }

    addCharacterCount(textarea) {
        const maxLength = 500; // Set a reasonable max length
        const countElement = document.createElement('div');
        countElement.className = 'character-count';
        countElement.style.cssText = `
            font-size: 0.8rem;
            color: var(--text-muted);
            text-align: right;
            margin-top: 0.25rem;
        `;
        
        textarea.parentNode.appendChild(countElement);
        
        const updateCount = () => {
            const remaining = maxLength - textarea.value.length;
            countElement.textContent = `${textarea.value.length}/${maxLength}`;
            
            if (remaining < 50) {
                countElement.style.color = 'var(--warning-color)';
            } else if (remaining < 0) {
                countElement.style.color = 'var(--danger-color)';
            } else {
                countElement.style.color = 'var(--text-muted)';
            }
        };
        
        textarea.addEventListener('input', updateCount);
        updateCount();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#6366f1'
        };

        notification.innerHTML = `
            <div class="notification-content" style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.25rem;
                background: ${colors[type] || colors.info};
                color: white;
                border-radius: 0.5rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                font-size: 0.9rem;
                line-height: 1.5;
            ">
                <span style="flex: 1; word-break: break-word;">${message}</span>
                <button class="notification-close" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    transition: background-color 0.2s;
                    font-size: 1rem;
                    line-height: 1;
                    flex-shrink: 0;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                    &times;
                </button>
            </div>
        `;

        // Position notification
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            z-index: 10000;
            max-width: 420px;
            width: calc(100vw - 4rem);
            transform: translateX(calc(100% + 2rem));
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        // Add media query for mobile
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            notification.style.cssText = `
                position: fixed;
                top: 1rem;
                left: 1rem;
                right: 1rem;
                z-index: 10000;
                max-width: none;
                width: auto;
                transform: translateY(-150%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            `;
        }

        document.body.appendChild(notification);

        // Check if mobile for animation
        const isMobile = window.innerWidth < 768;

        // Animate in
        setTimeout(() => {
            if (isMobile) {
                notification.style.transform = 'translateY(0)';
            } else {
                notification.style.transform = 'translateX(0)';
            }
        }, 100);

        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            if (isMobile) {
                notification.style.transform = 'translateY(-150%)';
            } else {
                notification.style.transform = 'translateX(calc(100% + 2rem))';
            }
            setTimeout(() => notification.remove(), 300);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                if (isMobile) {
                    notification.style.transform = 'translateY(-150%)';
                } else {
                    notification.style.transform = 'translateX(calc(100% + 2rem))';
                }
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize the contact form handler
const contactHandler = new ContactFormManager();

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactFormHandler;
}