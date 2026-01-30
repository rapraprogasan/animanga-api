// ANIME MANGA TRACKER - FULL CRUD OPERATIONS
// Created by: Mark Joseph Tabugon Rogasan

// API Configuration - UPDATE THIS WITH YOUR RENDER URL
const API_URL = 'https://animanga-api.onrender.com/items'; 
// Change to: https://animanga-api-[YOURNAME].onrender.com/items

// Local storage fallback
const LOCAL_STORAGE_KEY = 'animanga_memories';

// DOM Elements
let items = [];
let currentFilter = 'all';
let currentType = 'all';
let searchTerm = '';
let itemToDelete = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading screen
    showLoadingScreen();
    
    // Load data
    await loadData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    updateUI();
    
    // Hide loading screen
    setTimeout(() => {
        hideLoadingScreen();
    }, 1000);
});

// ====================
// DATA FUNCTIONS
// ====================

async function loadData() {
    showLoading();
    
    try {
        // Try to load from API first
        const response = await fetch(API_URL);
        
        if (response.ok) {
            items = await response.json();
            updateSyncStatus(true);
            console.log('Data loaded from API:', items.length, 'items');
        } else {
            throw new Error('API failed');
        }
    } catch (error) {
        console.log('Falling back to local storage:', error.message);
        
        // Fallback to local storage
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        
        if (savedData) {
            items = JSON.parse(savedData);
            updateSyncStatus(false, 'Using local storage');
        } else {
            // Load sample data
            items = getSampleData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
            updateSyncStatus(false, 'Using sample data');
        }
    } finally {
        hideLoading();
    }
}

function saveToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

async function saveToAPI(item, isUpdate = false) {
    try {
        const url = isUpdate ? `${API_URL}/${item.id}` : API_URL;
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });
        
        if (response.ok) {
            updateSyncStatus(true);
            return await response.json();
        } else {
            throw new Error('API save failed');
        }
    } catch (error) {
        console.log('Saving to local storage instead');
        saveToLocalStorage();
        updateSyncStatus(false, 'Saved locally');
        return item;
    }
}

async function deleteFromAPI(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            updateSyncStatus(true);
            return true;
        } else {
            throw new Error('API delete failed');
        }
    } catch (error) {
        console.log('Deleting from local storage instead');
        saveToLocalStorage();
        updateSyncStatus(false, 'Deleted locally');
        return true;
    }
}

// ====================
// UI FUNCTIONS
// ====================

function updateUI() {
    const filteredItems = filterItems();
    renderItems(filteredItems);
    updateStats();
    updateSearchCount();
    updateSectionTitle();
}

function renderItems(itemsToRender) {
    const grid = document.getElementById('content-grid');
    const noItems = document.getElementById('no-items');
    
    if (itemsToRender.length === 0) {
        grid.innerHTML = '';
        noItems.style.display = 'block';
        return;
    }
    
    noItems.style.display = 'none';
    
    grid.innerHTML = itemsToRender.map(item => `
        <div class="item-card" data-id="${item.id}">
            <div class="poster-container">
                <img src="${getPosterUrl(item)}" alt="${item.title}" class="poster">
                <div class="poster-overlay">
                    <div class="item-actions">
                        <button class="action-btn btn-play" onclick="playVideo('${item.videoUrl}', '${item.title}')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="editItem(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="confirmDelete(${item.id}, '${item.title}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="item-type-badge ${item.type === 'anime' ? 'badge-anime' : 'badge-manga'}">
                        ${item.type.toUpperCase()}
                    </div>
                </div>
            </div>
            <div class="item-info">
                <div class="item-header">
                    <h3 class="item-title">${item.title}</h3>
                    <div class="item-score">
                        <i class="fas fa-star"></i> ${item.score || 'N/A'}
                    </div>
                </div>
                <div class="item-meta">
                    <span><i class="fas fa-calendar"></i> ${item.year || 'N/A'}</span>
                    <span><i class="fas fa-list-ol"></i> ${getEpisodeText(item)}</span>
                </div>
                <div class="item-status ${getStatusClass(item.status)}">
                    ${getStatusText(item.status)}
                </div>
                ${item.notes ? `
                <div class="item-notes">
                    <p>${item.notes}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function filterItems() {
    return items.filter(item => {
        // Type filter
        if (currentType !== 'all' && item.type !== currentType) return false;
        
        // Status filter
        if (currentFilter !== 'all' && item.status !== currentFilter) return false;
        
        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return item.title.toLowerCase().includes(searchLower) || 
                   (item.notes && item.notes.toLowerCase().includes(searchLower));
        }
        
        return true;
    });
}

function updateStats() {
    const animeCount = items.filter(item => item.type === 'anime').length;
    const mangaCount = items.filter(item => item.type === 'manga').length;
    const watchingCount = items.filter(item => item.status === 'watching').length;
    const completedCount = items.filter(item => item.status === 'completed').length;
    
    document.getElementById('total-anime').textContent = animeCount;
    document.getElementById('total-manga').textContent = mangaCount;
    document.getElementById('total-watching').textContent = watchingCount;
    document.getElementById('total-completed').textContent = completedCount;
    
    const filteredCount = filterItems().length;
    document.getElementById('items-count').textContent = filteredCount;
}

function updateSearchCount() {
    const count = filterItems().length;
    const searchCount = document.getElementById('search-count');
    
    if (searchTerm && count > 0) {
        searchCount.textContent = count;
        searchCount.style.display = 'block';
    } else {
        searchCount.style.display = 'none';
    }
}

function updateSectionTitle() {
    const title = document.getElementById('section-title');
    let icon = 'fas fa-th-list';
    let text = 'All Items';
    
    if (currentType === 'anime') {
        icon = 'fas fa-tv';
        text = 'Anime';
    } else if (currentType === 'manga') {
        icon = 'fas fa-book';
        text = 'Manga';
    } else if (currentFilter !== 'all') {
        switch(currentFilter) {
            case 'watching': 
                icon = 'fas fa-clock';
                text = 'Currently Watching/Reading';
                break;
            case 'completed':
                icon = 'fas fa-check-circle';
                text = 'Completed';
                break;
            case 'dropped':
                icon = 'fas fa-times-circle';
                text = 'Dropped';
                break;
            case 'plan':
                icon = 'fas fa-calendar-plus';
                text = 'Plan to Watch/Read';
                break;
        }
    }
    
    title.innerHTML = `<i class="${icon}"></i> ${text}`;
}

function updateSyncStatus(online, message = null) {
    const status = document.getElementById('sync-status');
    
    if (online) {
        status.textContent = 'Online';
        status.style.color = '#28a745';
    } else {
        status.textContent = message || 'Offline';
        status.style.color = '#ffc107';
    }
}

// ====================
// CRUD OPERATIONS
// ====================

function addItem() {
    document.getElementById('modal-title').textContent = 'Add New Anime/Manga';
    document.getElementById('item-id').value = '';
    document.getElementById('item-form').reset();
    document.getElementById('episodes-label').textContent = 'Episodes';
    document.getElementById('type').value = 'anime';
    document.getElementById('status').value = 'plan';
    
    showModal('edit-modal');
}

async function saveItem() {
    const form = document.getElementById('item-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const id = document.getElementById('item-id').value;
    const item = {
        title: document.getElementById('title').value,
        type: document.getElementById('type').value,
        status: document.getElementById('status').value,
        episodes: document.getElementById('episodes').value || null,
        score: document.getElementById('score').value || null,
        year: document.getElementById('year').value || null,
        poster: document.getElementById('poster').value || null,
        videoUrl: document.getElementById('videoUrl').value || null,
        notes: document.getElementById('notes').value || null
    };
    
    showLoading();
    
    if (id) {
        // Update existing item
        item.id = parseInt(id);
        const savedItem = await saveToAPI(item, true);
        
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = savedItem;
        }
        
        showNotification('Item updated successfully!');
    } else {
        // Add new item
        const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
        item.id = newId;
        
        const savedItem = await saveToAPI(item);
        items.push(savedItem);
        
        showNotification('Item added successfully!');
    }
    
    saveToLocalStorage();
    hideLoading();
    closeModal('edit-modal');
    updateUI();
}

function editItem(id) {
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    document.getElementById('modal-title').textContent = 'Edit Item';
    document.getElementById('item-id').value = item.id;
    document.getElementById('title').value = item.title;
    document.getElementById('type').value = item.type;
    document.getElementById('status').value = item.status;
    document.getElementById('episodes').value = item.episodes || item.chapters || '';
    document.getElementById('episodes-label').textContent = item.type === 'anime' ? 'Episodes' : 'Chapters';
    document.getElementById('score').value = item.score || '';
    document.getElementById('year').value = item.year || '';
    document.getElementById('poster').value = item.poster || '';
    document.getElementById('videoUrl').value = item.videoUrl || '';
    document.getElementById('notes').value = item.notes || '';
    
    showModal('edit-modal');
}

function confirmDelete(id, title) {
    itemToDelete = id;
    document.getElementById('delete-item-title').textContent = title;
    showModal('delete-modal');
}

async function deleteItem() {
    if (!itemToDelete) return;
    
    showLoading();
    
    await deleteFromAPI(itemToDelete);
    
    // Remove from local array
    items = items.filter(item => item.id !== itemToDelete);
    
    // Save to local storage
    saveToLocalStorage();
    
    showNotification('Item deleted successfully!');
    closeModal('delete-modal');
    
    itemToDelete = null;
    updateUI();
    hideLoading();
}

// ====================
// MODAL FUNCTIONS
// ====================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function playVideo(videoUrl, title) {
    if (!videoUrl) {
        showNotification('No trailer available for this item', true);
        return;
    }
    
    // Convert YouTube URL to embed if needed
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
        const videoId = videoUrl.split('v=')[1]?.split('&')[0];
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    }
    
    document.getElementById('video-frame').src = embedUrl;
    document.getElementById('video-title').textContent = title;
    document.getElementById('video-description').textContent = `Trailer for ${title}`;
    
    showModal('video-modal');
}

// ====================
// UTILITY FUNCTIONS
// ====================

function getPosterUrl(item) {
    if (item.poster) return item.poster;
    
    return item.type === 'anime' 
        ? 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}

function getEpisodeText(item) {
    if (item.type === 'anime') {
        return item.episodes ? `${item.episodes} episodes` : 'Unknown';
    } else {
        return item.episodes ? `${item.episodes} chapters` : 'Unknown';
    }
}

function getStatusClass(status) {
    return `status-${status}`;
}

function getStatusText(status) {
    const statusMap = {
        'watching': 'Currently Watching/Reading',
        'completed': 'Completed',
        'dropped': 'Dropped',
        'plan': 'Plan to Watch/Read'
    };
    return statusMap[status] || status;
}

function showLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 500);
}

function showLoading() {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
    }
}

function hideLoading() {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Item';
        saveBtn.disabled = false;
    }
}

function showNotification(message, isError = false) {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.innerHTML = `
        <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 3000;
                animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
                animation-fill-mode: forwards;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                max-width: 300px;
            }
            .notification.error {
                background: #dc3545;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ====================
// EVENT LISTENERS
// ====================

function setupEventListeners() {
    // Navigation filters
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Update filters
            const filter = this.getAttribute('data-filter');
            const type = this.getAttribute('data-type');
            
            if (filter) {
                currentFilter = filter;
                currentType = 'all';
            } else if (type) {
                currentType = type;
                currentFilter = 'all';
            }
            
            updateUI();
            
            // Close mobile menu
            if (window.innerWidth <= 768) {
                document.querySelector('.nav-links').classList.remove('active');
            }
        });
    });
    
    // Search
    document.getElementById('search-input').addEventListener('input', function() {
        searchTerm = this.value.trim();
        updateUI();
    });
    
    // Add item button
    document.getElementById('add-item-btn').addEventListener('click', addItem);
    document.getElementById('add-first-item').addEventListener('click', addItem);
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        document.getElementById('refresh-btn').style.animation = 'spin 1s linear';
        await loadData();
        updateUI();
        setTimeout(() => {
            document.getElementById('refresh-btn').style.animation = '';
        }, 1000);
    });
    
    // Form submission
    document.getElementById('item-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveItem();
    });
    
    // Type change in form
    document.getElementById('type').addEventListener('change', function() {
        document.getElementById('episodes-label').textContent = 
            this.value === 'anime' ? 'Episodes' : 'Chapters';
    });
    
    // Cancel buttons
    document.getElementById('cancel-btn').addEventListener('click', () => closeModal('edit-modal'));
    document.getElementById('cancel-delete').addEventListener('click', () => closeModal('delete-modal'));
    
    // Delete confirmation
    document.getElementById('confirm-delete').addEventListener('click', deleteItem);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('video-close')) {
                closeModal('video-modal');
            } else {
                closeModal('edit-modal');
            }
        });
    });
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.id === 'edit-modal') closeModal('edit-modal');
        if (e.target.id === 'video-modal') closeModal('video-modal');
        if (e.target.id === 'delete-modal') closeModal('delete-modal');
    });
    
    // Mobile menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('active');
    });
    
    // View API link
    document.getElementById('view-api')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(API_URL, '_blank');
    });
    
    // Online/offline detection
    window.addEventListener('online', () => updateSyncStatus(true));
    window.addEventListener('offline', () => updateSyncStatus(false, 'Offline'));
}

// ====================
// SAMPLE DATA
// ====================

function getSampleData() {
    return [
        {
            id: 1,
            title: "Attack on Titan",
            type: "anime",
            status: "completed",
            episodes: 75,
            score: 9.2,
            poster: "https://images.unsplash.com/photo-1639322537228-f710d846310a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/MGRm4IzK1SQ",
            notes: "One of the best anime ever! The plot twists are incredible. Eren's character development is amazing.",
            year: 2013
        },
        {
            id: 2,
            title: "Demon Slayer",
            type: "anime",
            status: "watching",
            episodes: 55,
            score: 8.9,
            poster: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/VQGCKyvzIM4",
            notes: "Amazing animation and fight scenes. Tanjiro is such a good protagonist. Currently watching season 3.",
            year: 2019
        },
        {
            id: 3,
            title: "One Piece",
            type: "manga",
            status: "watching",
            episodes: 1070,
            score: 9.5,
            poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/sOP9Rg_USII",
            notes: "Long but worth it. The world building is incredible. Luffy's journey is inspiring.",
            year: 1999
        },
        {
            id: 4,
            title: "Jujutsu Kaisen",
            type: "anime",
            status: "completed",
            episodes: 47,
            score: 8.7,
            poster: "https://images.unsplash.com/photo-1639322537502-9e1a6b8b1b8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/pkKu9hLT-t8",
            notes: "Great characters and animation. Gojo is awesome. Excited for season 2!",
            year: 2020
        },
        {
            id: 5,
            title: "Death Note",
            type: "anime",
            status: "completed",
            episodes: 37,
            score: 8.8,
            poster: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/NlJZ-YgAt-c",
            notes: "Classic psychological thriller. Light and L's battle is legendary. Ryuk is hilarious.",
            year: 2006
        },
        {
            id: 6,
            title: "My Hero Academia",
            type: "anime",
            status: "dropped",
            episodes: 138,
            score: 7.5,
            poster: "https://images.unsplash.com/photo-1639322537502-9e1a6b8b1b8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/w1xOQvGc1dI",
            notes: "Started strong but lost interest after season 3. Too many characters, not enough development.",
            year: 2016
        },
        {
            id: 7,
            title: "Chainsaw Man",
            type: "manga",
            status: "completed",
            episodes: 97,
            score: 9.0,
            poster: "https://images.unsplash.com/photo-1639322537191-2f6e3a3b3c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            videoUrl: "https://www.youtube.com/embed/dFlDRhvM4L0",
            notes: "Crazy and unique story. Denji is hilarious. Makima is... interesting. Can't wait for the anime!",
            year: 2018
        }
    ];
}


