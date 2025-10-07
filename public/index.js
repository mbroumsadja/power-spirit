const socket = io("http://localhost:3000",{
    cors:{
        origin :"*"
    }
});

const form = document.getElementById('form');
const input = document.getElementById('input');
const username = document.getElementById('username-input');
const messages = document.getElementById('messages');
const fileInput = document.getElementById('file-input');
const fileBtn = document.getElementById('file-btn');
const userCountElement = document.getElementById('user-count-number');
const uploadStatus = document.getElementById('upload-status');

socket.on('user-count', (count) => {
  userCountElement.textContent = count;
});

// Récupérer le nom depuis localStorage (pour mobile)
if (localStorage.getItem('username')) {
  username.value = localStorage.getItem('username');
}

// Sauvegarder le nom
username.addEventListener('change', () => {
  localStorage.setItem('username', username.value);
});

// Envoi du message texte
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (input.value && username.value) {
    socket.emit('message', {
      username: username.value,
      text: input.value
    });
    
    input.value = '';
  }
});

// Ouvrir le sélecteur de fichier
fileBtn.addEventListener('click', () => {
  fileInput.click();
});

// Envoi du fichier via Multer
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  if (file && username.value) {
    // Limite de taille (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (max 10MB)');
      return;
    }
    
    // Créer un FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username.value);
    
    // Afficher l'état d'upload
    fileBtn.classList.add('uploading');
    uploadStatus.textContent = `📤 Envoi de ${file.name}...`;
    
    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        uploadStatus.textContent = "";
        setTimeout(() => {
          uploadStatus.textContent = '';
        }, 3000);
      } else {
        uploadStatus.textContent = '';
      }
    } catch (error) {
      console.error('Erreur:', error);
      uploadStatus.textContent = '';
    } finally {
      fileBtn.classList.remove('uploading');
      fileInput.value = ''; // Reset
    }
  }
});

// Recevoir les messages texte
socket.on('message', (data) => {
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `
    <div class="username">
      ${data.username}
      <span class="timestamp">${data.timestamp}</span>
    </div>
    <div class="text">${escapeHtml(data.text)}</div>
  `;
  messages.appendChild(div);
  scrollToBottom();
});

// Recevoir les fichiers
socket.on('file', (data) => {
  const div = document.createElement('div');
  div.className = 'message';
  
let fileContent = '';
  const fileSize = formatFileSize(data.filesize);
  
  // Affichage différent selon le type de fichier
  if (data.filetype.startsWith('image/')) {
    fileContent = `<div class="file-preview">
      <a href="/file${data.fileUrl}" target="_blank">
        <img src="${data.fileUrl}" alt="${data.filename}">
      </a>
      <div class="file-size">${fileSize}</div>
    </div>`;
  } else {
    fileContent = `<div class="file-preview">
      <a href="/file${data.fileUrl}" download="${data.filename}" class="file-link">
        <span>📄 ${escapeHtml(data.filename)}</span>
        <span class="file-size">${fileSize}</span>
      </a>
    </div>`;
  }
  
  div.innerHTML = `
    <div class="username">
      ${escapeHtml(data.username)}
      <span class="timestamp">${data.timestamp}</span>
    </div>
    ${fileContent}
  `;
  
  messages.appendChild(div);
  scrollToBottom();
});

// Utilitaires
function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

socket.on('connect', () => {
  console.log('Connecté au serveur');
});