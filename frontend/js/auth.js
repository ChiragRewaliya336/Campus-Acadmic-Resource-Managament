const DEMO_MODE = true;

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData);

            try {
                if (DEMO_MODE) {
                    const registerResult = mockRegister(data.name, data.email, data.password);

                    await new Promise(resolve => setTimeout(resolve, 800));

                    if (registerResult.success) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = registerResult.message;
                        registerForm.reset();
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = registerResult.message;
                    }
                } else {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...data,
                            role: 'student'
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = result.message;
                        registerForm.reset();
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = result.error;
                    }
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'An error occurred. Please try again.';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData);

            try {
                let result;
                
                if (DEMO_MODE) {
                    const loginResult = mockLogin(data.email, data.password);
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    if (loginResult.success) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = 'Login successful! Redirecting...';
                        localStorage.setItem('user', JSON.stringify(loginResult.user));
                        localStorage.setItem('isLoggedIn', 'true');
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = 'Invalid email or password';
                    }
                } else {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });

                    result = await response.json();
                    if (response.ok) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = result.message;
                        localStorage.setItem('user', JSON.stringify(result.user));
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = result.error;
                    }
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.textContent = 'An error occurred. Please try again.';
            }
        });
    }
});
