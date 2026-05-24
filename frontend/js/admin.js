const DEMO_MODE = true;
const API_BASE_URL = 'https://campus-acadmic-resource-managament.onrender.com';

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

let allAdminCategories = [];

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('username').textContent = `Admin: ${user.username}`;

    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');

            sidebarLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    document.querySelector('.sidebar a[data-section="resources"]').classList.add('active');

    loadAdminData();
    loadAdminCategories();
    setupAdminCategoryManagement(user);

    // Setup admin search functionality after data is loaded
    setupAdminSearch();
});

function setupAdminSearch() {
    const searchInput = document.getElementById('adminSearchInput');
    const searchBtn = document.getElementById('adminSearchBtn');
    const clearBtn = document.getElementById('adminClearSearchBtn');

    if (!searchInput || !searchBtn || !clearBtn) {
        return;
    }

    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filterAndDisplayResources(window.allAdminResources || [], searchTerm);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filterAndDisplayResources(window.allAdminResources || [], searchTerm);
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        displayResourcesTable(window.allAdminResources || []);
    });
}

function filterAndDisplayResources(allResources, searchTerm) {
    if (!searchTerm) {
        displayResourcesTable(allResources);
        return;
    }

    const filteredResources = allResources.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm) ||
        (resource.description || '').toLowerCase().includes(searchTerm) ||
        (resource.category_name || resource.category || '').toLowerCase().includes(searchTerm) ||
        (getMockUsers()[resource.user_id]?.username || '').toLowerCase().includes(searchTerm)
    );

    displayResourcesTable(filteredResources);
}

async function loadAdminData() {
    try {
        let resources;
        let users;

        if (DEMO_MODE) {
            // Ensure mock storage is initialized
            initializeMockStorage();
            resources = getMockResources();
            users = getAllMockUsers();

            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            const resourcesResponse = await fetch(apiUrl('/api/admin/resources'));
            resources = await resourcesResponse.json();
            const usersResponse = await fetch(apiUrl('/api/admin/users'));
            users = await usersResponse.json();
        }

        // Store resources globally for search functionality
        window.allAdminResources = resources;

        displayResourcesTable(resources);
        displayUsersTable(users, JSON.parse(localStorage.getItem('user')));
        updateStatistics(resources, users);

    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function displayResourcesTable(resources) {
    const container = document.getElementById('resourcesTableContainer');
    const usersById = getMockUsers();

    if (resources.length > 0) {
        const tableHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Uploader</th>
                        <th>Status</th>
                        <th>Upload Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${resources.map(r => `
                        <tr>
                            <td>${r.title}</td>
                            <td>${r.category_name || r.category || 'Uncategorized'}</td>
                            <td>${usersById[r.user_id]?.username || r.uploader_name || 'Unknown'}</td>
                            <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                            <td>${new Date(r.created_at || r.uploaded_at).toLocaleDateString()}</td>
                            <td class="actions">
                                <button class="view-btn" onclick="adminViewResource(${r.id})">View</button>
                                ${r.status === 'pending' ?
                                    `<button class="approve-btn" onclick="approveResource(${r.id})">Approve</button>
                                     <button class="reject-btn" onclick="rejectResource(${r.id})">Reject</button>` :
                                    r.status === 'approved' ?
                                    `<button class="reject-btn" onclick="rejectResource(${r.id})">Reject</button>
                                     <button class="download-btn" onclick="adminDownloadResource(${r.id}, '${escapeForAttribute(r.title)}')">Download</button>` :
                                    `<button class="approve-btn" onclick="approveResource(${r.id})">Approve</button>`
                                }
                                <button class="delete-btn" onclick="deleteResource(${r.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tableHTML;
    } else {
        container.innerHTML = '<p>No resources found.</p>';
    }
}

function displayUsersTable(users, currentUser) {
    const container = document.getElementById('usersTableContainer');

    if (!container) {
        return;
    }

    if (users.length > 0) {
        container.innerHTML = `
            <table class="admin-table role-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>User ID</th>
                        <th>Current Role</th>
                        <th>Change Role</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${user.id}</td>
                            <td><span class="role-badge role-${user.role}">${formatRoleLabel(user.role)}</span></td>
                            <td>
                                <select id="role-select-${user.id}" class="role-select" ${user.id === currentUser.id ? 'disabled' : ''}>
                                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                            <td class="actions">
                                <button class="save-role-btn" onclick="updateUserRole('${user.id}')" ${user.id === currentUser.id ? 'disabled' : ''}>Save Role</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        container.innerHTML = '<p>No users found.</p>';
    }
}

function updateStatistics(resources, users) {
    const total = resources.length;
    const approved = resources.filter(r => r.status === 'approved').length;
    const pending = resources.filter(r => r.status === 'pending').length;

    document.getElementById('totalResources').textContent = total;
    document.getElementById('approvedResources').textContent = approved;
    document.getElementById('pendingResources').textContent = pending;
    document.getElementById('totalUsers').textContent = users.length;
}

function setupAdminCategoryManagement(user) {
    const adminCategoryForm = document.getElementById('adminCategoryForm');
    const adminCategoryMessage = document.getElementById('adminCategoryMessage');

    if (!adminCategoryForm || !adminCategoryMessage) {
        return;
    }

    adminCategoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nameInput = document.getElementById('adminCategoryName');
        const categoryName = nameInput.value.trim();

        if (!categoryName) {
            showAdminMessage('Category name is required.', false);
            return;
        }

        try {
            let result;

            if (DEMO_MODE) {
                result = mockCreateCategory(categoryName, user.id);
                await new Promise(resolve => setTimeout(resolve, 300));
            } else {
                const response = await fetch(apiUrl('/api/categories'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: categoryName,
                        user_id: user.id
                    })
                });

                result = await response.json();
                result.success = response.ok;
            }

            if (result.success) {
                showAdminMessage(result.message || 'Category created successfully.', true);
                adminCategoryForm.reset();
                await loadAdminCategories();
            } else {
                showAdminMessage(result.error || result.message || 'Unable to create category.', false);
            }
        } catch (error) {
            showAdminMessage('Unable to create category right now.', false);
        }
    });
}

async function loadAdminCategories() {
    try {
        if (DEMO_MODE) {
            allAdminCategories = mockGetCategories();
        } else {
            const response = await fetch(apiUrl('/api/categories'));
            const categories = await response.json();
            allAdminCategories = response.ok ? categories : [];
        }

        renderAdminCategories(allAdminCategories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderAdminCategories(categories) {
    const adminCategoriesOverview = document.getElementById('adminCategoriesOverview');

    if (!adminCategoriesOverview) {
        return;
    }

    if (categories.length === 0) {
        adminCategoriesOverview.innerHTML = '<p>No categories available.</p>';
        return;
    }

    adminCategoriesOverview.innerHTML = categories.map(category => `
        <div class="subject-overview-card">
            <button type="button" class="subject-pill">${category.name}</button>
            <button type="button" class="subject-delete-btn" onclick="adminDeleteCategory(${category.id})">Delete</button>
        </div>
    `).join('');
}

async function adminDeleteCategory(categoryId) {
    const category = allAdminCategories.find(item => item.id === Number(categoryId));

    if (!category) {
        showAdminMessage('Category not found.', false);
        return;
    }

    const confirmed = confirm(`Delete category "${category.name}"? This will work only if no resources are using it.`);
    if (!confirmed) {
        return;
    }

    try {
        let result;

        if (DEMO_MODE) {
            result = mockDeleteCategory(categoryId);
            await new Promise(resolve => setTimeout(resolve, 250));
        } else {
            const response = await fetch(apiUrl(`/api/categories/${categoryId}`), {
                method: 'DELETE'
            });

            result = await response.json();
            result.success = response.ok;
        }

        if (result.success) {
            showAdminMessage(result.message || 'Category deleted successfully.', true);
            await loadAdminCategories();
        } else {
            showAdminMessage(result.error || result.message || 'Unable to delete category.', false);
        }
    } catch (error) {
        showAdminMessage('Unable to delete category right now.', false);
    }
}

function showAdminMessage(message, isSuccess) {
    const adminCategoryMessage = document.getElementById('adminCategoryMessage');
    if (!adminCategoryMessage) {
        return;
    }

    adminCategoryMessage.textContent = message;
    adminCategoryMessage.className = `panel-message ${isSuccess ? 'success-message' : 'error-message'}`;
}

async function approveResource(id) {
    try {
        if (DEMO_MODE) {
            const result = mockApproveResource(id);
            if (result.success) {
                alert(result.message);
                await new Promise(resolve => setTimeout(resolve, 500));
                loadAdminData();
            } else {
                alert(result.message);
            }
        } else {
            const response = await fetch(apiUrl(`/api/admin/resources/${id}/approve`), {
                method: 'PUT'
            });

            if (response.ok) {
                alert('Resource approved successfully');
                loadAdminData();
            } else {
                alert('Failed to approve resource');
            }
        }
    } catch (error) {
        console.error('Error approving resource:', error);
        alert('Error approving resource');
    }
}

async function rejectResource(id) {
    try {
        if (DEMO_MODE) {
            const result = mockRejectResource(id);
            if (result.success) {
                alert(result.message);
                await new Promise(resolve => setTimeout(resolve, 500));
                loadAdminData();
            } else {
                alert(result.message);
            }
        } else {
            const response = await fetch(apiUrl(`/api/admin/resources/${id}/reject`), {
                method: 'PUT'
            });

            if (response.ok) {
                alert('Resource rejected successfully');
                loadAdminData();
            } else {
                alert('Failed to reject resource');
            }
        }
    } catch (error) {
        console.error('Error rejecting resource:', error);
        alert('Error rejecting resource');
    }
}

async function deleteResource(id) {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
        return;
    }

    try {
        if (DEMO_MODE) {
            const resources = getMockResources().filter(resource => resource.id !== id);
            saveMockResources(resources);
            alert('Resource deleted successfully');
            loadAdminData();
        } else {
            const response = await fetch(apiUrl(`/api/admin/resources/${id}`), {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Resource deleted successfully');
                loadAdminData();
            } else {
                alert('Failed to delete resource');
            }
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Error deleting resource');
    }
}

async function updateUserRole(userId) {
    const roleSelect = document.getElementById(`role-select-${userId}`);
    const messageEl = document.getElementById('roleManagementMessage');

    if (!roleSelect || !messageEl) {
        return;
    }

    const newRole = roleSelect.value;
    const currentUser = JSON.parse(localStorage.getItem('user'));

    try {
        let result;

        if (DEMO_MODE) {
            result = mockUpdateUserRole(userId, newRole, currentUser.id);
            await new Promise(resolve => setTimeout(resolve, 400));
        } else {
            const response = await fetch(apiUrl(`/api/admin/users/${userId}/role`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update role');
            }
        }

        messageEl.textContent = result.message;
        messageEl.className = `panel-message ${result.success ? 'success-message' : 'error-message'}`;

        if (result.success) {
            loadAdminData();
        }
    } catch (error) {
        messageEl.textContent = error.message || 'Unable to update user role.';
        messageEl.className = 'panel-message error-message';
    }
}

function formatRoleLabel(role) {
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Student';
}

function escapeForAttribute(value) {
    return String(value).replace(/'/g, "\\'");
}

async function adminDownloadResource(resourceId, resourceTitle) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        alert('Please login to download resources');
        return;
    }

    if (DEMO_MODE) {
        const resource = getMockResources().find(r => r.id === resourceId);
        if (!resource) {
            alert('Resource not found');
            return;
        }

        if (resource.file_content) {
            const content = resource.file_content;
            const element = document.createElement('a');
            if (typeof content === 'string' && content.startsWith('data:')) {
                const blob = dataUrlToBlob(content);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    element.setAttribute('href', url);
                    element.setAttribute('download', resource.file_name || `${resourceTitle}.txt`);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    return;
                }
            }
            const href = `data:${resource.file_type || 'text/plain'};charset=utf-8,${encodeURIComponent(content)}`;
            element.setAttribute('href', href);
            element.setAttribute('download', resource.file_name || `${resourceTitle}.txt`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            return;
        }
    }

    window.location.href = apiUrl(`/api/download/${resourceId}?user_id=${user.id}`);
}

function adminViewResource(resourceId) {
    const normalizedId = String(resourceId);
    const resource = getMockResources().find(r => String(r.id) === normalizedId);
    if (!resource) {
        alert('Resource not found');
        return;
    }

    const details = `Title: ${resource.title}\nCategory: ${resource.category_name || resource.category || 'Uncategorized'}\nUploader: ${getMockUsers()[resource.user_id]?.username || 'Unknown'}\nStatus: ${resource.status}\nDescription: ${resource.description || 'No description'}\nUpload Date: ${resource.created_at || resource.uploaded_at}`;

    if (DEMO_MODE && resource.file_content) {
        const content = resource.file_content;
        const isDataUrl = typeof content === 'string' && content.startsWith('data:');
        const fileName = resource.file_name || '';
        const isDocFile = /\.(doc|docx)$/i.test(fileName);
        const isPptFile = /\.(ppt|pptx)$/i.test(fileName);

        if (isDataUrl) {
            const blob = dataUrlToBlob(content);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const previewWindow = window.open('', '_blank');
                if (previewWindow) {
                    previewWindow.document.title = resource.file_name || resource.title;
                    previewWindow.document.body.innerHTML = `
                        <h2>${escapeHtml(resource.title)}</h2>
                        <p>${escapeHtml(details).replace(/\n/g, '<br>')}</p>
                        <hr>
                        <iframe src="${url}" style="width:100%;height:100vh;border:none;"></iframe>
                    `;
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    return;
                }
            }
        }
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.document.title = resource.file_name || resource.title;
            previewWindow.document.body.insertAdjacentHTML('afterbegin', `<h2>${escapeHtml(resource.title)}</h2><p>${escapeHtml(details).replace(/\n/g, '<br>')}</p><hr>`);

            if (isDocFile) {
                previewWindow.document.write(`
                    <div style="text-align: center; padding: 50px;">
                        <h3>Microsoft Word Document</h3>
                        <p>This is a Word document (.doc/.docx) that cannot be previewed in the browser.</p>
                        <p>Please download the file to view its contents.</p>
                        <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px;">Close</button>
                    </div>
                `);
            } else if (isPptFile) {
                previewWindow.document.write(`
                    <div style="text-align: center; padding: 50px;">
                        <h3>Microsoft PowerPoint Presentation</h3>
                        <p>This is a PowerPoint presentation (.ppt/.pptx) that cannot be previewed in the browser.</p>
                        <p>Please download the file to view its contents.</p>
                        <button onclick="window.close()" style="padding: 10px 20px; margin-top: 20px;">Close</button>
                    </div>
                `);
            } else if (String(resource.file_type || '').startsWith('text/') || /\.(txt|md|json|js|css|html|csv)$/i.test(fileName)) {
                previewWindow.document.write(`<pre>${escapeHtml(String(content))}</pre>`);
            } else {
                previewWindow.document.write(`<p>Preview is not available for this file type. Please download to view the file.</p>`);
            }
            return;
        }
    }

    alert(`${details}${resource.file_content ? '\n\nFile content is available for demo resources via download.' : ''}`);
}

function dataUrlToBlob(dataUrl) {
    const [meta, data] = dataUrl.split(',');
    const matches = /data:([^;]+)(;base64)?/.exec(meta);
    if (!matches) {
        return null;
    }
    const mime = matches[1];
    const isBase64 = !!matches[2];
    const bytes = isBase64 ? atob(data) : decodeURIComponent(data);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) {
        buffer[i] = bytes.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
