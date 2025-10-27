// frontend/js/chat.js
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html'; // Redirect if not logged in
    return;
  }

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

  let currentUserId = null; // We'll get this from the token

  // --- WebSocket Connection ---
  const socket = new WebSocket('ws://localhost:5000'); // Connect to our backend

  socket.onopen = () => {
    console.log('WebSocket connected');
    // Send a "join" message to the server to authenticate
    socket.send(
      JSON.stringify({
        type: 'join',
        token: token,
        conversationId: conversationId,
      })
    );
  };

  socket.onmessage = (event) => {
    // A new message is received from the server
    const msg = JSON.parse(event.data);

    if (msg.type === 'newMessage') {
      renderMessage(msg);
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

    // Send the message over WebSocket
    socket.send(
      JSON.stringify({
        type: 'message',
        text: text,
      })
    );

    messageInput.value = ''; // Clear the input
  });

  // --- Helper: Render a message to the UI ---
  const renderMessage = (msg) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');

    // Check if the message was sent by the current user
    if (msg.senderId === currentUserId) {
      msgDiv.classList.add('sent');
    } else {
      msgDiv.classList.add('received');
    }

    msgDiv.innerHTML = `
      <strong>${msg.senderUsername || 'User'}</strong>
      <p>${msg.text}</p>
      <span class="timestamp">${new Date(
        msg.createdAt
      ).toLocaleTimeString()}</span>
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
      // Decode token to get our own user ID
      // This is a simple (but not 100% secure) way to get user ID on client
      currentUserId = JSON.parse(atob(token.split('.')[1])).user.id;

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
        // Rename keys to match our 'renderMessage' function
        renderMessage({
          ...msg,
          text: msg.message_text,
          senderUsername: msg.sender_username,
          createdAt: msg.created_at,
        });
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
});