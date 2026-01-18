// List Share Application
// Manages list creation, editing, and URL-based sharing

class ListApp {
  constructor() {
    this.listTitle = '';
    this.items = [];
    this.init();
  }

  init() {
    // Get DOM elements
    this.listTitleInput = document.getElementById('listTitle');
    this.itemInput = document.getElementById('itemInput');
    this.addItemBtn = document.getElementById('addItemBtn');
    this.listItemsContainer = document.getElementById('listItems');
    this.shareBtn = document.getElementById('shareBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.newListBtn = document.getElementById('newListBtn');
    this.toastContainer = document.getElementById('toastContainer');

    // Set up event listeners
    this.setupEventListeners();

    // Load list from URL or create new
    this.loadFromURL();

    // Render initial state
    this.render();
  }

  setupEventListeners() {
    // Add item on button click
    this.addItemBtn.addEventListener('click', () => this.addItem());

    // Add item on Enter key
    this.itemInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addItem();
      }
    });

    // Update title
    this.listTitleInput.addEventListener('input', (e) => {
      this.listTitle = e.target.value;
      this.updateURL();
    });

    // Share button
    this.shareBtn.addEventListener('click', () => this.shareList());

    // Clear button
    this.clearBtn.addEventListener('click', () => this.clearList());

    // New list button
    this.newListBtn.addEventListener('click', () => this.createNewList());
  }

  addItem() {
    const text = this.itemInput.value.trim();

    if (!text) {
      this.showToast('Please enter an item', 'error');
      return;
    }

    const item = {
      id: Date.now(),
      text: text,
      completed: false
    };

    this.items.push(item);
    this.itemInput.value = '';
    this.itemInput.focus();

    this.render();
    this.updateURL();
  }

  toggleItem(id) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.completed = !item.completed;
      this.render();
      this.updateURL();
    }
  }

  deleteItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.render();
    this.updateURL();
  }

  clearList() {
    if (this.items.length === 0) {
      this.showToast('List is already empty', 'error');
      return;
    }

    if (confirm('Are you sure you want to clear all items?')) {
      this.items = [];
      this.render();
      this.updateURL();
      this.showToast('List cleared successfully');
    }
  }

  createNewList() {
    if (this.items.length > 0 || this.listTitle) {
      if (!confirm('Create a new list? Current list will be lost if not shared.')) {
        return;
      }
    }

    this.listTitle = '';
    this.items = [];
    this.listTitleInput.value = '';
    window.location.hash = '';
    this.render();
    this.showToast('New list created');
  }

  render() {
    // Render list items
    if (this.items.length === 0) {
      this.listItemsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">[NULL]</div>
          <p>List is empty_</p>
        </div>
      `;
      return;
    }

    this.listItemsContainer.innerHTML = this.items.map((item, index) => `
      <div class="list-item ${item.completed ? 'completed' : ''}" 
           data-id="${item.id}"
           draggable="true"
           ondragstart="app.handleDragStart(event)"
           ondragover="app.handleDragOver(event)"
           ondrop="app.handleDrop(event)"
           ondragend="app.handleDragEnd(event)"
           ondragenter="app.handleDragEnter(event)"
           ondragleave="app.handleDragLeave(event)">
        <span class="drag-handle">::</span>
        <span class="item-number">${index + 1}</span>
        <label class="checkbox-wrapper">
          <input 
            type="checkbox" 
            ${item.completed ? 'checked' : ''}
            onchange="app.toggleItem(${item.id})"
          >
          <span class="checkbox-custom"></span>
        </label>
        <span class="item-text">${this.escapeHtml(item.text)}</span>
        <button class="delete-btn" onclick="app.deleteItem(${item.id})">[DEL]</button>
      </div>
    `).join('');
  }

  updateURL() {
    const data = {
      title: this.listTitle,
      items: this.items
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    window.location.hash = encoded;
  }

  loadFromURL() {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      return;
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(atob(hash)));

      if (decoded.title) {
        this.listTitle = decoded.title;
        this.listTitleInput.value = decoded.title;
      }

      if (Array.isArray(decoded.items)) {
        this.items = decoded.items;
      }

      this.showToast('List loaded successfully');
    } catch (error) {
      console.error('Error loading list from URL:', error);
      this.showToast('Error loading list from URL', 'error');
    }
  }

  async shareList() {
    if (this.items.length === 0 && !this.listTitle) {
      this.showToast('Create a list first before sharing', 'error');
      return;
    }

    let url = window.location.href;

    // Check URL length
    if (url.length > 2000) {
      this.showToast('List is too long to share via URL. Try removing some items.', 'error');
      return;
    }

    // Shorten URL if it's longer than 500 characters
    if (url.length > 500) {
      this.showToast('Shortening URL...', 'info');
      const shortUrl = await this.shortenURL(url);
      if (shortUrl) {
        url = shortUrl;
      }
    }

    try {
      // Try to use the Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        this.showToast('LINK_COPIED_TO_CLIPBOARD');
      } else {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(url);
        this.showToast('LINK_COPIED_TO_CLIPBOARD');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showToast('Failed to copy link. Please copy manually from the address bar.', 'error');
    }
  }

  async shortenURL(longUrl) {
    try {
      // Using TinyURL API (free, no API key required)
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);

      if (response.ok) {
        const shortUrl = await response.text();
        return shortUrl;
      }

      // Fallback to is.gd if TinyURL fails
      const isgdResponse = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`);
      if (isgdResponse.ok) {
        const shortUrl = await isgdResponse.text();
        return shortUrl;
      }

      return null;
    } catch (error) {
      console.error('Error shortening URL:', error);
      return null; // Return null to use original URL
    }
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (error) {
      throw new Error('Fallback copy failed');
    }

    document.body.removeChild(textArea);
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '[OK]' : '[ERR]'}</span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Drag and Drop Handlers
  handleDragStart(event) {
    const listItem = event.target.closest('.list-item');
    if (!listItem) return;

    this.draggedElement = listItem;
    listItem.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', listItem.innerHTML);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return false;
  }

  handleDragEnter(event) {
    const listItem = event.target.closest('.list-item');
    if (listItem && listItem !== this.draggedElement) {
      listItem.classList.add('drag-over');
    }
  }

  handleDragLeave(event) {
    const listItem = event.target.closest('.list-item');
    if (listItem) {
      listItem.classList.remove('drag-over');
    }
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropTarget = event.target.closest('.list-item');
    if (!dropTarget || !this.draggedElement || dropTarget === this.draggedElement) {
      return false;
    }

    // Get the IDs
    const draggedId = parseInt(this.draggedElement.dataset.id);
    const targetId = parseInt(dropTarget.dataset.id);

    // Find indices
    const draggedIndex = this.items.findIndex(item => item.id === draggedId);
    const targetIndex = this.items.findIndex(item => item.id === targetId);

    // Reorder the items array
    const [draggedItem] = this.items.splice(draggedIndex, 1);
    this.items.splice(targetIndex, 0, draggedItem);

    // Re-render and update URL
    this.render();
    this.updateURL();

    return false;
  }

  handleDragEnd(event) {
    const listItem = event.target.closest('.list-item');
    if (listItem) {
      listItem.classList.remove('dragging');
    }

    // Remove all drag-over classes
    document.querySelectorAll('.list-item').forEach(item => {
      item.classList.remove('drag-over');
    });

    this.draggedElement = null;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app when DOM is ready
let app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app = new ListApp();
  });
} else {
  app = new ListApp();
}
