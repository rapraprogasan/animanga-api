// API Configuration
const API_URL = 'https://animanga-api.onrender.com/items'; // Will be replaced with your Render URL

// DOM Elements
const contentGrid = document.getElementById('content-grid');
const searchInput = document.getElementById('search-input');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionTitle = document.getElementById('section-title');
const videoModal = document.getElementById('video-modal');
const videoFrame = document.getElementById('video-frame');
const videoTitle = document.getElementById('video-title');
const videoDescription = document.getElementById('video-description');
const editModal = document.getElementById('edit-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const addItemBtn = document.getElementById('add-item-btn');
const refreshBtn = document.getElementById('refresh-btn');
const syncStatus = document.getElementById('sync-status');
const loadingScreen = document.getElementById('loading-screen');

// Form elements
const itemId = document.getElementById('item-id');
const titleInput = document.getElementById('title');
const typeInput = document.getElementById('type');
const statusInput = document.getElementById('status');
const episodesInput = document.getElementById('episodes');
const episodesLabel = document.getElementById('episodes-label');
const scoreInput = document.getElementById('score');
const yearInput = document.getElementById('year');
const posterInput = document.getElementById('poster');
const videoUrlInput = document.getElementById('videoUrl');
const notesInput = document.getElementById('notes');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

// State variables
let currentFilter = 'all';
let currentType = 'all';
let searchTerm = '';
let items = [];
let isOnline = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Hide loading screen after 1.5 seconds
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1500);

    // Load data from API
    await loadData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    renderItems(items);
    updateStats();
});

// Setup all event listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', function() {
        searchTerm = this.value.toLowerCase();
        filterItems();
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            const type = this.getAttribute('data-type');
            
            if (filter) {
                currentFilter = filter;
                currentType = 'all';
                sectionTitle.textContent = getSectionTitle(filter);
            } else if (type) {
                currentType = type;
                currentFilter = 'all';
                sectionTitle.textContent = getSectionTitle(type);
            }
            
            filterItems();
            
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                document.querySelector('.nav-links').classList.remove('active');
            }
        });
    });
    
    // Mobile menu
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('active');
    });
    
    // Video modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('video-close')) {
                closeVideoModal();
            } else {
                closeEditModal();
            }
        });
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === videoModal) closeVideoModal();
        if (e.target === editModal) closeEditModal();
    });
    
    // Add item button
    addItemBtn.addEventListener('click', () => openEditModal());
    
    // Refresh button
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.style.animation = 'spin 1s linear';
        await loadData();
        setTimeout(() => {
            refreshBtn.style.animation = '';
        }, 1000);
    });
    
    // Form type change
    typeInput.addEventListener('change', function() {
        episodesLabel.textContent = this.value === 'anime' ? 'Episodes' : 'Chapters';
    });
    
    // Form submission
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveItem();
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', closeEditModal);
    
    // Check online status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
}

// API Functions
async function loadData() {
    try {
        showLoading();
        
        // For demo purposes, if no API_URL is set, use local data
        if (!API_URL.includes('your-render-app')) {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch data');
            items = await response.json();
        } else {
            // Fallback to local data for demo
            items = [
                {
                    id: 1,
                    title: "Attack on Titan",
                    type: "anime",
                    status: "completed",
                    episodes: 75,
                    score: 9.0,
                    poster: "https://images.unsplash.com/photo-1639322537228-f710d846310a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    videoUrl: "https://www.youtube.com/embed/MGRm4IzK1SQ",
                    notes: "One of the best anime ever. The plot twists are incredible!",
                    year: 2013
                },
                {
                    id: 2,
                    title: "Demon Slayer",
                    type: "anime",
                    status: "watching",
                    episodes: 55,
                    score: 8.7,
                    poster: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                    videoUrl: "https://www.youtube.com/embed/VQGCKyvzIM4",
                    notes: "Amazing animation and fight scenes. Currently watching season 3.",
                    year: 2019
                }
            ];
        }
        
        syncStatus.textContent = 'Online';
        syncStatus.style.color = '#28a745';
        isOnline = true;
        
        renderItems(items);
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
        syncStatus.textContent = 'Offline';
        syncStatus.style.color = '#dc3545';
        isOnline = false;
        
        // Try to load from localStorage as fallback
        const savedData = localStorage.getItem('animangaData');
        if (savedData) {
            items = JSON.parse(savedData);
            renderItems(items);
            updateStats();
        }
    } finally {
        hideLoading();
    }
}

async function saveItem() {
    const formData = {
        title: titleInput.value,
        type: typeInput.value,
        status: statusInput.value,
        score: parseFloat(scoreInput.value) || null,
        year: parseInt(yearInput.value) || null,
        poster: posterInput.value || getDefaultPoster(typeInput.value),
        videoUrl: videoUrlInput.value || '',
        notes: notesInput.value,
        [typeInput.value === 'anime' ? 'episodes' : 'chapters']: parseInt(episodesInput.value) || null
    };
    
    const id = itemId.value;
    
    try {
        showLoading();
        
        if (id) {
            // Update existing item
            if (!API_URL.includes('your-render-app')) {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({...formData, id: parseInt(id)})
                });
                
                if (!response.ok) throw new Error('Failed to update item');
            }
            
            // Update local data
            const index = items.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                items[index] = { ...items[index], ...formData, id: parseInt(id) };
            }
        } else {
            // Add new item
            const newId = Math.max(...items.map(item => item.id), 0) + 1;
            const newItem = { ...formData, id: newId };
            
            if (!API_URL.includes('your-render-app')) {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newItem)
                });
                
                if (!response.ok) throw new Error('Failed to add item');
            }
            
            items.push(newItem);
        }
        
        // Save to localStorage as backup
        localStorage.setItem('animangaData', JSON.stringify(items));
        
        closeEditModal();
        renderItems(items);
        updateStats();
        
        showNotification(id ? 'Item updated successfully!' : 'Item added successfully!');
    } catch (error) {
        console.error('Error saving item:', error);
        showNotification('Failed to save item. Using local storage.', true);
        
        // Fallback to localStorage
        if (id) {
            const index = items.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                items[index] = { ...items[index], ...formData, id: parseInt(id) };
            }
        } else {
            const newId = Math.max(...items.map(item => item.id), 0) + 1;
            items.push({ ...formData, id: newId });
        }
        
        localStorage.setItem('animangaData', JSON.stringify(items));
        
        closeEditModal();
        renderItems(items);
        updateStats();
    } finally {
        hideLoading();
    }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        showLoading();
        
        if (!API_URL.includes('your-render-app')) {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete item');
        }
        
        // Update local data
        items = items.filter(item => item.id !== id);
        localStorage.setItem('animangaData', JSON.stringify(items));
        
        renderItems(items);
        updateStats();
        showNotification('Item deleted successfully!');
    } catch (error) {
        console.error('Error deleting item:', error);
        showNotification('Failed to delete item from server. Deleted locally.', true);
        
        // Fallback to localStorage
        items = items.filter(item => item.id !== id);
        localStorage.setItem('animangaData', JSON.stringify(items));
        
        renderItems(items);
        updateStats();
    } finally {
        hideLoading();
    }
}

// UI Functions
function renderItems(itemsToRender) {
    contentGrid.innerHTML = '';
    
    if (itemsToRender.length === 0) {
        contentGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No items found</h3>
                <p>Try a different search or filter</p>
            </div>
        `;
        return;
    }
    
    itemsToRender.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        
        const episodeText = item.type === 'anime' ? 'Episodes' : 'Chapters';
        const episodeCount = item.episodes || item.chapters || 0;
        const statusClass = `status-${item.status}`;
        const typeClass = `type-${item.type}`;
        
        itemCard.innerHTML = `
            <div class="poster-container">
                <img src="${item.poster || getDefaultPoster(item.type)}" alt="${item.title}" class="poster" onerror="this.src='https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                <div class="poster-overlay">
                    <div class="play-button" data-id="${item.id}" data-video="${item.videoUrl}" data-title="${item.title}">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="edit-button" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="delete-button" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
            </div>
            <div class="item-info">
                <div class="item-header">
                    <h3 class="item-title">${item.title}</h3>
                    <span class="item-type ${typeClass}">${item.type.toUpperCase()}</span>
                </div>
                <div class="item-meta">
                    <span>${item.year || 'N/A'}</span>
                    <span>${episodeText}: ${episodeCount}</span>
                    <span>Score: ${item.score || 'N/A'}/10</span>
                </div>
                <div class="item-status ${statusClass}">
                    ${getStatusText(item.status)}
                </div>
                ${item.notes ? `<div class="item-notes"><p>${item.notes}</p></div>` : ''}
            </div>
        `;
        
        contentGrid.appendChild(itemCard);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.play-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const videoUrl = this.getAttribute('data-video');
            const title = this.getAttribute('data-title');
            openVideoModal(videoUrl, title);
        });
    });
    
    document.querySelectorAll('.edit-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const item = items.find(item => item.id === id);
            if (item) openEditModal(item);
        });
    });
    
    document.querySelectorAll('.delete-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteItem(id);
        });
    });
}

function filterItems() {
    let filteredItems = items;
    
    if (currentType !== 'all') {
        filteredItems = filteredItems.filter(item => item.type === currentType);
    }
    
    if (currentFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.status === currentFilter);
    }
    
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.title.toLowerCase().includes(searchTerm) || 
            (item.notes && item.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    renderItems(filteredItems);
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
}

function getSectionTitle(filter) {
    const titles = {
        'all': 'All Items',
        'watching': 'Currently Watching/Reading',
        'completed': 'Completed',
        'dropped': 'Dropped',
        'plan': 'Plan to Watch/Read',
        'anime': 'Anime',
        'manga': 'Manga'
    };
    return titles[filter] || 'All Items';
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

function getDefaultPoster(type) {
    return type === 'anime' 
        ? 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}

// Modal Functions
function openVideoModal(videoUrl, title) {
    if (!videoUrl) {
        showNotification('No trailer available for this item', true);
        return;
    }
    
    // Convert regular YouTube URL to embed URL if needed
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
        const videoId = videoUrl.split('v=')[1]?.split('&')[0];
        if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
    }
    
    videoFrame.src = embedUrl;
    videoTitle.textContent = title;
    videoDescription.textContent = `Trailer for ${title}`;
    videoModal.style.display = 'flex';
}

function closeVideoModal() {
    videoFrame.src = '';
    videoModal.style.display = 'none';
}

function openEditModal(item = null) {
    if (item) {
        // Edit mode
        modalTitle.textContent = 'Edit Item';
        itemId.value = item.id;
        titleInput.value = item.title;
        typeInput.value = item.type;
        statusInput.value = item.status;
        episodesInput.value = item.episodes || item.chapters || '';
        episodesLabel.textContent = item.type === 'anime' ? 'Episodes' : 'Chapters';
        scoreInput.value = item.score || '';
        yearInput.value = item.year || '';
        posterInput.value = item.poster || '';
        videoUrlInput.value = item.videoUrl || '';
        notesInput.value = item.notes || '';
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Item';
        itemId.value = '';
        titleInput.value = '';
        typeInput.value = 'anime';
        statusInput.value = 'plan';
        episodesInput.value = '';
        episodesLabel.textContent = 'Episodes';
        scoreInput.value = '';
        yearInput.value = '';
        posterInput.value = '';
        videoUrlInput.value = '';
        notesInput.value = '';
    }
    
    editModal.style.display = 'flex';
}

function closeEditModal() {
    editModal.style.display = 'none';
    itemForm.reset();
}

// Utility Functions
function showLoading() {
    // Could add a small loading indicator
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
}

function hideLoading() {
    saveBtn.innerHTML = 'Save Item';
    saveBtn.disabled = false;
}

function showNotification(message, isError = false) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.innerHTML = `
        <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 3000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            animation-fill-mode: forwards;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .notification.error {
            background: #dc3545;
        }
        .notification i {
            font-size: 1.2rem;
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
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
        if (style.parentNode) {
            style.remove();
        }
    }, 3000);
}

function updateOnlineStatus() {
    isOnline = navigator.onLine;
    syncStatus.textContent = isOnline ? 'Online' : 'Offline';
    syncStatus.style.color = isOnline ? '#28a745' : '#dc3545';
    
    if (!isOnline) {
        showNotification('You are offline. Changes will be saved locally.', true);
    }
}

// Add CSS for no results
const noResultsStyle = document.createElement('style');
noResultsStyle.textContent = `
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem 2rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 15px;
        backdrop-filter: blur(10px);
    }
    
    .no-results i {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: var(--gray);
    }
    
    .no-results h3 {
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
        color: white;
    }
    
    .no-results p {
        color: var(--gray);
    }
`;

document.head.appendChild(noResultsStyle);
