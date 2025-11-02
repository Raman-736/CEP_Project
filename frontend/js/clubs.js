// frontend/js/clubs.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  
  // Get current user ID to filter self from chat
  let currentUserId = null;
  try {
    currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;
  } catch (e) { console.error('Invalid token'); }

  // --- Page Elements ---
  const clubListButtons = document.getElementById('club-list-buttons');
  const memberContainer = document.getElementById('member-container');
  const memberListTitle = document.getElementById('member-list-title');
  const memberList = document.getElementById('member-list');
  const logoutBtn = document.getElementById('logout-btn');
  const chatList = document.getElementById('chat-dropdown-list');
  // --- Dropdown Toggle ---
const chatDropdownBtn = document.getElementById('chat-dropdown-btn');
const chatDropdownList = document.getElementById('chat-dropdown-list');

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

  // --- Logout ---
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

  // --- 1. Fetch All Clubs ---
  const fetchClubs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/clubs', {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) throw new Error('Failed to fetch clubs');
      const clubs = await res.json();
      renderClubButtons(clubs);
    } catch (err) {
      console.error(err);
      clubListButtons.innerHTML = '<p class="message error">Error loading clubs.</p>';
    }
  };

  // --- 2. Render Club Buttons ---
  const renderClubButtons = (clubs) => {
    clubListButtons.innerHTML = ''; // Clear loading
    clubs.forEach(club => {
      const button = document.createElement('button');
      button.className = 'club-button';
      button.textContent = club.club_name;
      button.setAttribute('data-club-id', club.club_id);
      button.setAttribute('data-club-name', club.club_name);
      
      button.addEventListener('click', () => {
        // Handle active state
        document.querySelectorAll('.club-button.active').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Fetch and display members
        fetchClubMembers(club.club_id, club.club_name);
      });
      clubListButtons.appendChild(button);
    });
  };
  
  // --- 3. Fetch Club Members ---
  const fetchClubMembers = async (clubId, clubName) => {
    memberContainer.style.display = 'block'; // Show the container
    memberListTitle.textContent = `Members of ${clubName}`;
    memberList.innerHTML = '<p class="loading-text">Loading members...</p>';
    
    try {
      const res = await fetch(`http://localhost:5000/api/clubs/${clubId}/members`, {
        headers: { 'x-auth-token': token },
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      const members = await res.json();
      renderClubMembers(members);
    } catch (err) {
      console.error(err);
      memberList.innerHTML = '<p class="message error">Error loading members.</p>';
    }
  };
  
  const renderClubMembers = (members) => {
    memberList.innerHTML = '';
    
    // Filter out the current user
    const otherMembers = members.filter(member => member.user_id !== currentUserId);

    if (otherMembers.length === 0) {
      memberList.innerHTML = '<p class="loading-text">No other members found in this club.</p>';
      return;
    }
    
    // Re-use the user-card style from dashboard
    otherMembers.forEach(member => {
      const card = document.createElement('div');
      card.className = 'user-card';

      // --- THESE LINES ARE REMOVED ---
      // const roleDisplay = member.user_role.charAt(0).toUpperCase() + member.user_role.slice(1);
      // <h3>${member.username} (${roleDisplay})</h3>

      // Use same card structure as dashboard
      const skills = member.skills ? member.skills.split(',').map(s => s.trim()) : [];
      const avatarInitial = member.username.charAt(0).toUpperCase();
      
      card.innerHTML = `
        <div class="user-card-header">
          <div class="user-avatar">${avatarInitial}</div>
          <h3>${member.username}</h3>
          <div class="offline-status" title="Status unknown"></div>
        </div>
        <div class="user-card-body">
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M5 6h14M5 10h14M5 14h14M5 18h14"/>
            </svg>
            <span class="user-info-label">Branch:</span>
            <span class="user-info-value">${member.branch || 'N/A'}</span>
          </div>
          <div class="user-info-row">
            <svg class="user-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="user-info-label">Year:</span>
            <span class="user-info-value">${member.year ? member.year + getOrdinalSuffix(member.year) : 'N/A'}</span>
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
          <button class="chat-btn" data-user-id="${member.user_id}">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            Start Chat
          </button>
        </div>
      `;
      memberList.appendChild(card);
    });
  };
  
  // --- 5. Add Chat Button Listener ---
  memberList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('chat-btn')) {
      const userId = e.target.getAttribute('data-user-id');
      e.target.textContent = 'Starting...';
      e.target.disabled = true;

      try {
        const res = await fetch('http://localhost:5000/api/chat/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
          body: JSON.stringify({ receiverId: userId }),
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
  });

  // Helper function for ordinal suffix
  function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  // --- Initial Load ---
  fetchClubs();
  fetchMyChats();
});