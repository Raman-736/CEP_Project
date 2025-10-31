document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // --- Page Elements ---
  const form = document.getElementById('profile-form');
  const editBtn = document.getElementById('edit-profile-btn');
  const saveBtn = document.getElementById('save-profile-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const messageEl = document.getElementById('form-message');

  // Form Fields
  const usernameEl = document.getElementById('username');
  const emailEl = document.getElementById('email');
  const yearEl = document.getElementById('year');
  const branchEl = document.getElementById('branch');
  const clubEl = document.getElementById('club');
  const skillsEl = document.getElementById('skills');

  // We need all editable fields in an array
  const editableFields = [yearEl, branchEl, clubEl, skillsEl];
  let originalData = {}; // To store data for cancel

  // --- Helper: Toggle Edit Mode ---
  const toggleEditMode = (isEditing) => {
    editableFields.forEach(field => field.disabled = !isEditing);
    editBtn.classList.toggle('hidden', isEditing);
    saveBtn.classList.toggle('hidden', !isEditing);
    cancelBtn.classList.toggle('hidden', !isEditing);
    messageEl.textContent = ''; // Clear any messages
  };

  // --- Helper: Populate Form ---
  const populateForm = (data) => {
    originalData = data; // Save for 'cancel'
    usernameEl.value = data.username;
    emailEl.value = data.email;
    yearEl.value = data.year;
    branchEl.value = data.branch;
    clubEl.value = data.club_id;
    skillsEl.value = data.skills || ''; // Handle null skills
  };

  // --- 1. Fetch Profile Data on Load ---
  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      populateForm(data);
    } catch (err) {
      messageEl.textContent = 'Error: ' + err.message;
      messageEl.className = 'message error';
    }
  };

  // --- 2. Event Listeners ---
  editBtn.addEventListener('click', () => {
    toggleEditMode(true);
  });

  cancelBtn.addEventListener('click', () => {
    populateForm(originalData); // Reset to original data
    toggleEditMode(false);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Process skills
    const skills = skillsEl.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const body = {
      year: parseInt(yearEl.value),
      branch: branchEl.value,
      club_id: parseInt(clubEl.value),
      skills: skills,
    };

    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to save');

      messageEl.textContent = 'Profile saved successfully!';
      messageEl.className = 'message success';
      originalData = body; // Update original data to new saved data
      toggleEditMode(false);

    } catch (err) {
      messageEl.textContent = 'Error: ' + err.message;
      messageEl.className = 'message error';
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  // --- 3. Initial Load ---
  fetchProfile();

  // --- 4. Load Chat Dropdown (copy from other pages) ---
  const logoutBtn = document.getElementById('logout-btn');
  const chatList = document.getElementById('chat-dropdown-list');
  const chatDropdownBtn = document.getElementById('chat-dropdown-btn');
  const chatDropdownList = document.getElementById('chat-dropdown-list');

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  chatDropdownBtn.addEventListener('click', () => {
    chatDropdownList.classList.toggle('show');
  });

  window.addEventListener('click', (e) => {
    if (!e.target.matches('#chat-dropdown-btn')) {
      if (chatDropdownList.classList.contains('show')) {
        chatDropdownList.classList.remove('show');
      }
    }
  });

  const fetchMyChats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chat/my-conversations', {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) throw new Error('Failed to load chats');
      const chats = await res.json();
      renderMyChats(chats);
    } catch (err) {
      chatList.innerHTML = '<p class="loading-text error">Error chats.</p>';
    }
  };

  const renderMyChats = (chats) => {
    chatList.innerHTML = '';
    if (chats.length === 0) {
      chatList.innerHTML = '<p class="loading-text">No active chats.</p>';
      return;
    }
    chats.forEach(chat => {
      const a = document.createElement('a');
      a.href = `chat.html?id=${chat.conversation_id}`;
      a.textContent = `Chat with ${chat.partner_username}`;
      chatList.appendChild(a);
    });
  };

  fetchMyChats();
});