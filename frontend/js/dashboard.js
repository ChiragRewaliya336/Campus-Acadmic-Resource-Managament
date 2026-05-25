const DEMO_MODE = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = 'https://campus-acadmic-resource-managament.onrender.com';
const AUTO_REFRESH_INTERVAL_MS = 15000;
let dashboardRefreshHandle = null;
let dashboardRefreshInFlight = false;

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
}

async function fetchFresh(path, options = {}) {
    return fetch(apiUrl(path), {
        cache: 'no-store',
        ...options
    });
}

let allResources = [];
let allCategories = [];
let allResourcesList = [];
let selectedCategoryName = '';
let currentUserRole = 'student';

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/html/login.html';
        return;
    }

    currentUserRole = user.role || 'student';

    updateUserHeader(user);
    setupLogout();
    setupSectionSwitching();
    setupCategoryCreation(user);
    setupUploadForm(user);

    await refreshDashboardView();
    startDashboardAutoRefresh();

    // Setup search after data is loaded
    setupSearchAndFilters();
});

async function refreshDashboardView() {
    const user = getCurrentUser();
    if (!user) {
        return;
    }

    await loadCategories();
    const { myResources } = await loadResources(user.id);
    const history = await loadHistory(user.id);
    await loadDashboard(user.id, myResources, history);
}

function startDashboardAutoRefresh() {
    if (dashboardRefreshHandle) {
        return;
    }

    dashboardRefreshHandle = window.setInterval(async () => {
        if (document.hidden || dashboardRefreshInFlight) {
            return;
        }

        dashboardRefreshInFlight = true;
        try {
            await refreshDashboardView();
        } finally {
            dashboardRefreshInFlight = false;
        }
    }, AUTO_REFRESH_INTERVAL_MS);
}

function updateUserHeader(user) {
    const usernameEl = document.getElementById('username');
    const welcomeEl = document.getElementById('welcomeMessage');
    const currentUserRoleEl = document.getElementById('currentUserRole');
    const adminLink = document.getElementById('adminLink');

    if (usernameEl) usernameEl.textContent = `Hello, ${user.username}`;
    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.username}!`;
    if (currentUserRoleEl) currentUserRoleEl.textContent = formatRoleLabel(user.role);

    if (adminLink && user.role === 'admin') {
        adminLink.style.display = 'inline';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

function setupSectionSwitching() {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.section');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');

            sidebarLinks.forEach(item => item.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(sectionId)?.classList.add('active');
        });
    });

    document.querySelector('.sidebar a[data-section="dashboard"]')?.classList.add('active');
}

function setupSearchAndFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const clearCategoryViewBtn = document.getElementById('clearCategoryView');

    if (searchBtn && searchInput && categoryFilter) {
        searchBtn.addEventListener('click', () => {
            renderResourceExplorer(allResources, searchInput.value, '');
        });

        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                renderResourceExplorer(allResources, searchInput.value, '');
            }
        });
    }

    if (categoryFilter && searchInput) {
        categoryFilter.addEventListener('change', () => {
            selectedCategoryName = categoryFilter.value;
            renderResourceExplorer(allResources, searchInput.value, categoryFilter.value);
        });
    }

    if (refreshBtn && searchInput && categoryFilter) {
        refreshBtn.addEventListener('click', () => {
            searchInput.value = '';
            categoryFilter.value = '';
            selectedCategoryName = '';
            renderResourceExplorer(allResources, '', '');
        });
    }

    if (clearCategoryViewBtn && categoryFilter) {
        clearCategoryViewBtn.addEventListener('click', () => {
            selectedCategoryName = '';
            categoryFilter.value = '';
            renderResourceExplorer(allResources, searchInput?.value || '', '');
        });
    }
}

function setupCategoryCreation(user) {
    const categoryForm = document.getElementById('categoryForm');
    const categoryMessage = document.getElementById('categoryMessage');

    if (!categoryForm || !categoryMessage) {
        return;
    }

    categoryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nameInput = document.getElementById('newCategoryName');
        const categoryName = nameInput.value.trim();

        if (!categoryName) {
            showInlineMessage(categoryMessage, 'Category name is required.', false);
            return;
        }

        try {
            let result;

            if (DEMO_MODE) {
                result = mockCreateCategory(categoryName, user.id);
                await delay(300);
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
                showInlineMessage(categoryMessage, result.message || 'Category created successfully.', true);
                categoryForm.reset();
                await loadCategories();
                renderCategoriesOverview(allCategories);
                renderResourceExplorer(allResources, document.getElementById('searchInput')?.value || '', document.getElementById('categoryFilter')?.value || '');
            } else {
                showInlineMessage(categoryMessage, result.error || result.message || 'Unable to create category.', false);
            }
        } catch (error) {
            showInlineMessage(categoryMessage, 'Unable to create category right now.', false);
        }
    });
}

function setupUploadForm(user) {
    const uploadForm = document.getElementById('uploadForm');
    const uploadMessage = document.getElementById('uploadMessage');

    if (!uploadForm || !uploadMessage) {
        return;
    }

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = document.getElementById('fileTitle').value.trim();
        const description = document.getElementById('fileDescription').value.trim();
        const categoryId = document.getElementById('fileCategory').value;

        if (!categoryId) {
            showInlineMessage(uploadMessage, 'Please select a category before uploading.', false);
            return;
        }

        try {
            if (DEMO_MODE) {
                const fileInput = document.getElementById('fileUpload');
                const file = fileInput?.files?.[0];

                if (!file) {
                    showInlineMessage(uploadMessage, 'Please select a file to upload.', false);
                    return;
                }

                const fileContent = await readUploadedFile(file);
                const result = mockUploadResource(title, description, Number(categoryId), user.id, file.name, fileContent, file.type);

                if (!result.success) {
                    showInlineMessage(uploadMessage, result.message || 'Upload failed. Please try again.', false);
                    return;
                }

                showInlineMessage(uploadMessage, result.message, true);
                uploadForm.reset();
                // Explicitly clear file input for better browser compatibility
                const currentFileInput = document.getElementById('fileUpload');
                if (currentFileInput) {
                    // Create a new file input to clear any cached files
                    const newFileInput = currentFileInput.cloneNode(true);
                    currentFileInput.parentNode.replaceChild(newFileInput, currentFileInput);
                }
                await delay(500);
                await refreshDashboardView();
                return;
            }

            const formData = new FormData(uploadForm);
            formData.set('category_id', categoryId);
            formData.append('user_id', user.id);

            const response = await fetchFresh('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showInlineMessage(uploadMessage, result.message, true);
                uploadForm.reset();
                // Explicitly clear file input for better browser compatibility
                const fileInput = document.getElementById('fileUpload');
                if (fileInput) {
                    // Create a new file input to clear any cached files
                    const newFileInput = fileInput.cloneNode(true);
                    fileInput.parentNode.replaceChild(newFileInput, fileInput);
                }
                await refreshDashboardView();
            } else {
                showInlineMessage(uploadMessage, result.error || 'Upload failed. Please try again.', false);
            }
        } catch (error) {
            showInlineMessage(uploadMessage, 'Upload failed. Please try again.', false);
        }
    });
}

async function loadDashboardData() {
    await refreshDashboardView();
}

async function loadResources(userId) {
    let myResources;

    if (DEMO_MODE) {
        allResourcesList = getMockResources();
        myResources = allResourcesList.filter(resource => String(resource.user_id) === String(userId));
    } else {
        const [resourcesResponse, myResourcesResponse] = await Promise.all([
            fetchFresh(`/api/resources?user_id=${encodeURIComponent(userId)}`),
            fetchFresh(`/api/my-resources?user_id=${encodeURIComponent(userId)}`)
        ]);

        allResourcesList = await resourcesResponse.json();
        myResources = await myResourcesResponse.json();
    }

    allResources = allResourcesList.filter(resource => resource.status === 'approved');
    renderCategoriesOverview(allCategories);
    renderResourceExplorer(allResources, document.getElementById('searchInput')?.value || '', document.getElementById('categoryFilter')?.value || selectedCategoryName);
    displayMyFiles(myResources);

    return { myResources };
}

async function loadHistory(userId) {
    let history;

    if (DEMO_MODE) {
        history = mockGetHistory(userId);
    } else {
        const historyResponse = await fetchFresh(`/api/history?user_id=${encodeURIComponent(userId)}`);
        history = await historyResponse.json();
    }

    displayHistory(history);
    return history;
}

async function loadDashboard(userId, myResources, history) {
    updateDashboardStats(allResources, myResources, history);
}

async function loadCategories() {
    try {
        if (DEMO_MODE) {
            allCategories = mockGetCategories();
        } else {
            const response = await fetchFresh('/api/categories');
            const categories = await response.json();
            allCategories = response.ok ? categories : [];
        }

        populateCategorySelects(allCategories);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelects(categories) {
    const fileCategory = document.getElementById('fileCategory');
    const categoryFilter = document.getElementById('categoryFilter');
    const filterValue = categoryFilter?.value || selectedCategoryName;

    if (fileCategory) {
        fileCategory.innerHTML = `
            <option value="">Select Category</option>
            ${categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('')}
        `;
    }

    if (categoryFilter) {
        categoryFilter.innerHTML = `
            <option value="">All Categories</option>
            ${categories.map(category => `<option value="${category.name}">${category.name}</option>`).join('')}
        `;
        categoryFilter.value = filterValue;
    }
}

function updateDashboardStats(resources, myResources, history) {
    const totalEl = document.getElementById('totalResources');
    const myFilesEl = document.getElementById('myFilesCount');
    const recentActivityEl = document.getElementById('recentActivity');

    if (totalEl) totalEl.textContent = resources.length || 0;
    if (myFilesEl) myFilesEl.textContent = myResources.length || 0;
    if (recentActivityEl) {
        recentActivityEl.textContent = history.length > 0
            ? `${formatRoleLabel(history[0].action)} activity`
            : 'None';
    }
}

function displayMyFiles(resources) {
    const myFilesList = document.getElementById('myFilesList');
    if (!myFilesList) {
        return;
    }

    if (resources.length > 0) {
        myFilesList.innerHTML = resources.map(resource => {
            const isApproved = resource.status === 'approved';
            return `
            <div class="resource-card">
                <div class="resource-header">
                    <h4>${resource.title}</h4>
                    <span class="status-badge status-${resource.status}">${resource.status}</span>
                </div>
                <p class="resource-description">${resource.description || 'No description'}</p>
                <div class="resource-footer">
                    <span class="category-chip">${getCategoryName(resource)}</span>
                    <div class="file-actions">
                        ${isApproved ? `<button class="download-btn" onclick="downloadResource(${resource.id}, '${escapeForAttribute(resource.title)}')">Download</button>` : ''}
                        <button class="view-btn" onclick="viewResource(${resource.id})">View</button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    } else {
        myFilesList.innerHTML = '<p>No files uploaded yet.</p>';
    }
}

function displayHistory(history) {
    const historyList = document.getElementById('historyList');

    if (history.length > 0) {
        historyList.innerHTML = `
            <table class="history-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Action</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(item => {
                        // Find the resource to get its current status
                        const resource = allResourcesList.find(r => r.id === item.resource_id);
                        const status = resource ? resource.status : 'unknown';
                        const statusColor = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange';
                        
                        return `
                        <tr>
                            <td>${item.file_name || item.resource_title || 'N/A'}</td>
                            <td class="action-${item.action}">${item.action}</td>
                            <td><span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                            <td>${new Date(item.created_at).toLocaleString()}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    } else {
        historyList.innerHTML = '<p>No activity history yet.</p>';
    }
}

function renderCategoriesOverview(categories) {
    const categoriesOverview = document.getElementById('categoriesOverview');
    if (!categoriesOverview) {
        return;
    }

    if (categories.length === 0) {
        categoriesOverview.innerHTML = '<p>No subjects created yet.</p>';
        return;
    }

    categoriesOverview.innerHTML = categories
        .map(category => {
            const resourceCount = allResources.filter(resource => getCategoryName(resource) === category.name).length;
            const canDeleteCategory = currentUserRole === 'admin';
            return `
                <div class="subject-overview-card">
                    <button type="button" class="subject-pill" onclick="openCategoryFromExplorer('${escapeForAttribute(category.name)}')">${category.name}</button>
                    <span class="subject-overview-meta">${resourceCount} notes</span>
                    ${canDeleteCategory ? `<button type="button" class="subject-delete-btn" onclick="deleteCategory(${category.id})">Delete</button>` : ''}
                </div>
            `;
        })
        .join('');
}

function renderResourceExplorer(resources, searchTerm = '', categoryFilter = '') {
    const activeCategory = categoryFilter || selectedCategoryName;
    selectedCategoryName = activeCategory;

    // Only show category browser if no search term
    if (!searchTerm) {
        renderCategoryBrowser(resources, activeCategory);
    } else {
        // Hide category browser during search
        const browser = document.getElementById('categoryBrowser');
        if (browser) {
            browser.innerHTML = '<p>Search results across all categories:</p>';
        }
    }

    displayResources(resources, searchTerm, categoryFilter);
}

function renderCategoryBrowser(resources, activeCategory = '') {
    const browser = document.getElementById('categoryBrowser');
    if (!browser) {
        return;
    }

    const categoryCounts = allCategories.map(category => ({
        name: category.name,
        count: resources.filter(resource => getCategoryName(resource) === category.name).length
    }));

    if (categoryCounts.length === 0) {
        browser.innerHTML = '<p>No subjects available yet.</p>';
        return;
    }

    browser.innerHTML = categoryCounts.map(category => `
        <button
            type="button"
            class="subject-browser-card ${activeCategory === category.name ? 'active' : ''}"
            onclick="openCategoryFromExplorer('${escapeForAttribute(category.name)}')"
        >
            <span class="subject-browser-name">${category.name}</span>
            <span class="subject-browser-meta">${category.count} notes</span>
        </button>
    `).join('');
}

function displayResources(resources, searchTerm = '', categoryFilter = '') {
    const resourcesList = document.getElementById('resourcesList');
    const selectedCategoryPanel = document.getElementById('selectedCategoryPanel');
    const selectedCategoryTitle = document.getElementById('selectedCategoryTitle');
    if (!resourcesList) {
        return;
    }

    let filteredResources = resources;

    if (searchTerm) {
        filteredResources = filteredResources.filter(resource =>
            resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (resource.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (resource.category_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (categoryFilter) {
        filteredResources = filteredResources.filter(resource => getCategoryName(resource) === categoryFilter);
    }

    if (categoryFilter && selectedCategoryPanel && selectedCategoryTitle) {
        selectedCategoryPanel.style.display = 'block';
        selectedCategoryTitle.textContent = categoryFilter;
    } else if (selectedCategoryPanel) {
        selectedCategoryPanel.style.display = 'none';
    }

    if (!categoryFilter && !searchTerm) {
        resourcesList.innerHTML = '<p>Select a subject like DBMS to continue and see all notes for that category, or use the search box above to find specific resources.</p>';
        return;
    }

    // If there's a search term, show results even without category filter
    if (searchTerm && !categoryFilter) {
        // Don't return, continue to show filtered results
    }

    if (!categoryFilter && !searchTerm) {
        resourcesList.innerHTML = '<p>Select a subject like DBMS to continue and see all notes for that category, or use the search box above to find specific resources.</p>';
        return;
    }

    // Show resources for search results or category filter
    if (filteredResources.length > 0) {
        resourcesList.innerHTML = filteredResources.map(resource => `
            <div class="resource-card">
                <div class="resource-header">
                    <h4>${resource.title}</h4>
                    <span class="category-badge">${getCategoryName(resource)}</span>
                </div>
                <p class="resource-description">${resource.description || 'No description'}</p>
                <div class="resource-footer">
                    <span class="uploader">${resource.uploader_name ? `By ${resource.uploader_name}` : 'Approved resource'}</span>
                    <div class="file-actions">
                        <button class="view-btn" onclick="viewResource(${resource.id})">View</button>
                        ${resource.status === 'approved' ? `<button class="download-btn" onclick="downloadResource(${resource.id}, '${escapeForAttribute(resource.title)}')">Download</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } else if (searchTerm) {
        resourcesList.innerHTML = `<p>No resources found matching "${searchTerm}". Try a different search term.</p>`;
    } else {
        resourcesList.innerHTML = '<p>No resources found in this category.</p>';
    }
}

function openCategoryFromExplorer(categoryName) {
    selectedCategoryName = categoryName;
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');

    if (categoryFilter) {
        categoryFilter.value = categoryName;
    }

    switchToSection('resources');
    renderResourceExplorer(allResources, searchInput?.value || '', categoryName);
}

function switchToSection(sectionId) {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.section');

    sidebarLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === sectionId);
    });

    sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
}

async function deleteCategory(categoryId) {
    if (currentUserRole !== 'admin') {
        const categoryMessage = document.getElementById('categoryMessage');
        if (categoryMessage) {
            showInlineMessage(categoryMessage, 'Only admins can delete categories.', false);
        }
        return;
    }

    const category = allCategories.find(item => item.id === Number(categoryId));
    const categoryMessage = document.getElementById('categoryMessage');

    if (!category || !categoryMessage) {
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
            await delay(250);
        } else {
            const response = await fetch(apiUrl(`/api/categories/${categoryId}`), {
                method: 'DELETE'
            });

            result = await response.json();
            result.success = response.ok;
        }

        if (result.success) {
            if (selectedCategoryName === category.name) {
                selectedCategoryName = '';
            }

            showInlineMessage(categoryMessage, result.message || 'Category deleted successfully.', true);
            await loadCategories();
            renderCategoriesOverview(allCategories);
            renderResourceExplorer(allResources, document.getElementById('searchInput')?.value || '', document.getElementById('categoryFilter')?.value || '');
        } else {
            showInlineMessage(categoryMessage, result.error || result.message || 'Unable to delete category.', false);
        }
    } catch (error) {
        showInlineMessage(categoryMessage, 'Unable to delete category right now.', false);
    }
}

function getCategoryName(resource) {
    return resource.category_name || resource.category || 'Uncategorized';
}

function showInlineMessage(element, message, isSuccess) {
    element.textContent = message;
    element.className = `inline-message ${isSuccess ? 'success-message' : 'error-message'}`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeForAttribute(value) {
    return String(value).replace(/'/g, "\\'");
}

function formatRoleLabel(role) {
    if (!role) {
        return 'Student';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
}

function getResourceById(resourceId) {
    const normalizedId = String(resourceId);
    if (DEMO_MODE) {
        return getMockResources().find(resource => String(resource.id) === normalizedId);
    }
    return allResourcesList.find(resource => String(resource.id) === normalizedId);
}

function getFileName(resource, fallbackTitle = 'resource') {
    return resource.file_name || `${fallbackTitle}.txt`;
}

function isOfficeDocument(fileName) {
    return /\.(doc|docx|ppt|pptx)$/i.test(fileName);
}

function isBrowserPreviewable(fileName, fileType = '') {
    return (
        /^image\//i.test(fileType) ||
        /^text\//i.test(fileType) ||
        /^(application\/pdf|application\/json)$/i.test(fileType) ||
        /\.(pdf|txt|md|json|js|css|html|csv|png|jpg|jpeg|gif|webp|svg)$/i.test(fileName)
    );
}

async function downloadResource(resourceId, resourceTitle) {
    const user = JSON.parse(localStorage.getItem('user'));
    const resource = getResourceById(resourceId);
    
    if (!user) {
        alert('Please login to download resources');
        return;
    }

    if (!resource) {
        alert('Resource not found');
        return;
    }

    if (DEMO_MODE) {
        if (resource.file_content) {
            const content = resource.file_content;
            const element = document.createElement('a');
            let href = '';
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
            const mimeType = resource.file_type || 'text/plain';
            href = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
            element.setAttribute('href', href);
            element.setAttribute('download', resource.file_name || `${resourceTitle}.txt`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            return;
        }
    }

    try {
        const response = await fetch(apiUrl(`/api/download/${resourceId}?user_id=${encodeURIComponent(user.id)}`), {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            let errorMessage = 'Download failed. Please try again.';

            try {
                const errorResult = await response.json();
                errorMessage = errorResult.message || errorResult.error || errorMessage;
            } catch (error) {
                // Ignore JSON parse issues and keep generic message.
            }

            alert(errorMessage);
            return;
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const element = document.createElement('a');
        element.href = downloadUrl;
        element.download = getFileName(resource, resourceTitle);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    } catch (error) {
        console.error('Download failed:', error);
        alert('Download failed. Please try again.');
    }
}

function viewResource(resourceId) {
    const resource = getResourceById(resourceId);
    if (!resource) {
        alert('Resource not found');
        return;
    }

    const details = `Title: ${resource.title}\nCategory: ${resource.category_name || resource.category || 'Uncategorized'}\nStatus: ${resource.status}\nDescription: ${resource.description || 'No description'}\nUpload Date: ${resource.created_at || resource.uploaded_at}`;
    const fileName = getFileName(resource, resource.title);
    const isDocFile = /\.(doc|docx)$/i.test(fileName);
    const isPptFile = /\.(ppt|pptx)$/i.test(fileName);

    if (DEMO_MODE && resource.file_content) {
        const content = resource.file_content;
        const isDataUrl = typeof content === 'string' && content.startsWith('data:');

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

    if (isDocFile || isPptFile) {
        alert('This DOC/DOCX/PPT/PPTX file cannot be previewed in the browser. Please download it first to view it.');
        return;
    }

    if (isBrowserPreviewable(fileName, resource.file_type || '')) {
        const user = getCurrentUser();
        if (!user) {
            alert('Please login to view resources');
            return;
        }

        const viewUrl = apiUrl(`/api/view/${resourceId}?user_id=${encodeURIComponent(user.id)}`);
        window.open(viewUrl, '_blank', 'noopener');
        return;
    }

    alert('Preview is not available for this file type. Please download the file to view it.');
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

function readUploadedFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(reader.result);

        const textTypes = /text\/|json|xml|javascript|csv|markdown/;
        if (file.type && textTypes.test(file.type)) {
            reader.readAsText(file);
        } else if (/\.(txt|md|json|js|css|html|csv)$/i.test(file.name)) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    });
}
