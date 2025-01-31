// Remove existing contact form code and replace with:

const contactForm = document.getElementById('contact-form');
const submitButton = contactForm.querySelector('button[type="submit"]');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = contactForm.querySelector('input[type="text"]').value;
    const email = contactForm.querySelector('input[type="email"]').value;
    const message = contactForm.querySelector('textarea').value;
    
    // Basic validation
    if (!name || !email || !message) {
        alert('Please fill in all fields');
        return;
    }
    
    // Configure mailto link
    const mailtoLink = `mailto:mehmet@mehmetkahya.com?subject=Portfolio Contact from ${name}&body=${encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    )}`;
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Opening mail client...';
    
    try {
        // Open default mail client
        window.location.href = mailtoLink;
        
        // Reset form
        setTimeout(() => {
            contactForm.reset();
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to open mail client. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
    }
});