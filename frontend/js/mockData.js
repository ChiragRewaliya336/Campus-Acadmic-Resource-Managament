const DEFAULT_MOCK_USERS = {
  'STU-2024-001': {
    id: 'STU-2024-001',
    username: 'john_student',
    email: 'john@campus.edu',
    password: 'Student@123',
    role: 'student'
  },
  'ADM-2024-001': {
    id: 'ADM-2024-001',
    username: 'Main Admin',
    email: 'admin@campus.edu',
    password: 'Admin@123',
    role: 'admin'
  }
};

const DEFAULT_MOCK_CATEGORIES = [];

const DEFAULT_MOCK_RESOURCES = [];

const DEFAULT_MOCK_HISTORY = [];

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function initializeMockStorage() {
  if (!localStorage.getItem('mockUsers')) {
    localStorage.setItem('mockUsers', JSON.stringify(cloneData(DEFAULT_MOCK_USERS)));
  }

  if (!localStorage.getItem('mockCategories')) {
    localStorage.setItem('mockCategories', JSON.stringify(cloneData(DEFAULT_MOCK_CATEGORIES)));
  }

  if (!localStorage.getItem('mockResources')) {
    localStorage.setItem('mockResources', JSON.stringify(cloneData(DEFAULT_MOCK_RESOURCES)));
  }

  if (!localStorage.getItem('mockHistory')) {
    localStorage.setItem('mockHistory', JSON.stringify(cloneData(DEFAULT_MOCK_HISTORY)));
  }

  migrateLegacyMockResources();
}

function getMockUsers() {
  initializeMockStorage();
  return JSON.parse(localStorage.getItem('mockUsers')) || {};
}

function saveMockUsers(users) {
  localStorage.setItem('mockUsers', JSON.stringify(users));
}

function getMockCategories() {
  initializeMockStorage();
  return JSON.parse(localStorage.getItem('mockCategories')) || [];
}

function saveMockCategories(categories) {
  localStorage.setItem('mockCategories', JSON.stringify(categories));
}

function getMockResources() {
  initializeMockStorage();
  const resources = JSON.parse(localStorage.getItem('mockResources')) || [];
  const categories = getMockCategories();

  return resources.map(resource => {
    const category = categories.find(item => item.id === Number(resource.category_id));
    const categoryName = resource.category_name || resource.category || category?.name || 'Uncategorized';
    return {
      ...resource,
      category_id: resource.category_id || category?.id || null,
      category_name: categoryName
    };
  });
}

function saveMockResources(resources) {
  localStorage.setItem('mockResources', JSON.stringify(resources));
}

function getMockHistory() {
  initializeMockStorage();
  return JSON.parse(localStorage.getItem('mockHistory')) || [];
}

function saveMockHistory(history) {
  localStorage.setItem('mockHistory', JSON.stringify(history));
}

function getAllMockUsers() {
  return Object.values(getMockUsers());
}

function migrateLegacyMockResources() {
  const categories = JSON.parse(localStorage.getItem('mockCategories')) || cloneData(DEFAULT_MOCK_CATEGORIES);
  const resources = JSON.parse(localStorage.getItem('mockResources')) || [];
  let hasChanges = false;

  const normalizedResources = resources.map(resource => {
    if (resource.category_id && resource.category_name) {
      return resource;
    }

    const categoryName = resource.category || resource.category_name || 'Other';
    let category = categories.find(item => item.name.toLowerCase() === categoryName.toLowerCase());

    if (!category) {
      category = {
        id: categories.length ? Math.max(...categories.map(item => item.id)) + 1 : 1,
        name: categoryName,
        created_by: 'ADM-2024-001',
        created_at: new Date().toISOString()
      };
      categories.push(category);
    }

    hasChanges = true;

    return {
      ...resource,
      category_id: category.id,
      category_name: category.name
    };
  });

  if (hasChanges) {
    localStorage.setItem('mockCategories', JSON.stringify(categories));
    localStorage.setItem('mockResources', JSON.stringify(normalizedResources));
  }
}

function generateUserId(role) {
  const prefix = role === 'admin' ? 'ADM' : 'STU';
  const existingUsers = getAllMockUsers();
  const nextNumber = existingUsers
    .filter(user => user.id.startsWith(prefix))
    .map(user => Number(user.id.split('-')[2]))
    .reduce((max, current) => Math.max(max, current), 0) + 1;

  return `${prefix}-2024-${String(nextNumber).padStart(3, '0')}`;
}

initializeMockStorage();

function mockLogin(email, password) {
  const users = getMockUsers();
  for (let userId in users) {
    const user = users[userId];
    if (user.email === email && user.password === password) {
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };
    }
  }
  return { success: false, message: 'Invalid credentials' };
}

function mockRegister(name, email, password) {
  const users = getMockUsers();
  const emailExists = Object.values(users).some(user => user.email === email);

  if (emailExists) {
    return { success: false, message: 'Email already registered' };
  }

  const newUser = {
    id: generateUserId('student'),
    username: name.trim(),
    email,
    password,
    role: 'student'
  };

  users[newUser.id] = newUser;
  saveMockUsers(users);

  return {
    success: true,
    message: 'Registration successful. Your default role is student.',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  };
}

function mockGetResources(userId = null) {
  const resources = getMockResources();
  if (userId) {
    return resources.filter(r => r.user_id === userId);
  }
  return resources.filter(r => r.status === 'approved');
}

function mockGetCategories() {
  return getMockCategories().sort((a, b) => a.name.localeCompare(b.name));
}

function mockCreateCategory(name, userId) {
  const categories = getMockCategories();
  const normalizedName = name.trim();

  if (!normalizedName) {
    return { success: false, message: 'Category name is required' };
  }

  const exists = categories.some(category => category.name.toLowerCase() === normalizedName.toLowerCase());
  if (exists) {
    return { success: false, message: 'Category already exists' };
  }

  const newCategory = {
    id: categories.length ? Math.max(...categories.map(category => category.id)) + 1 : 1,
    name: normalizedName,
    created_by: userId,
    created_at: new Date().toISOString()
  };

  categories.push(newCategory);
  saveMockCategories(categories);

  return {
    success: true,
    message: 'Category created successfully',
    category: newCategory
  };
}

function mockDeleteCategory(categoryId) {
  const categories = getMockCategories();
  const resources = getMockResources();
  const category = categories.find(item => item.id === Number(categoryId));

  if (!category) {
    return { success: false, message: 'Category not found' };
  }

  const hasResources = resources.some(resource => Number(resource.category_id) === Number(categoryId));
  if (hasResources) {
    return { success: false, message: 'Cannot delete category because it is being used by existing resources' };
  }

  saveMockCategories(categories.filter(item => item.id !== Number(categoryId)));

  return {
    success: true,
    message: `Category "${category.name}" deleted successfully`
  };
}

function mockGetPendingResources() {
  return getMockResources().filter(r => r.status === 'pending');
}

function mockApproveResource(resourceId) {
  const resources = getMockResources();
  const resource = resources.find(r => r.id === resourceId);
  if (resource) {
    resource.status = 'approved';
    saveMockResources(resources);
    return { success: true, message: 'Resource approved' };
  }
  return { success: false, message: 'Resource not found' };
}

function mockRejectResource(resourceId) {
  const resources = getMockResources();
  const resource = resources.find(r => r.id === resourceId);
  if (resource) {
    resource.status = 'rejected';
    saveMockResources(resources);
    return { success: true, message: 'Resource rejected' };
  }
  return { success: false, message: 'Resource not found' };
}

function mockGetHistory(userId) {
  return getMockHistory().filter(h => String(h.user_id) === String(userId));
}

function mockUploadResource(title, description, categoryId, userId, fileName, fileContent, fileType) {
  const resources = getMockResources();
  const history = getMockHistory();
  const categories = getMockCategories();
  const selectedCategory = categories.find(category => category.id === Number(categoryId));

  if (!selectedCategory) {
    return { success: false, message: 'Selected category does not exist' };
  }

  const generatedName = title.toLowerCase().replace(/\s+/g, '-') + (fileName ? `-${Date.now()}` : '') + (fileName ? '' : '.txt');
  const newResource = {
    id: resources.length ? Math.max(...resources.map(r => r.id)) + 1 : 1,
    title: title,
    description: description,
    category_id: selectedCategory.id,
    category_name: selectedCategory.name,
    file_name: fileName || (generatedName || `${title.toLowerCase().replace(/\s+/g, '-')}.txt`),
    file_content: fileContent || `Demo resource content for: ${title}`,
    file_type: fileType || 'text/plain',
    user_id: userId,
    status: 'pending',
    created_at: new Date().toISOString().split('T')[0]
  };
  resources.push(newResource);
  saveMockResources(resources);
  
  history.push({
    id: history.length + 1,
    user_id: userId,
    action: 'upload',
    resource_id: newResource.id,
    file_name: newResource.title,
    created_at: new Date().toISOString()
  });
  saveMockHistory(history);
  
  return { success: true, message: 'Resource uploaded successfully', resource: newResource };
}

function mockUpdateUserRole(userId, newRole, actingUserId) {
  const users = getMockUsers();
  const targetUser = users[userId];

  if (!targetUser) {
    return { success: false, message: 'User not found' };
  }

  if (!['student', 'admin'].includes(newRole)) {
    return { success: false, message: 'Invalid role selected' };
  }

  targetUser.role = newRole;

  if (newRole === 'admin' && !targetUser.id.startsWith('ADM')) {
    const oldUser = { ...targetUser };
    const newId = generateUserId('admin');
    delete users[userId];
    users[newId] = {
      ...oldUser,
      id: newId,
      role: 'admin'
    };

    const resources = getMockResources().map(resource =>
      resource.user_id === userId ? { ...resource, user_id: newId } : resource
    );
    const history = getMockHistory().map(entry =>
      entry.user_id === userId ? { ...entry, user_id: newId } : entry
    );

    saveMockResources(resources);
    saveMockHistory(history);

    if (actingUserId === userId) {
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify({
          ...currentUser,
          id: newId,
          role: 'admin'
        }));
      }
    }

    saveMockUsers(users);
    return { success: true, message: `${oldUser.username} is now an admin.` };
  }

  saveMockUsers(users);

  if (actingUserId === userId) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        role: newRole
      }));
    }
  }

  return {
    success: true,
    message: `${targetUser.username}'s role updated to ${newRole}.`
  };
}
