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

    if (otherUsers.length === 0) {
      // UPDATED text
      userList.innerHTML =
        '<p class="loading-text">No other users found matching your search.</p>';
      return;
    }

    otherUsers.forEach((user) => {
      const card = document.createElement('div');
      card.className = 'user-card';
      const clubDisplay = (user.club_name && user.club_name.toLowerCase() !== 'none') ? user.club_name : 'N/A';

      card.innerHTML = `
        <h3>${user.username}</h3>
        <p><span class="user-meta">Branch:</span> ${user.branch || 'N/A'}</p>
        <p class.user-club><span class="user-meta">Club:</span> ${clubDisplay}</p>
        <p><span class="user-meta">Year:</span> ${user.year || 'N/A'}</p>
        <p class="user-skills"><span class="user-meta">Skills:</span> ${user.skills || 'N/A'}</p>
        <p><span class="user-meta">Email:</span> ${user.email}</p>
        <button class="chat-btn" data-user-id="${
          user.user_id
        }">Request to Chat</button>
      `;
      userList.appendChild(card);
    });
  };

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