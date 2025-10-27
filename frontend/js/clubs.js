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
  
  // --- 4. Render Club Members ---
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
      const roleDisplay = member.user_role.charAt(0).toUpperCase() + member.user_role.slice(1);

      card.innerHTML = `
        <h3>${member.username} (${roleDisplay})</h3>
        <p><span class="user-meta">Branch:</span> ${member.branch || 'N/A'}</p>
        <p><span class="user-meta">Year:</span> ${member.year || 'N/A'}</p>
        <p class="user-skills"><span class="user-meta">Skills:</span> ${member.skills || 'N/A'}</p>
        <p><span class="user-meta">Email:</span> ${member.email}</p>
        <button class="chat-btn" data-user-id="${member.user_id}">Request to Chat</button>
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

  // --- Initial Load ---
  fetchClubs();
});