const DEMO_MODE = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = 'https://campus-acadmic-resource-managament.onrender.com';

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

async function parseJsonSafely(response) {
    const rawText = await response.text();
    console.log('[auth] raw response body:', rawText);

    if (!rawText) {
        return {};
    }

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error('[auth] failed to parse JSON response:', error);
        return { error: 'Server returned an invalid JSON response.', rawText };
    }
}

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
                            window.location.href = '/html/login.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = registerResult.message;
                    }
                } else {
                    const registerUrl = apiUrl('/api/auth/register');
                    console.log('[auth] register request:', {
                        url: registerUrl,
                        method: 'POST',
                        payload: {
                            ...data,
                            password: data.password ? '[REDACTED]' : ''
                        }
                    });
                    const response = await fetch(registerUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            ...data,
                            role: 'student'
                        })
                    });

                    console.log('[auth] register response status:', response.status, response.statusText);
                    const result = await parseJsonSafely(response);
                    console.log('[auth] register response data:', result);
                    if (response.ok) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = result.message || 'User registered successfully';
                        registerForm.reset();
                        setTimeout(() => {
                            window.location.href = '/html/login.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = result.error || result.message || 'Registration failed';
                    }
                }
            } catch (error) {
                console.error('[auth] register network error:', error);
                messageDiv.style.color = 'red';
                messageDiv.textContent = error.message || 'An error occurred. Please try again.';
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
                            window.location.href = '/html/dashboard.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = 'Invalid email or password';
                    }
                } else {
                    const loginUrl = apiUrl('/api/auth/login');
                    console.log('[auth] login request:', {
                        url: loginUrl,
                        method: 'POST',
                        payload: {
                            email: data.email,
                            password: data.password ? '[REDACTED]' : ''
                        }
                    });
                    const response = await fetch(loginUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });

                    console.log('[auth] login response status:', response.status, response.statusText);
                    result = await parseJsonSafely(response);
                    console.log('[auth] login response data:', result);
                    if (response.ok) {
                        messageDiv.style.color = 'green';
                        messageDiv.textContent = result.message || 'Login successful';
                        localStorage.setItem('user', JSON.stringify(result.user));
                        setTimeout(() => {
                            window.location.href = '/html/dashboard.html';
                        }, 2000);
                    } else {
                        messageDiv.style.color = 'red';
                        messageDiv.textContent = result.error || result.message || 'Login failed';
                    }
                }
            } catch (error) {
                console.error('[auth] login network error:', error);
                messageDiv.style.color = 'red';
                messageDiv.textContent = error.message || 'An error occurred. Please try again.';
            }
        });
    }
});
