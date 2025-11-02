// frontend/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userList = document.getElementById('user-list');
  const logoutBtn = document.getElementById('logout-btn');
  const chatDropdownBtn = document.getElementById('chat-dropdown-btn');
  const chatDropdownList = document.getElementById('chat-dropdown-list');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const chatList = document.getElementById('chat-dropdown-list');

  // --- 1. Page Protection ---
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  let currentUserId = null;
  try {
    // Decode the token to get the user's ID
    currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;
  } catch (e) {
    console.error('Invalid token:', e);
    localStorage.removeItem('token');
    window.location.href = 'index.html';
    return;
  }

  // --- 2. Logout ---
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  // --- 3. Fetch Users Function ---
  const fetchUsers = async (searchQuery = '') => {
    try {
      userList.innerHTML = '<p class="loading-text">Loading users...</p>';
      
      // UPDATED URL: from '/api/users/seniors' to '/api/users'
      const res = await fetch(
        `http://localhost:5000/api/users?search=${searchQuery}`, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch users');

      const users = await res.json();
      renderUsers(users); // Call the renamed render function
    } catch (err) {
      console.error(err);
      userList.innerHTML =
        '<p class="message error">Error loading users. Please try again.</p>';
    }
  };

 // --- 4. Render Users Function ---
  const renderUsers = (users) => {
    userList.innerHTML = '';

    let currentUserId = null;
    try {
      currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;
    } catch (e) { /* ignore */ }

    const otherUsers = users.filter(
      (user) => user.user_id !== currentUserId
    );

    // Update user count
    const userCountSpan = document.querySelector('.user-count');
    if (userCountSpan) {
      userCountSpan.textContent = `${otherUsers.length} user${otherUsers.length !== 1 ? 's' : ''} found`;
    }

    if (otherUsers.length === 0) {
      userList.innerHTML =
        '<p class="loading-text">No other users found matching your search.</p>';
      return;
    }

    otherUsers.forEach((user) => {
      const card = document.createElement('div');
      card.className = 'user-card';
      const clubDisplay = (user.club_name && user.club_name.toLowerCase() !== 'none') ? user.club_name : 'Not in a club';
      const skills = user.skills ? user.skills.split(',').map(s => s.trim()) : [];
      
      // Get first letter of username for avatar
      const avatarInitial = user.username.charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="user-card-header">
          <div class="user-avatar">${avatarInitial}</div>
        <h3>${user.username}</h3>
          <div class="offline-status" title="Status unknown"></div>
        </div>
        <div class="user-card-body">
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M5 6h14M5 10h14M5 14h14M5 18h14"/>
            </svg>
            <span class="user-info-label">Branch:</span>
            <span class="user-info-value">${user.branch || 'N/A'}</span>
          </div>
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="user-info-label">Year:</span>
            <span class="user-info-value">${user.year ? user.year + getOrdinalSuffix(user.year) : 'N/A'}</span>
          </div>
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span class="user-info-label">Club:</span>
            <span class="user-info-value">${clubDisplay}</span>
          </div>
          ${skills.length > 0 ? `
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span class="user-info-label">Skills:</span>
            <div class="user-skills">
              ${skills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              ${skills.length > 3 ? `<span class="skill-tag">+${skills.length - 3} more</span>` : ''}
            </div>
          </div>
          ` : ''}
        </div>
        <div class="user-card-footer">
          <button class="chat-btn" data-user-id="${user.user_id}">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            Start Chat
          </button>
        </div>
      `;
      userList.appendChild(card);
    });
  };

  // Helper function for ordinal suffix
  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  // --- 4b. Fetch My Chats Function (MOVED TO CORRECT LOCATION) ---
  const fetchMyChats = async () => {
    try {
      const res = await fetch(
        'http://localhost:5000/api/chat/my-conversations',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
      }

      const chats = await res.json();
      renderMyChats(chats);
    } catch (err) {
      console.error(err);
      chatList.innerHTML =
        '<p class="message error">Error loading chats.</p>';
    }
  };

  // --- 4c. Render My Chats Function (MOVED TO CORRECT LOCATION) ---
  const renderMyChats = (chats) => {
    chatList.innerHTML = '';
    if (chats.length === 0) {
      chatList.innerHTML =
        '<p class="loading-text">You have no active chats.</p>';
      return;
    }

    chats.forEach((chat) => {
      const chatLink = document.createElement('a');
      chatLink.className = 'chat-link';
      chatLink.href = `chat.html?id=${chat.conversation_id}`;
      chatLink.textContent = `Chat with ${chat.partner_username}`;
      chatList.appendChild(chatLink);
    });
  };

  // --- 5. Event Listeners ---
  // Search
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    fetchUsers(query); // <-- RENAMED
  });

  // Chat Button Click
  userList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('chat-btn')) {
      const seniorId = e.target.getAttribute('data-user-id');
      e.target.textContent = 'Starting...';
      e.target.disabled = true;

      try {
        const res = await fetch('http://localhost:5000/api/chat/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
          body: JSON.stringify({ receiverId: seniorId }),
        });

        if (!res.ok) throw new Error('Failed to start chat');

        const conversation = await res.json();
        window.location.href = `chat.html?id=${conversation.conversation_id}`;
      } catch (err) {
        console.error(err);
        e.target.textContent = 'Error. Try again.';
        e.target.disabled = false;
      }
    }
  }); // <-- THIS IS THE CORRECT END for userList.addEventListener

  chatDropdownBtn.addEventListener('click', () => {
  chatDropdownList.classList.toggle('show');
});

// Close the dropdown if clicking outside
window.addEventListener('click', (e) => {
  if (!e.target.matches('#chat-dropdown-btn')) {
    if (chatDropdownList.classList.contains('show')) {
      chatDropdownList.classList.remove('show');
    }
  }
});

  // --- Initial load ---
  fetchUsers(); // <-- RENAMED
  fetchMyChats();
});