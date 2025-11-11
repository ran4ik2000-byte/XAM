// Данные приложения
let currentUser = null;
let users = JSON.parse(localStorage.getItem('ham_users')) || [];
let chats = JSON.parse(localStorage.getItem('ham_chats')) || [];
let messages = JSON.parse(localStorage.getItem('ham_messages')) || [];
let currentChatId = null;
let darkTheme = localStorage.getItem('ham_dark_theme') === 'true';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Применяем сохраненную тему
    if (darkTheme) {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-toggle').checked = true;
        document.getElementById('theme-label').textContent = 'Темная тема';
    }

    // Проверяем, авторизован ли пользователь
    const savedUser = localStorage.getItem('ham_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }

    // Обработчики для форм авторизации
    document.getElementById('show-register').addEventListener('click', showRegisterForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);

    // Валидация в реальном времени
    document.getElementById('register-phone').addEventListener('input', validatePhone);
    document.getElementById('register-password').addEventListener('input', validatePassword);
    document.getElementById('login-phone').addEventListener('input', validatePhone);
    document.getElementById('login-password').addEventListener('input', validatePassword);

    // Обработчики для основного интерфейса
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('send-message-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    // Обработчики для вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + '-tab').classList.add('active');
            
            if (this.dataset.tab === 'new-chat') {
                loadContacts();
            }
        });
    });

    // Обработчики для поиска
    document.getElementById('search-contacts').addEventListener('input', searchContacts);

    // Обработчики для создания группы
    document.getElementById('close-group-modal').addEventListener('click', hideCreateGroupModal);
    document.getElementById('create-group-btn').addEventListener('click', createGroup);

    // Обработчики для настроек
    document.getElementById('close-settings-modal').addEventListener('click', hideSettingsModal);
    document.getElementById('update-profile-btn').addEventListener('click', updateProfile);
    document.getElementById('update-password-btn').addEventListener('click', updatePassword);
    document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
    document.getElementById('show-users-btn').addEventListener('click', toggleUsersTable);
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Инициализация данных, если они пустые
    if (users.length === 0) {
        initializeSampleData();
    }
});

// Функции валидации
function validatePhone(e) {
    const phone = e.target.value;
    const errorElement = document.getElementById(e.target.id + '-error');
    
    // Проверка формата номера (должен начинаться с 7 или 8 и содержать 11 цифр)
    const phoneRegex = /^[78]\d{10}$/;
    
    if (!phoneRegex.test(phone)) {
        showError(errorElement, 'Номер должен начинаться с 7 или 8 и содержать 11 цифр');
        return false;
    } else {
        hideError(errorElement);
        return true;
    }
}

function validatePassword(e) {
    const password = e.target.value;
    const errorElement = document.getElementById(e.target.id + '-error');
    
    if (password.length < 5) {
        showError(errorElement, 'Пароль должен содержать не менее 5 символов');
        return false;
    } else {
        hideError(errorElement);
        return true;
    }
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError(errorElement) {
    errorElement.style.display = 'none';
}

function showAlert(alertElement, message) {
    alertElement.textContent = message;
    alertElement.style.display = 'block';
}

function hideAlert(alertElement) {
    alertElement.style.display = 'none';
}

// Функции авторизации
function showRegisterForm(e) {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    hideAlert(document.getElementById('auth-error'));
    hideAlert(document.getElementById('auth-warning'));
}

function showLoginForm(e) {
    e.preventDefault();
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    hideAlert(document.getElementById('auth-error'));
    hideAlert(document.getElementById('auth-warning'));
}

function login() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    // Валидация
    if (!validatePhone({target: document.getElementById('login-phone')}) || 
        !validatePassword({target: document.getElementById('login-password')})) {
        return;
    }
    
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('ham_current_user', JSON.stringify(user));
        showMainApp();
    } else {
        showAlert(document.getElementById('auth-error'), 'Неверный номер телефона или пароль');
    }
}

function register() {
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    
    // Валидация
    if (!name) {
        showAlert(document.getElementById('auth-error'), 'Введите имя');
        return;
    }
    
    if (!validatePhone({target: document.getElementById('register-phone')}) || 
        !validatePassword({target: document.getElementById('register-password')})) {
        return;
    }
    
    // Проверяем, не занят ли номер телефона
    if (users.find(u => u.phone === phone)) {
        showAlert(document.getElementById('auth-error'), 'Пользователь с таким номером телефона уже зарегистрирован');
        return;
    }
    
    // Проверяем ограничение по IP (3 аккаунта на IP)
    const userIPs = JSON.parse(localStorage.getItem('ham_user_ips')) || {};
    const currentIP = getCurrentIP();
    
    if (!userIPs[currentIP]) {
        userIPs[currentIP] = [];
    }
    
    if (userIPs[currentIP].length >= 3) {
        showAlert(document.getElementById('auth-warning'), 
            'С одного IP-адреса можно зарегистрировать только 3 аккаунта. ' +
            'Пожалуйста, войдите в один из ваших существующих аккаунтов.');
        return;
    }
    
    const newUser = {
        id: generateId(),
        name: name,
        phone: phone,
        password: password
    };
    
    users.push(newUser);
    userIPs[currentIP].push(newUser.id);
    
    localStorage.setItem('ham_users', JSON.stringify(users));
    localStorage.setItem('ham_user_ips', JSON.stringify(userIPs));
    
    currentUser = newUser;
    localStorage.setItem('ham_current_user', JSON.stringify(newUser));
    
    showMainApp();
}

function getCurrentIP() {
    // В реальном приложении здесь будет получение реального IP
    // Для демонстрации используем случайный IP
    return '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('ham_current_user');
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    hideSettingsModal();
}

// Основные функции приложения
function showMainApp() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    // Обновляем информацию о пользователе
    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('settings-name').value = currentUser.name;
    
    // Загружаем чаты
    loadChats();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function loadChats() {
    const chatsList = document.getElementById('chats-list');
    chatsList.innerHTML = '';
    
    const userChats = chats.filter(chat => 
        chat.participants.includes(currentUser.id)
    );
    
    if (userChats.length === 0) {
        chatsList.innerHTML = '<div class="no-chats-message">У вас пока нет чатов</div>';
        return;
    }
    
    userChats.forEach(chat => {
        const lastMessage = messages
            .filter(m => m.chatId === chat.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.id;
        
        const otherParticipants = chat.participants
            .filter(id => id !== currentUser.id)
            .map(id => users.find(u => u.id === id));
        
        let chatName = chat.name;
        if (!chatName && otherParticipants.length > 0) {
            if (otherParticipants.length === 1) {
                chatName = otherParticipants[0].name;
            } else {
                chatName = otherParticipants.map(u => u.name).join(', ');
            }
        }
        
        chatItem.innerHTML = `
            <div class="chat-avatar">${chatName.charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-name">${chatName}</div>
                <div class="chat-last-message">${lastMessage ? lastMessage.text : 'Нет сообщений'}</div>
            </div>
            ${lastMessage ? `<div class="chat-time">${formatTime(lastMessage.timestamp)}</div>` : ''}
        `;
        
        chatItem.addEventListener('click', () => openChat(chat.id));
        chatsList.appendChild(chatItem);
    });
}

function loadContacts() {
    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';
    
    // Показываем только пользователей, с которыми еще нет чатов
    const userChats = chats.filter(chat => 
        chat.participants.includes(currentUser.id) && chat.isPrivate
    );
    
    const usersInChats = new Set();
    userChats.forEach(chat => {
        chat.participants.forEach(id => {
            if (id !== currentUser.id) {
                usersInChats.add(id);
            }
        });
    });
    
    const availableUsers = users.filter(u => 
        u.id !== currentUser.id && !usersInChats.has(u.id)
    );
    
    if (availableUsers.length === 0) {
        contactsList.innerHTML = '<div class="no-chats-message">Нет доступных пользователей для чата</div>';
        return;
    }
    
    availableUsers.forEach(user => {
        const contactItem = document.createElement('div');
        contactItem.className = 'chat-item';
        contactItem.dataset.userId = user.id;
        
        contactItem.innerHTML = `
            <div class="chat-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-name">${user.name}</div>
                <div class="chat-last-message">${user.phone}</div>
            </div>
        `;
        
        contactItem.addEventListener('click', () => startPrivateChat(user.id));
        contactsList.appendChild(contactItem);
    });
}

function searchContacts() {
    const query = document.getElementById('search-contacts').value.toLowerCase();
    const activeTab = document.querySelector('.tab.active').dataset.tab;
    
    if (activeTab === 'chats') {
        const chatItems = document.querySelectorAll('#chats-list .chat-item');
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
            if (chatName.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    } else {
        const contactItems = document.querySelectorAll('#contacts-list .chat-item');
        contactItems.forEach(item => {
            const contactName = item.querySelector('.chat-name').textContent.toLowerCase();
            const contactPhone = item.querySelector('.chat-last-message').textContent.toLowerCase();
            if (contactName.includes(query) || contactPhone.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

function openChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) return;
    
    // Обновляем заголовок чата
    const otherParticipants = chat.participants
        .filter(id => id !== currentUser.id)
        .map(id => users.find(u => u.id === id));
    
    let chatName = chat.name;
    if (!chatName && otherParticipants.length > 0) {
        if (otherParticipants.length === 1) {
            chatName = otherParticipants[0].name;
        } else {
            chatName = otherParticipants.map(u => u.name).join(', ');
        }
    }
    
    document.getElementById('current-chat-name').textContent = chatName;
    
    // Показываем поле ввода сообщения
    document.getElementById('message-input-container').classList.remove('hidden');
    
    // Загружаем сообщения
    loadMessages(chatId);
    
    // Помечаем активный чат
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
        }
    });
}

function startPrivateChat(userId) {
    // Проверяем, существует ли уже приватный чат с этим пользователем
    const existingChat = chats.find(chat => 
        chat.isPrivate && 
        chat.participants.includes(currentUser.id) && 
        chat.participants.includes(userId)
    );
    
    if (existingChat) {
        openChat(existingChat.id);
        // Переключаемся на вкладку чатов
        document.querySelector('.tab[data-tab="chats"]').click();
        return;
    }
    
    // Создаем новый приватный чат
    const newChat = {
        id: generateId(),
        name: '',
        isPrivate: true,
        participants: [currentUser.id, userId],
        createdAt: new Date().toISOString()
    };
    
    chats.push(newChat);
    localStorage.setItem('ham_chats', JSON.stringify(chats));
    
    // Переключаемся на вкладку чатов
    document.querySelector('.tab[data-tab="chats"]').click();
    openChat(newChat.id);
    loadChats();
}

function loadMessages(chatId) {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    
    const chatMessages = messages
        .filter(m => m.chatId === chatId)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (chatMessages.length === 0) {
        messagesContainer.innerHTML = '<div class="welcome-message"><p>Нет сообщений. Начните общение!</p></div>';
        return;
    }
    
    chatMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'}`;
        
        const sender = users.find(u => u.id === message.senderId);
        const senderName = sender ? sender.name : 'Неизвестный';
        
        messageElement.innerHTML = `
            ${message.senderId !== currentUser.id ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-text">${message.text}</div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
    });
    
    // Прокручиваем к последнему сообщению
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    
    if (!text || !currentChatId) return;
    
    const newMessage = {
        id: generateId(),
        chatId: currentChatId,
        senderId: currentUser.id,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    localStorage.setItem('ham_messages', JSON.stringify(messages));
    
    messageInput.value = '';
    loadMessages(currentChatId);
    loadChats(); // Обновляем список чатов, чтобы показать последнее сообщение
}

// Функции для работы с группами
function showCreateGroupModal() {
    const modal = document.getElementById('create-group-modal');
    const contactsList = document.getElementById('group-contacts-list');
    
    contactsList.innerHTML = '';
    
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    
    otherUsers.forEach(user => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        
        contactItem.innerHTML = `
            <input type="checkbox" class="contact-checkbox" value="${user.id}">
            <div class="chat-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-name">${user.name}</div>
                <div class="chat-last-message">${user.phone}</div>
            </div>
        `;
        
        contactsList.appendChild(contactItem);
    });
    
    modal.style.display = 'flex';
}

function hideCreateGroupModal() {
    document.getElementById('create-group-modal').style.display = 'none';
    document.getElementById('group-name').value = '';
}

function createGroup() {
    const groupName = document.getElementById('group-name').value.trim();
    const selectedContacts = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
        .map(checkbox => checkbox.value);
    
    if (!groupName) {
        showAlert(document.getElementById('group-name-error'), 'Введите название группы');
        return;
    }
    
    if (selectedContacts.length === 0) {
        showAlert(document.getElementById('group-name-error'), 'Выберите хотя бы одного участника');
        return;
    }
    
    const newChat = {
        id: generateId(),
        name: groupName,
        isPrivate: false,
        participants: [currentUser.id, ...selectedContacts],
        createdAt: new Date().toISOString()
    };
    
    chats.push(newChat);
    localStorage.setItem('ham_chats', JSON.stringify(chats));
    
    hideCreateGroupModal();
    loadChats();
    openChat(newChat.id);
}

// Функции для настроек
function showSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
}

function hideSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
}

function updateProfile() {
    const newName = document.getElementById('settings-name').value.trim();
    
    if (!newName) {
        showAlert(document.getElementById('settings-name-error'), 'Введите имя');
        return;
    }
    
    // Обновляем данные пользователя
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].name = newName;
        currentUser.name = newName;
        
        localStorage.setItem('ham_users', JSON.stringify(users));
        localStorage.setItem('ham_current_user', JSON.stringify(currentUser));
        
        // Обновляем отображение
        document.getElementById('user-display-name').textContent = newName;
        document.getElementById('user-avatar').textContent = newName.charAt(0).toUpperCase();
        
        alert('Профиль обновлен');
        loadChats(); // Обновляем список чатов, так как имя могло измениться
    }
}

function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    
    if (!currentPassword || !newPassword) {
        showAlert(document.getElementById('current-password-error'), 'Заполните все поля');
        return;
    }
    
    if (currentPassword !== currentUser.password) {
        showAlert(document.getElementById('current-password-error'), 'Текущий пароль неверен');
        return;
    }
    
    if (newPassword.length < 5) {
        showAlert(document.getElementById('new-password-error'), 'Пароль должен содержать не менее 5 символов');
        return;
    }
    
    // Обновляем пароль
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        currentUser.password = newPassword;
        
        localStorage.setItem('ham_users', JSON.stringify(users));
        localStorage.setItem('ham_current_user', JSON.stringify(currentUser));
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        
        alert('Пароль изменен');
    }
}

function toggleTheme() {
    darkTheme = !darkTheme;
    
    if (darkTheme) {
        document.body.classList.add('dark-theme');
        document.getElementById('theme-label').textContent = 'Темная тема';
    } else {
        document.body.classList.remove('dark-theme');
        document.getElementById('theme-label').textContent = 'Светлая тема';
    }
    
    localStorage.setItem('ham_dark_theme', darkTheme);
}

function toggleUsersTable() {
    const table = document.getElementById('users-table');
    const tableBody = document.getElementById('users-table-body');
    
    if (table.classList.contains('hidden')) {
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${user.password}</td>
            `;
            tableBody.appendChild(row);
        });
        
        table.classList.remove('hidden');
        document.getElementById('show-users-btn').textContent = 'Скрыть пользователей';
    } else {
        table.classList.add('hidden');
        document.getElementById('show-users-btn').textContent = 'Показать всех пользователей';
    }
}

// Вспомогательные функции
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function initializeSampleData() {
    // Создаем несколько тестовых пользователей
    const sampleUsers = [
        { id: generateId(), name: 'Алексей', phone: '79123456789', password: '123456' },
        { id: generateId(), name: 'Мария', phone: '79234567890', password: '123456' },
        { id: generateId(), name: 'Иван', phone: '79345678901', password: '123456' }
    ];
    
    users = sampleUsers;
    localStorage.setItem('ham_users', JSON.stringify(users));
    
    // Создаем тестовые чаты
    const sampleChats = [
        {
            id: generateId(),
            name: 'Общий чат',
            isPrivate: false,
            participants: [users[0].id, users[1].id, users[2].id],
            createdAt: new Date().toISOString()
        }
    ];
    
    chats = sampleChats;
    localStorage.setItem('ham_chats', JSON.stringify(chats));
    
    // Создаем тестовые сообщения
    const sampleMessages = [
        {
            id: generateId(),
            chatId: sampleChats[0].id,
            senderId: users[0].id,
            text: 'Привет всем!',
            timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: generateId(),
            chatId: sampleChats[0].id,
            senderId: users[1].id,
            text: 'Привет! Как дела?',
            timestamp: new Date(Date.now() - 1800000).toISOString()
        },
        {
            id: generateId(),
            chatId: sampleChats[0].id,
            senderId: users[2].id,
            text: 'Всем привет!',
            timestamp: new Date(Date.now() - 600000).toISOString()
        }
    ];
    
    messages = sampleMessages;
    localStorage.setItem('ham_messages', JSON.stringify(messages));
}