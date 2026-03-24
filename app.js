// Store all activities
let activities = [];
let editingIndex = null;
let deletingIndex = null;

// Display current date
function displayCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-GB', options);
}

// Load activities from localStorage when page loads
function loadActivities() {
    const saved = localStorage.getItem('activities');
    if (saved) {
        activities = JSON.parse(saved);
    }
    checkAndResetIfNewDay();
    renderActivities();
}

// Check if it's a new day and reset counts
function checkAndResetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = localStorage.getItem('lastResetDate');
    if (lastResetDate && lastResetDate !== today) {
        resetDailyCounts(lastResetDate);
    }
    localStorage.setItem('lastResetDate', today);
}

// Reset all counts to 0 and save yesterday's data to history
function resetDailyCounts(yesterdayDate) {
    activities.forEach((activity) => {
        if (!activity.history) activity.history = [];
        if (activity.count > 0) {
            const existingEntry = activity.history.find(entry => entry.date === yesterdayDate);
            if (existingEntry) {
                existingEntry.count = activity.count;
            } else {
                activity.history.push({ date: yesterdayDate, count: activity.count });
            }
        }
        activity.count = 0;
    });
    saveActivities();
}

// Save activities to localStorage
function saveActivities() {
    localStorage.setItem('activities', JSON.stringify(activities));
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('lastResetDate', today);
}

// Render all activities to the page
function renderActivities() {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';

    activities.forEach((activity, index) => {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        activityDiv.dataset.index = index;

        activityDiv.innerHTML = `
            <div class="activity-info">
                <div class="activity-name">${activity.name}</div>
                <div class="activity-count">${activity.count}</div>
            </div>
            <div class="activity-controls">
                <button class="control-btn minus-btn" onclick="decrementActivity(${index})">-</button>
                <button class="control-btn plus-btn" onclick="incrementActivity(${index})">+</button>
                <button class="icon-btn edit-btn" onclick="openEditModal(${index})" title="Edit">✏️</button>
                <button class="icon-btn delete-btn" onclick="openDeleteModal(${index})" title="Delete">🗑️</button>
            </div>
        `;

        activityList.appendChild(activityDiv);
    });

    initDragAndDrop();
}

// ====================================
// DRAG AND DROP (press and hold)
// ====================================

let dragState = {
    dragging: false,
    sourceIndex: null,
    dragEl: null,
    placeholder: null,
    startY: 0,
    offsetY: 0,
    holdTimer: null,
    items: []
};

function initDragAndDrop() {
    const items = document.querySelectorAll('.activity-item');
    items.forEach(item => {
        // Touch events (mobile)
        item.addEventListener('touchstart', onDragStart, { passive: false });
        item.addEventListener('touchmove', onDragMove, { passive: false });
        item.addEventListener('touchend', onDragEnd);
        // Mouse events (desktop)
        item.addEventListener('mousedown', onDragStart);
    });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function getClientY(e) {
    return e.touches ? e.touches[0].clientY : e.clientY;
}

function onDragStart(e) {
    // Don't drag if tapping buttons
    if (e.target.closest('button')) return;

    const item = e.currentTarget;
    const clientY = getClientY(e);

    // Press and hold — wait 300ms before activating drag
    dragState.holdTimer = setTimeout(() => {
        activateDrag(item, clientY);
    }, 300);
}

function activateDrag(item, clientY) {
    dragState.dragging = true;
    dragState.sourceIndex = parseInt(item.dataset.index);

    const rect = item.getBoundingClientRect();
    dragState.offsetY = clientY - rect.top;

    // Create a visual clone to drag around
    const clone = item.cloneNode(true);
    clone.classList.add('drag-clone');
    clone.style.width = rect.width + 'px';
    clone.style.top = (rect.top + window.scrollY) + 'px';
    clone.style.left = rect.left + 'px';
    document.body.appendChild(clone);
    dragState.dragEl = clone;

    // Create a placeholder gap where the item was
    const placeholder = document.createElement('div');
    placeholder.className = 'drag-placeholder';
    placeholder.style.height = rect.height + 'px';
    item.parentNode.replaceChild(placeholder, item);
    dragState.placeholder = placeholder;

    // Cache all remaining items for position checking
    dragState.items = [...document.querySelectorAll('.activity-item')];

    document.body.style.userSelect = 'none';
    item.style.opacity = '0';
}

function onDragMove(e) {
    if (!dragState.dragging) return;
    e.preventDefault();

    const clientY = getClientY(e);
    const scrollY = window.scrollY;

    // Move the clone
    dragState.dragEl.style.top = (clientY - dragState.offsetY + scrollY) + 'px';

    // Find which item we're hovering over and move placeholder
    const list = document.getElementById('activityList');
    const items = [...list.querySelectorAll('.activity-item, .drag-placeholder')];

    for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (clientY < midpoint) {
            list.insertBefore(dragState.placeholder, items[i]);
            return;
        }
    }
    // If below all items, append at end
    list.appendChild(dragState.placeholder);
}

function onDragEnd(e) {
    // Cancel hold timer if we let go before 300ms
    clearTimeout(dragState.holdTimer);

    if (!dragState.dragging) return;
    dragState.dragging = false;

    // Work out new index from placeholder position
    const list = document.getElementById('activityList');
    const children = [...list.children];
    const newIndex = children.indexOf(dragState.placeholder);

    // Remove clone and placeholder
    dragState.dragEl.remove();
    dragState.placeholder.remove();

    // Reorder the activities array
    const moved = activities.splice(dragState.sourceIndex, 1)[0];
    activities.splice(newIndex, 0, moved);

    saveActivities();
    renderActivities();

    document.body.style.userSelect = '';
    dragState = { dragging: false, sourceIndex: null, dragEl: null,
                  placeholder: null, startY: 0, offsetY: 0,
                  holdTimer: null, items: [] };
}

// ====================================
// ACTIVITY FUNCTIONS
// ====================================

function addActivity(name) {
    if (name.trim() === '') return;
    activities.push({ name: name, count: 0, history: [] });
    saveActivities();
    renderActivities();
}

function incrementActivity(index) {
    activities[index].count++;
    logDailyCount(index);
    saveActivities();
    renderActivities();
}

function decrementActivity(index) {
    if (activities[index].count > 0) {
        activities[index].count--;
        logDailyCount(index);
        saveActivities();
        renderActivities();
    }
}

function logDailyCount(index) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateString = today.toISOString().split('T')[0];
    if (!activities[index].history) activities[index].history = [];
    let todayEntry = activities[index].history.find(entry => entry.date === dateString);
    if (todayEntry) {
        todayEntry.count = activities[index].count;
    } else {
        activities[index].history.push({ date: dateString, count: activities[index].count });
    }
}

function openEditModal(index) {
    editingIndex = index;
    const editModal = document.getElementById('editModal');
    const editInput = document.getElementById('editActivityInput');
    editInput.value = activities[index].name;
    editModal.classList.remove('hidden');
    editInput.focus();
}

function saveEdit() {
    if (editingIndex !== null) {
        const newName = document.getElementById('editActivityInput').value.trim();
        if (newName !== '') {
            activities[editingIndex].name = newName;
            saveActivities();
            renderActivities();
        }
        document.getElementById('editModal').classList.add('hidden');
        editingIndex = null;
    }
}

function openDeleteModal(index) {
    deletingIndex = index;
    const deleteModal = document.getElementById('deleteModal');
    const deleteMessage = document.getElementById('deleteMessage');
    deleteMessage.textContent = `Are you sure you want to delete "${activities[index].name}"?`;
    deleteModal.classList.remove('hidden');
}

function confirmDelete() {
    if (deletingIndex !== null) {
        activities.splice(deletingIndex, 1);
        saveActivities();
        renderActivities();
        document.getElementById('deleteModal').classList.add('hidden');
        deletingIndex = null;
    }
}

function cancelDelete() {
    document.getElementById('deleteModal').classList.add('hidden');
    deletingIndex = null;
}

// ====================================
// MODAL EVENT LISTENERS
// ====================================

const modal = document.getElementById('modal');
const addActivityBtn = document.getElementById('addActivityBtn');
const saveActivityBtn = document.getElementById('saveActivityBtn');
const cancelBtn = document.getElementById('cancelBtn');
const activityInput = document.getElementById('activityInput');

const editModal = document.getElementById('editModal');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editActivityInput = document.getElementById('editActivityInput');

const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

addActivityBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    activityInput.value = '';
    activityInput.focus();
});

cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

saveActivityBtn.addEventListener('click', () => {
    addActivity(activityInput.value);
    modal.classList.add('hidden');
});

activityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addActivity(activityInput.value);
        modal.classList.add('hidden');
    }
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});

saveEditBtn.addEventListener('click', saveEdit);
cancelEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
    editingIndex = null;
});

editActivityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEdit();
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
        editingIndex = null;
    }
});

confirmDeleteBtn.addEventListener('click', confirmDelete);
cancelDeleteBtn.addEventListener('click', cancelDelete);

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) cancelDelete();
});

displayCurrentDate();
loadActivities();

// ====================================
// DATA TAB FUNCTIONALITY
// ====================================

let currentRange = 'month';
let selectedHabitIndex = null;
let chart = null;

const tabButtons = document.querySelectorAll('.tab-btn');
const homeContainer = document.querySelector('.container:not(.data-container)');
const dataContainer = document.querySelector('.data-container');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        if (tab === 'home') {
            homeContainer.classList.remove('hidden');
            dataContainer.classList.add('hidden');
        } else {
            homeContainer.classList.add('hidden');
            dataContainer.classList.remove('hidden');
            updateDataTab();
        }
    });
});

function updateDataTab() {
    const dataDate = document.getElementById('dataDate');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dataDate.textContent = today.toLocaleDateString('en-GB', options);
    populateHabitDropdown();
}

function populateHabitDropdown() {
    const dropdown = document.getElementById('habitDropdown');
    dropdown.innerHTML = '<option value="">Select a habit...</option>';
    activities.forEach((activity, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = activity.name;
        dropdown.appendChild(option);
    });
    const noDataMessage = document.getElementById('noDataMessage');
    const statsContent = document.getElementById('statsContent');
    if (activities.length === 0) {
        noDataMessage.classList.remove('hidden');
        statsContent.classList.add('hidden');
        dropdown.disabled = true;
    } else {
        noDataMessage.classList.add('hidden');
        dropdown.disabled = false;
    }
}

document.getElementById('habitDropdown').addEventListener('change', (e) => {
    const index = e.target.value;
    if (index !== '') {
        selectedHabitIndex = parseInt(index);
        document.getElementById('statsContent').classList.remove('hidden');
        updateStats();
    } else {
        document.getElementById('statsContent').classList.add('hidden');
    }
});

const timeButtons = document.querySelectorAll('.time-btn');
timeButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentRange = button.dataset.range;
        timeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        updateStats();
    });
});

function updateStats() {
    if (selectedHabitIndex === null) return;
    const activity = activities[selectedHabitIndex];
    const data = getDataForRange(activity, currentRange);
    updateBigStat(activity, data);
    updateChart(activity, data);
    updateStatCards(activity, data);
}

function getDataForRange(activity, range) {
    const history = activity.history || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date();
    switch(range) {
        case 'week': startDate.setDate(today.getDate() - 6); break;
        case 'month': startDate.setDate(today.getDate() - 29); break;
        case 'year': startDate.setDate(today.getDate() - 364); break;
        case 'all': startDate = new Date(0); break;
    }
    startDate.setHours(0, 0, 0, 0);
    return history.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= today;
    });
}

function updateBigStat(activity, data) {
    const total = data.reduce((sum, entry) => sum + entry.count, 0);
    document.getElementById('bigNumber').textContent = total;
    const labels = { week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' };
    document.getElementById('bigLabel').textContent = `${activity.name} (${labels[currentRange]})`;
}

function updateChart(activity, data) {
    const canvas = document.getElementById('activityChart');
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    const labels = data.map(entry => {
        const date = new Date(entry.date);
        return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    });
    const values = data.map(entry => entry.count);
    drawBarChart(ctx, canvas, labels, values);
}

function drawBarChart(ctx, canvas, labels, values) {
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    ctx.clearRect(0, 0, width, height);
    if (values.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data for this period', width / 2, height / 2);
        return;
    }
    const maxValue = Math.max(...values, 1);
    const barWidth = (width - 40) / values.length;
    const barSpacing = barWidth * 0.2;
    const actualBarWidth = barWidth - barSpacing;
    values.forEach((value, index) => {
        const barHeight = (value / maxValue) * (height - 60);
        const x = 20 + (index * barWidth);
        const y = height - 40 - barHeight;
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(x, y, actualBarWidth, barHeight);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + actualBarWidth / 2, y - 5);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.save();
        ctx.translate(x + actualBarWidth / 2, height - 25);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(labels[index], 0, 0);
        ctx.restore();
    });
}

function updateStatCards(activity, data) {
    const values = data.map(d => d.count);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length > 0 ? (total / values.length).toFixed(1) : 0;
    const best = values.length > 0 ? Math.max(...values) : 0;
    const streak = calculateStreak(activity);
    const change = calculateChange(activity, data);
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAverage').textContent = average;
    document.getElementById('statBestDay').textContent = best;
    document.getElementById('statStreak').textContent = streak + ' days';
    document.getElementById('statChange').textContent = change;
}

function calculateStreak(activity) {
    const history = activity.history || [];
    if (history.length === 0) return 0;
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let entry of sortedHistory) {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        if (daysDiff === streak && entry.count > 0) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

function calculateChange(activity, currentData) {
    if (currentData.length === 0) return '0%';
    const currentTotal = currentData.reduce((sum, entry) => sum + entry.count, 0);
    const history = activity.history || [];
    const periodLength = currentData.length;
    const oldestCurrentDate = new Date(Math.min(...currentData.map(d => new Date(d.date))));
    const previousEndDate = new Date(oldestCurrentDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodLength + 1);
    const previousData = history.filter(entry => {
        const date = new Date(entry.date);
        return date >= previousStartDate && date <= previousEndDate;
    });
    const previousTotal = previousData.reduce((sum, entry) => sum + entry.count, 0);
    if (previousTotal === 0) return currentTotal > 0 ? '+100%' : '0%';
    const change = ((currentTotal - previousTotal) / previousTotal * 100).toFixed(0);
    return change > 0 ? `+${change}%` : `${change}%`;
}
