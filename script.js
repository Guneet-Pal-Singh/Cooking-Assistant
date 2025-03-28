document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    function addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        // Parse markdown for assistant messages only
        if (isUser) {
            messageDiv.textContent = content;
        } else {
            // Sanitize and render markdown
            const sanitizedContent = content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            messageDiv.innerHTML = marked.parse(sanitizedContent, {
                breaks: true,
                gfm: true
            });
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Modified function to create a dummy response box that holds the loading animation
    function showLoadingAnimation() {
        const dummyBox = document.createElement('div');
        dummyBox.id = 'dummy-response';
        dummyBox.className = 'message assistant-message';
        
        const loader = document.createElement('div');
        loader.className = 'loading-animation';
        // Ensure a row layout with gap between emojis
        loader.style.display = 'flex';
        loader.style.gap = '0.5rem';
        loader.style.transition = 'opacity 0.5s ease';
        
        // List of all emojis
        const emojis = ["🍞", "🥖", "🥨", "🥯", "🥐", "🧀", "🥚", "🥓", "🥩", "🍗", "🍖", "🥟", "🍤", "🦀", "🦞", "🦐", "🦑", "🥬", "🥕", "🌽", "🥒", "🥦", "🧄", "🧅", "🥔", "🫑", "🍄", "🫘", "🍚", "🍙", "🍘", "🍥", "🫕", "🍳", "🥘", "🍲", "🫕", "🍛", "🥗", "🥣", "🍜", "🍝", "🥪", "🌮", "🌯", "🍕", "🍔", "🌭", "🍰", "🎂", "🧁", "🥧", "🍩", "🍪", "🍮", "🍫", "🍯", "🥞", "🧇", "🥛", "☕", "🍵", "🥤", "🧃", "🍶", "🍷", "🍹", "🍺", "🥂", "🔪", "🍽️", "🥄", "🍴", "🏺", "🎛️", "🥢"];
        
        function updateEmojis() {
            // Fade out current emojis
            loader.style.opacity = '0';
            setTimeout(() => {
                // Pick three distinct random emojis
                let chosen = [];
                while(chosen.length < 3) {
                    const rand = emojis[Math.floor(Math.random() * emojis.length)];
                    if (!chosen.includes(rand)) {
                        chosen.push(rand);
                    }
                }
                loader.innerHTML = chosen.map(e => `<span class="emoji-item">${e}</span>`).join('');
                // Fade in new emojis
                loader.style.opacity = '1';
            }, 300);
        }
        updateEmojis();
        const intervalId = setInterval(updateEmojis, 1000);
        loader.dataset.intervalId = intervalId;
        
        dummyBox.appendChild(loader);
        chatMessages.appendChild(dummyBox);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Modified function to remove the dummy response box and clear the emoji interval
    function hideLoadingAnimation() {
        const dummyBox = document.getElementById('dummy-response');
        if (dummyBox) {
            const loader = dummyBox.querySelector('.loading-animation');
            if (loader && loader.dataset.intervalId) {
                clearInterval(Number(loader.dataset.intervalId));
            }
            dummyBox.remove();
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, true);
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;

        // Show dummy response box with loading animation
        showLoadingAnimation();

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();
            hideLoadingAnimation();
            addMessage(data.response, false);
        } catch (error) {
            hideLoadingAnimation();
            addMessage('Sorry, there was an error processing your request.', false);
        }

        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
