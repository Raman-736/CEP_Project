// frontend/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userList = document.getElementById('user-list');
  const logoutBtn = document.getElementById('logout-btn');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const chatList = document.getElementById('chat-list');

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

  // --- 3. Fetch Seniors Function ---
  const fetchSeniors = async (searchQuery = '') => {
    try {
      userList.innerHTML = '<p class="loading-text">Loading seniors...</p>';
      const res = await fetch(
        `http://localhost:5000/api/users/seniors?search=${searchQuery}`,
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
      if (!res.ok) throw new Error('Failed to fetch seniors');

      const seniors = await res.json();
      renderSeniors(seniors);
    } catch (err) {
      console.error(err);
      userList.innerHTML =
        '<p class="message error">Error loading users. Please try again.</p>';
    }
  };

 // --- 4. Render Seniors Function (UPDATED) ---
const renderSeniors = (seniors) => {
  userList.innerHTML = ''; // Clear loading text or previous results

  let currentUserId = null;
  try {
    const token = localStorage.getItem('token');
    currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;
  } catch (e) { /* ignore error, currentUserId remains null */ }

  const otherSeniors = seniors.filter(
    (senior) => senior.user_id !== currentUserId
  );

  if (otherSeniors.length === 0) {
    userList.innerHTML =
      '<p class="loading-text">No other seniors found matching your search.</p>';
    return;
  }

  otherSeniors.forEach((senior) => {
    const card = document.createElement('div');
    card.className = 'user-card';

    // Check if club is 'None' or null, display 'N/A'
    const clubDisplay = (senior.club_name && senior.club_name.toLowerCase() !== 'none') ? senior.club_name : 'N/A';

    card.innerHTML = `
      <h3>${senior.username}</h3>
      <p><span class="user-meta">Branch:</span> ${senior.branch || 'N/A'}</p>
      
      <p class.user-club><span class="user-meta">Club:</span> ${clubDisplay}</p>
      
      <p><span class="user-meta">Year:</span> ${senior.year || 'N/A'}</p>
      <p class="user-skills"><span class="user-meta">Skills:</span> ${senior.skills || 'N/A'}</p>
      <p><span class="user-meta">Email:</span> ${senior.email}</p>
      <button class="chat-btn" data-user-id="${
        senior.user_id
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
    fetchSeniors(query);
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

  // --- Initial load ---
  fetchSeniors();
  fetchMyChats(); // <-- This will now work!
});