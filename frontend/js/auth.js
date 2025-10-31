// frontend/js/auth.js

// We check the form ID to make sure we're on the right page
const registerForm = document.getElementById('register-form');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- Get all form values ---
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    // user_role is GONE
    const year = document.getElementById('year').value;
    const branch = document.getElementById('branch').value;
    const club_id = document.getElementById('club').value;
    const skillsInput = document.getElementById('skills').value;
    const messageEl = document.getElementById('form-message');

    const skills = skillsInput
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          // user_role is GONE
          year: parseInt(year), // Year is now from a select
          branch: branch,       // Branch is now from a select
          club_id: parseInt(club_id),
          skills: skills,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        messageEl.textContent = 'Registration successful! Redirecting...';
        messageEl.className = 'message success';
        localStorage.setItem('token', data.token);
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 2000);
      } else {
        messageEl.textContent = data.msg || 'Registration failed.';
        messageEl.className = 'message error';
      }
    } catch (err) {
      console.error('Registration error:', err);
      messageEl.textContent = 'An error occurred. Please try again.';
      messageEl.className = 'message error';
    }
  });
}

// We will add login logic here later
// frontend/js/auth.js

// ... (your existing registerForm code is up here) ...

// --- LOGIN LOGIC ---
const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the form from submitting

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('form-message');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Login successful
        messageEl.textContent = 'Login successful! Redirecting...';
        messageEl.className = 'message success';

        // Save the token and redirect to dashboard
        localStorage.setItem('token', data.token);
        setTimeout(() => {
          window.location.href = 'dashboard.html'; // Redirect to dashboard
        }, 2000);

      } else {
        // Error from server
        messageEl.textContent = data.msg || 'Login failed.';
        messageEl.className = 'message error';
      }
    } catch (err) {
      console.error('Login error:', err);
      messageEl.textContent = 'An error occurred. Please try again.';
      messageEl.className = 'message error';
    }
  });
}