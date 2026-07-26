document.addEventListener('DOMContentLoaded', () => {
  // Elements for Form Toggles
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const forgotForm = document.getElementById('forgot-form');
  
  const formSubtitle = document.getElementById('form-subtitle');
  const greetingTitle = document.getElementById('greeting-title');

  // Navigation Links
  const gotoSignupLink = document.getElementById('goto-signup');
  const gotoForgotLink = document.getElementById('goto-forgot');
  const signupGotoLoginLink = document.getElementById('signup-goto-login');
  const forgotGotoLoginLink = document.getElementById('forgot-goto-login');

  // 1. DYNAMIC TIME-BASED GREETING
  function updateGreeting() {
    const hours = new Date().getHours();
    let greetingText = 'Good Morning';
    
    if (hours >= 12 && hours < 17) {
      greetingText = 'Good Afternoon';
    } else if (hours >= 17 || hours < 4) {
      greetingText = 'Good Evening';
    }
    
    if (greetingTitle) {
      greetingTitle.textContent = greetingText;
    }
  }
  updateGreeting();

  // 2. PASSWORD VISIBILITY TOGGLE
  const pwdToggleButtons = document.querySelectorAll('.pwd-toggle');
  
  pwdToggleButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const inputGroup = button.parentElement;
      const pwdInput = inputGroup.querySelector('input');
      const svgIcon = button.querySelector('svg');
      
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        // Eye-off icon
        svgIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      } else {
        pwdInput.type = 'password';
        // Eye-on icon
        svgIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    });
  });

  // 3. FORM SWITCHING LOGIC WITH TRANSITIONS
  function switchForm(targetForm, subtitleText) {
    const activeForm = document.querySelector('.auth-form.active');
    
    if (activeForm === targetForm) return;

    // Fade out active form
    activeForm.classList.remove('active');
    
    setTimeout(() => {
      // Switch active class
      targetForm.classList.add('active');
      formSubtitle.textContent = subtitleText;
      
      // Clear errors on target form
      clearFormErrors(targetForm);
    }, 250); // Matches CSS transition delay
  }

  gotoSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(signupForm, 'Create Your Account');
  });

  gotoForgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(forgotForm, 'Reset Your Password');
  });

  signupGotoLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, 'Login Your Account');
  });

  forgotGotoLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, 'Login Your Account');
  });


  // 4. CLIENT-SIDE VALIDATION
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  function setError(inputGroup, isInvalid) {
    if (isInvalid) {
      inputGroup.classList.add('invalid');
    } else {
      inputGroup.classList.remove('invalid');
    }
  }

  function clearFormErrors(form) {
    const inputGroups = form.querySelectorAll('.input-group');
    inputGroups.forEach(group => group.classList.remove('invalid'));
  }

  // Live input validation on blur / user typing after error
  const inputs = document.querySelectorAll('.input-group input');
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateInput(input);
    });

    input.addEventListener('input', () => {
      // If the field is currently invalid, validate live on input to clear the error quickly
      if (input.parentElement.classList.contains('invalid')) {
        validateInput(input);
      }
    });
  });

  function validateInput(input) {
    const group = input.parentElement;
    const value = input.value.trim();
    let isInvalid = false;

    if (input.required && !value) {
      isInvalid = true;
    } else if (input.type === 'email' && value) {
      isInvalid = !validateEmail(value);
    } else if (input.type === 'password' && value) {
      isInvalid = value.length < 6;
    }

    setError(group, isInvalid);
    return !isInvalid;
  }


  // 5. MOCK SUBMISSION HANDLER
  const forms = [loginForm, signupForm, forgotForm];
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validate all fields in this form
      const inputsInForm = form.querySelectorAll('input');
      let isFormValid = true;
      
      inputsInForm.forEach(input => {
        const isValid = validateInput(input);
        if (!isValid) isFormValid = false;
      });

      if (!isFormValid) return;

      // Handle simulated network submission
      const submitBtn = form.querySelector('.btn-submit');
      const btnText = submitBtn.querySelector('.btn-text');
      const originalText = btnText.textContent;
      
      submitBtn.classList.add('loading');
      
      // Simulate API delay
      setTimeout(() => {
        submitBtn.classList.remove('loading');
        
        if (form === loginForm) {
          window.location.href = 'dashboard.html';
        } else if (form === signupForm) {
          alert('Account created successfully!');
          switchForm(loginForm, 'Login Your Account');
        } else if (form === forgotForm) {
          alert('Password reset link sent to your email.');
          switchForm(loginForm, 'Login Your Account');
        }
        
        form.reset();
      }, 1200);
    });
  });
});
