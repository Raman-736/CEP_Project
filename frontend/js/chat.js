// frontend/js/chat.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html'; // Redirect if not logged in
    return;
  }

  // Set current user ID immediately
  let currentUserId = null;
  try {
    currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;
  } catch (e) {
    console.error('Invalid token, logging out.');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
    return;
  }

  const chatList = document.getElementById('chat-dropdown-list');
  const logoutBtn = document.getElementById('logout-btn');

  // --- Logout Button ---
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });

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

  // --- Fetch My Chats Function ---
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

  // --- Render My Chats Function ---
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

  // --- Get Conversation ID from URL ---
  const params = new URLSearchParams(window.location.search);
  const conversationId = params.get('id');
  if (!conversationId) {
    alert('No conversation ID found!');
    window.location.href = 'dashboard.html';
    return;
  }

  // --- DOM Elements ---
  const messageContainer = document.getElementById('message-container');
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');

  // --- WebSocket Connection ---
  const socket = new WebSocket('ws://localhost:5000');
  socket.onopen = () => {
    console.log('WebSocket connected');
    socket.send(
      JSON.stringify({
        type: 'join',
        token: token,
        conversationId: conversationId,
      })
    );
  };

  // --- WebSocket onmessage ---
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'newMessage') {
      renderMessage(msg.payload);
      scrollToBottom();
    }
  };

  socket.onclose = () => console.log('WebSocket disconnected');
  socket.onerror = (err) => console.error('WebSocket error:', err);

  // --- Handle Sending a Message ---
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text === '') return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'message',
          text: text,
        })
      );
    } else {
      console.error('Socket is not open. State:', socket.readyState);
      alert('Connection lost. Please reload the page.');
    }

    messageInput.value = ''; // Clear the input
  });

  // --- Helper: Render a message to the UI ---
  const renderMessage = (msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');

    if (msg.sender_id == currentUserId) {
      msgDiv.classList.add('sent');
    } else {
      msgDiv.classList.add('received');
    }
    
    // This string will now be a full UTC string (e.g., ...Z)
    const messageDate = new Date(msg.created_at);

    // This option will now correctly convert from UTC to IST
    const timeOptions = {
      timeZone: 'Asia/Kolkata', // Force Indian Standard Time
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    const indianTime = messageDate.toLocaleTimeString('en-IN', timeOptions);

    msgDiv.innerHTML = `
      <strong>${msg.sender_username || 'User'}</strong>
      <p>${msg.message_text}</p>
      <span class="timestamp">${indianTime}</span>
    `;
    
    messageContainer.appendChild(msgDiv);
  };

  // --- Helper: Scroll to bottom of chat ---
  const scrollToBottom = () => {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  };

  // --- Fetch Message History ---
  const fetchHistory = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/chat/history/${conversationId}`,
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch history');
      }

      const history = await res.json();
      messageContainer.innerHTML = ''; // Clear "Loading..."

      history.forEach((msg) => {
        renderMessage(msg);
      });

      scrollToBottom();
    } catch (err) {
      console.error(err);
      messageContainer.innerHTML =
        '<p class="message error">Error loading chat.</p>';
    }
  };

  // --- Initial Load ---
  fetchHistory();
  fetchMyChats();
});