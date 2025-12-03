/* app.js
   Features included:
   - Daily quote banner (changes daily)
   - Add / Delete / Complete tasks
   - Notes per task (edit via prompt)
   - Drag & drop reorder (HTML5 drag/drop)
   - Sidebar filters & search
   - Task counters (Pending / Completed)
   - localStorage persistence
*/

const STORAGE_KEY = 'myTodo.tasks.finalv1';
const QUOTE_CLOSED_KEY = 'myTodo.quoteClosedDate';

const taskListEl = document.getElementById('taskList');
const addBtn = document.getElementById('addBtn');
const clearAllBtn = document.getElementById('clearAll');
const searchInput = document.getElementById('searchInput');
const pendingCountEl = document.getElementById('pendingCount');
const completedCountEl = document.getElementById('completedCount');

const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const overlay = document.getElementById('overlay');
const sidebarItems = document.querySelectorAll('.sidebar-nav li');

const quoteBanner = document.getElementById('quoteBanner');
const quoteText = document.getElementById('quoteText');
const closeQuote = document.getElementById('closeQuote');

let tasks = []; // {id, text, dueDate, category, note, completed}
let activeFilter = 'All';
let dragSrcId = null;

/* ----------------- DAILY QUOTES -------------------- */
const QUOTES = [
  "Small progress every day leads to big results.",
  "Do it for the future you will thank today.",
  "One step is better than no step.",
  "Consistency beats intensity.",
  "Start small. Think big. Act now.",
  "Make it happen — one task at a time.",
  "Progress, not perfection."
];

function getDailyQuote() {
  const day = new Date().getDate(); // 1..31
  return QUOTES[day % QUOTES.length];
}

function showQuoteIfNeeded() {
  const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const closed = localStorage.getItem(QUOTE_CLOSED_KEY);
  if (closed === today) {
    quoteBanner.style.display = 'none';
  } else {
    quoteText.textContent = getDailyQuote();
    quoteBanner.style.display = 'flex';
  }
}
closeQuote.addEventListener('click', () => {
  const today = new Date().toISOString().slice(0,10);
  localStorage.setItem(QUOTE_CLOSED_KEY, today);
  quoteBanner.style.display = 'none';
});

/* ----------------- STORAGE -------------------- */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch(e) {
    tasks = [];
  }
}

/* ----------------- UTIL -------------------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function formatDate(d) {
  if (!d) return 'No due date';
  try { return new Date(d).toLocaleDateString('en-GB'); }
  catch(e) { return d; }
}
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

/* ----------------- RENDER -------------------- */
function renderTasks() {
  const q = searchInput.value.trim().toLowerCase();
  taskListEl.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (activeFilter && activeFilter !== 'All') {
      if (t.category !== activeFilter) return false;
    }
    if (q) {
      return t.text.toLowerCase().includes(q) ||
             t.category.toLowerCase().includes(q) ||
             (t.note && t.note.toLowerCase().includes(q));
    }
    return true;
  });

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.setAttribute('draggable', 'true');
    li.dataset.id = t.id;
    if (t.completed) li.classList.add('completed');

    li.innerHTML = `
      <div class="task-text">
        <strong>${escapeHtml(t.text)}</strong>
        <small>${escapeHtml(t.category)} | ${formatDate(t.dueDate)}</small>
        ${t.note ? `<div class="note-text">${escapeHtml(t.note)}</div>` : ''}
      </div>
      <div class="actions">
        <button class="complete-btn" title="${t.completed ? 'Mark as not done' : 'Mark as complete'}">${t.completed ? '↺' : '✔'}</button>
        <button class="note-btn" title="Edit note">📝</button>
        <button class="delete-btn" title="Delete task">✖</button>
      </div>
    `;

    addDragHandlers(li);
    taskListEl.appendChild(li);
  });

  updateCounters();
}

/* ----------------- COUNTERS -------------------- */
function updateCounters() {
  const pending = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t => t.completed).length;
  pendingCountEl.textContent = `Pending: ${pending}`;
  completedCountEl.textContent = `Completed: ${completed}`;
}

/* ----------------- ADD TASK -------------------- */
addBtn.addEventListener('click', () => {
  const text = document.getElementById('taskInput').value.trim();
  const dueDate = document.getElementById('dueDate').value;
  const category = document.getElementById('category').value;

  if (!text) {
    alert('Please enter a task');
    return;
  }

  const newTask = {
    id: uid(),
    text,
    dueDate: dueDate || '',
    category,
    note: '',
    completed: false
  };

  tasks.unshift(newTask); // newest top
  saveToStorage();
  renderTasks();

  // clear inputs
  document.getElementById('taskInput').value = '';
  document.getElementById('dueDate').value = '';
});

/* ----------------- ACTIONS (delegate) -------------------- */
taskListEl.addEventListener('click', (e) => {
  const btn = e.target;
  const li = btn.closest('li');
  if (!li) return;
  const id = li.dataset.id;

  if (btn.classList.contains('complete-btn')) {
    tasks = tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t);
    saveToStorage();
    renderTasks();
  } else if (btn.classList.contains('delete-btn')) {
    if (confirm('Delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      saveToStorage();
      renderTasks();
    }
  } else if (btn.classList.contains('note-btn')) {
    const task = tasks.find(t => t.id === id);
    const newNote = prompt('Edit note for this task (leave empty to remove):', task.note || '');
    if (newNote !== null) {
      tasks = tasks.map(t => t.id === id ? {...t, note: newNote.trim()} : t);
      saveToStorage();
      renderTasks();
    }
  }
});

/* ----------------- CLEAR ALL -------------------- */
clearAllBtn.addEventListener('click', () => {
  if (!tasks.length) return;
  if (confirm('Clear all tasks?')) {
    tasks = [];
    saveToStorage();
    renderTasks();
  }
});

/* ----------------- SEARCH -------------------- */
searchInput.addEventListener('input', () => renderTasks());

/* ----------------- SIDEBAR -------------------- */
hamburger.addEventListener('click', openSidebar);
closeSidebar.addEventListener('click', closeSidebarFn);
overlay.addEventListener('click', closeSidebarFn);

function openSidebar() {
  sidebar.classList.add('open'); sidebar.setAttribute('aria-hidden','false');
  overlay.classList.add('show');
}
function closeSidebarFn() {
  sidebar.classList.remove('open'); sidebar.setAttribute('aria-hidden','true');
  overlay.classList.remove('show');
}
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    activeFilter = item.dataset.filter || 'All';
    renderTasks();
    closeSidebarFn();
  });
});

/* ----------------- DRAG & DROP -------------------- */
function addDragHandlers(li) {
  li.addEventListener('dragstart', (e) => {
    dragSrcId = li.dataset.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragSrcId); } catch (_) {}
  });

  li.addEventListener('dragend', () => {
    dragSrcId = null;
    li.classList.remove('dragging');
    document.querySelectorAll('.task-list li').forEach(el => el.classList.remove('drag-over'));
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    li.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  });

  li.addEventListener('dragleave', () => {
    li.classList.remove('drag-over');
  });

  li.addEventListener('drop', (e) => {
    e.preventDefault();
    li.classList.remove('drag-over');
    const destId = li.dataset.id;
    const srcId = dragSrcId || e.dataTransfer.getData('text/plain');
    if (!srcId || !destId || srcId === destId) return;

    // reorder tasks: move src item before dest item
    const srcIndex = tasks.findIndex(t => t.id === srcId);
    const destIndex = tasks.findIndex(t => t.id === destId);
    if (srcIndex < 0 || destIndex < 0) return;

    const [moved] = tasks.splice(srcIndex, 1);
    // insert at destIndex (if srcIndex < destIndex, after removal destIndex changes)
    const insertIndex = srcIndex < destIndex ? destIndex : destIndex;
    tasks.splice(insertIndex, 0, moved);

    saveToStorage();
    renderTasks();
  });
}

/* ----------------- INIT -------------------- */
function init() {
  loadFromStorage();
  showQuoteIfNeeded();
  renderTasks();
}
window.addEventListener('load', init);