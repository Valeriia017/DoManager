// ---- БАЗОВІ НАЛАШТУВАННЯ ТА ЗМІННІ СТАНУ ----

// Перевіряю, чи авторизований зараз користувач (значення приходить з C#)
const IS_AUTH = window.KanbanConfig.isAuth;

// Задаю свою фірмову палітру кольорів для карток завдань
const TASK_COLORS = ['#0D61E5', '#7E4BE8', '#0ABAC7', '#D43FB5', '#E4A00F'];

// Мої стандартні назви колонок при першому вході
const DEFAULT_NAMES = { 'col-draft': 'Чернетка', 'col-inprogress': 'В процесі', 'col-editing': 'Редагування', 'col-done': 'Готово' };
const SCROLL_IDS = { 'col-draft': 'scroll-draft', 'col-inprogress': 'scroll-inprogress', 'col-editing': 'scroll-editing', 'col-done': 'scroll-done' };

// Формую унікальний ключ для LocalStorage. Якщо юзер увійшов — дані зберігаються під його поштою, щоб не плутались з іншими.
const userEmail = '@userEmail';
const LS_KEY = userEmail ? `kanban_state_${userEmail}` : 'kanban_state_guest';

// Змінні, в яких я тимчасово тримаю відкрите завдання, плани, файли та лічильники ID
let currentTaskEl = null;
let currentPlanEl = null;
let commentsVisible = true;
let currentAttachments = [];
let boardIdCounter = Date.now();
let taskIdCounter = Date.now() + 1000;


// ---- ЗБЕРЕЖЕННЯ ТА ЗАВАНТАЖЕННЯ ДАНИХ (LOCAL STORAGE) ----

// Функція debounce потрібна мені, щоб не зберігати дані на кожну введену літеру, а робити це з невеликою затримкою (оптимізація)
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Моя головна функція збереження. Вона збирає всі колонки, витягує з них усі завдання 
// (кольори, описи, файли, коменти) і пакує в один JSON об'єкт, який я кладу в пам'ять браузера.
function actualSaveState() {
    const state = { boards: [], plans: [] };
    Object.keys(DEFAULT_NAMES).forEach(colId => {
        const scroll = document.getElementById(SCROLL_IDS[colId]);
        if (!scroll) return;
        scroll.querySelectorAll('.board').forEach(board => {
            const boardData = {
                id: board.id,
                col: colId,
                name: board.querySelector('.board-name').value,
                tasks: []
            };
            board.querySelectorAll('.task-item').forEach(task => {
                boardData.tasks.push({
                    id: task.id,
                    name: task.querySelector('.task-name-span').textContent.trim(),
                    color: task.dataset.color || '#7E4BE8',
                    done: task.dataset.done || 'false',
                    desc: task.dataset.desc || '',
                    comments: JSON.parse(task.dataset.comments || '[]'),
                    attachments: JSON.parse(task.dataset.attachments || '[]')
                });
            });
            state.boards.push(boardData);
        });
    });

    // Також зберігаю мій розклад з правої панелі
    document.querySelectorAll('.plan-block').forEach(block => {
        state.plans.push(JSON.parse(block.dataset.plan));
    });

    try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
        alert('Помилка пам\'яті: неможливо зберегти дані. Зменште розмір вкладень.');
        console.error('LocalStorage quota exceeded', e);
    }
}

// Версія для вводу тексту (з затримкою) і версія для миттєвого збереження (при кліках)
const saveStateDebounced = debounce(actualSaveState, 500);
const saveState = actualSaveState;

// Коли сторінка відкривається, ця функція дістає мої дані з пам'яті і малює дошку
function loadState() {
    Object.keys(DEFAULT_NAMES).forEach(colId => {
        const scroll = document.getElementById(SCROLL_IDS[colId]);
        if (scroll) scroll.innerHTML = '';
    });

    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;

    let state;
    try { state = JSON.parse(raw); } catch (e) { return false; }

    const isAuthenticated = window.KanbanConfig.isAuth;

    // Спочатку малюю самі колонки, а якщо я авторизована — то розставляю в них збережені завдання
    if (state.boards && state.boards.length > 0) {
        state.boards.forEach(boardData => {
            const scroll = document.getElementById(SCROLL_IDS[boardData.col]);
            if (!scroll) return;

            const board = createBoard(scroll, boardData.name, boardData.id);

            if (isAuthenticated) {
                boardData.tasks.forEach(taskData => {
                    addTask(board, taskData.name, {
                        id: taskData.id,
                        color: taskData.color,
                        done: taskData.done,
                        desc: taskData.desc,
                        comments: taskData.comments,
                        attachments: taskData.attachments || []
                    });
                });
            }
        });
    }

    // Завантаження розкладу
    if (isAuthenticated && state.plans && state.plans.length > 0) {
        state.plans.forEach(planData => { createPlanBlock(planData); });
    }

    return true;
}


// ---- ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ ----

document.addEventListener('DOMContentLoaded', () => {
    // Підключаю поліфіл для мобільних пристроїв, щоб Drag&Drop працював на сенсорах
    MobileDragDrop.polyfill({
        dragImageTranslateOverride: MobileDragDrop.scrollBehaviourDragImageTranslateOverride
    });
    window.addEventListener('touchmove', function () { }, { passive: false });

    // Завантажую збережене. Якщо пам'ять порожня — створюю чисті 4 базові колонки
    const restored = loadState();
    if (!restored) {
        Object.keys(DEFAULT_NAMES).forEach(colId => {
            const scrollElement = document.getElementById(SCROLL_IDS[colId]);
            if (scrollElement) createBoard(scrollElement, DEFAULT_NAMES[colId]);
        });
        saveState();
    }

    // Додаю можливість відправляти коментар клавішею Enter
    const commentInput = document.getElementById('newCommentInput');
    if (commentInput) {
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addComment();
        });
    }
});


// ----  ЗАХИСТ ТА АВТОРИЗАЦІЯ ----

// Моя захисна функція: якщо користувач намагається щось створити, але не увійшов,
// я блокую дію і показую йому модалку з проханням авторизуватись.
function guardAction(fn) {
    if (!IS_AUTH) {
        document.getElementById('authModal').style.display = 'flex';
        return;
    }
    fn();
}

function closeAuthOutside(e) {
    if (e.target === document.getElementById('authModal'))
        document.getElementById('authModal').style.display = 'none';
}


// ---- СТВОРЕННЯ ТА УПРАВЛІННЯ ДОШКАМИ (КОЛОНКАМИ) ----

// Функція програмно створює нову колонку, генерує для неї HTML і вішає логіку Drag&Drop
function createBoard(scroll, name, forcedId) {
    const id = forcedId || ('board-' + (++boardIdCounter));
    const board = document.createElement('div');
    board.className = 'board';
    board.id = id;
    board.dataset.col = scroll.id.replace('scroll-', 'col-');

    board.innerHTML = `
            <div class="board-header">
            <input class="board-name"
            type="text"
            value="${escHtml(name)}"
            title="Клікніть щоб змінити назву"
            onfocus="this.style.boxShadow='0 2px 0 0 #D4B1FF'"
            onblur="this.style.boxShadow=''; if(!this.value.trim()) this.value='Без назви'; saveState();"
            oninput="saveStateDebounced()">
            <div class="board-actions">
            <button class="add-board-btn" title="Додати дошку поруч" onclick="handleAddBoard(event, this)">+</button>
            <button class="delete-board-btn" title="Видалити дошку" onclick="handleDeleteBoard(event, this)">✕</button>
            </div>
            </div>

            <div class="task-input-wrap" style="margin-top: 8px; display: none;">
            <input class="task-input" type="text" placeholder="Введіть назву..." onkeydown="handleTaskKey(event, this)" onblur="handleTaskBlur(this)">
            </div>

            <button class="add-task-btn" onclick="handleAddTaskClick(event, this)">+ Додати завдання</button>
            `;

    // Тут я вказую, як колонка має реагувати, коли над нею перетягують завдання
    board.addEventListener('dragover', e => {
        e.preventDefault();
        board.classList.add('drag-over');
    });

    board.addEventListener('dragleave', e => {
        if (!board.contains(e.relatedTarget)) board.classList.remove('drag-over');
    });

    // Обробляю "кидання" завдання в колонку
    board.addEventListener('drop', e => {
        e.preventDefault();
        board.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const taskEl = document.getElementById(taskId);
        if (taskEl) {
            board.insertBefore(taskEl, board.querySelector('.task-input-wrap'));
            saveState();
        }
    });

    scroll.appendChild(board);
    return board;
}

// Логіка кнопок у шапці колонки (додати нову або видалити)
function handleAddBoard(e, btn) {
    e.stopPropagation();
    guardAction(() => {
        const colId = btn.closest('.board').dataset.col;
        const scroll = document.getElementById(SCROLL_IDS[colId]);
        createBoard(scroll, DEFAULT_NAMES[colId] || 'Дошка');
        saveState();
    });
}

function closeDeleteBoardOutside(e) {
    if (e.target.id === 'deleteBoardConfirmModal') {
        closeDeleteBoardModal();
    }
}

// Перед видаленням колонки я зберігаю її в змінну і показую вікно підтвердження
function handleDeleteBoard(e, btn) {
    e.stopPropagation();
    window.boardElementToDelete = btn.closest('.board');
    const modal = document.getElementById('deleteBoardConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeDeleteBoardModal() {
    const modal = document.getElementById('deleteBoardConfirmModal');
    if (modal) modal.style.display = 'none';
    window.boardElementToDelete = null;
}

// Якщо видалення підтверджено — фізично прибираю колонку з екрана і зберігаю стан
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmDeleteBoardBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (window.boardElementToDelete) {
                window.boardElementToDelete.remove();
                saveState();
                closeDeleteBoardModal();
            }
        };
    }
});


// ---- УПРАВЛІННЯ ПОЛЕМ ВВОДУ НОВОГО ЗАВДАННЯ ----

// При кліку на "+ Додати завдання" я показую фіолетове поле і ставлю в нього курсор
function handleAddTaskClick(e, btn) {
    e.stopPropagation();
    guardAction(() => {
        const wrap = btn.closest('.board').querySelector('.task-input-wrap');
        if (wrap) {
            wrap.style.display = 'block';
            wrap.classList.add('visible');
            wrap.querySelector('.task-input').focus();
        }
    });
}

// Обробляю натискання клавіш у полі вводу
function handleTaskKey(e, input) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const name = input.value.trim();
        const wrap = input.closest('.task-input-wrap');

        if (name) {
            // Створюю картку, зберігаю стан і відправляю сигнал в Аналітику адміна
            addTask(input.closest('.board'), name);
            saveState();

            // ОСЬ ГОЛОВНА ЗМІНА: Знаходимо колонку (наприклад, col-editing)
            const colId = input.closest('.board').dataset.col;
            // І передаємо її на сервер
            try { sendStatisticIncrement("create", colId); } catch (err) { }
        }

        // Миттєво очищаю текст і залізобетонно ховаю поле
        input.value = '';
        if (wrap) {
            wrap.classList.remove('visible');
            wrap.style.display = 'none';
        }
        input.blur();
    }
    if (e.key === 'Escape') {
        input.value = '';
        const wrap = input.closest('.task-input-wrap');
        if (wrap) {
            wrap.classList.remove('visible');
            wrap.style.display = 'none';
        }
        input.blur();
    }
}

// Якщо клікнули повз поле — воно автоматично згортається
function handleTaskBlur(input) {
    setTimeout(() => {
        input.value = '';
        const wrap = input.closest('.task-input-wrap');
        if (wrap) {
            wrap.classList.remove('visible');
            wrap.style.display = 'none';
        }
    }, 150);
}


// ----  СТВОРЕННЯ ТА ЛОГІКА САМОЇ КАРТКИ ЗАВДАННЯ ----

// Моя функція створення картки. Призначаю випадковий колір, генерую HTML
function addTask(board, name, opts = {}) {
    const color = opts.color || TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)];
    const id = opts.id || ('task-' + (++taskIdCounter));

    const task = document.createElement('div');
    task.className = 'task-item';
    task.id = id;
    task.draggable = true;
    task.style.background = color;

    // Клік по картці відкриває модальне вікно редагування
    task.onclick = function () {
        openTaskModal(this);
    };

    // Записую всі дані картки в data-атрибути
    task.dataset.color = color;
    task.dataset.desc = opts.desc || '';
    task.dataset.comments = JSON.stringify(opts.comments || []);
    task.dataset.attachments = JSON.stringify(opts.attachments || []);
    task.dataset.done = opts.done || 'false';

    task.innerHTML = `
                <div class="task-check-wrap">
                    <button class="task-check-btn" onclick="toggleCheck(event, this)" title="Позначити як виконане"></button>
                </div>
                <span class="task-name-span">
                    ${escHtml(name)}
                </span>
               <button class="task-delete-quick" onclick="handleDeleteTaskQuick(event, this)" title="Видалити завдання">
               <i class="bi bi-x-lg"></i>
               </button>
            `;

    // Якщо воно було виконане раніше — малюю галочку
    if (opts.done === 'true') {
        const btn = task.querySelector('.task-check-btn');
        btn.classList.add('checked');
        btn.innerHTML = '✓';
    }

    // Додаю ефекти напівпрозорості під час перетягування картки мишкою
    task.addEventListener('dragstart', e => {
        task.classList.add('dragging');
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    });

    task.addEventListener('dragend', () => task.classList.remove('dragging'));

    board.insertBefore(task, board.querySelector('.task-input-wrap'));
    return task;
}

// Швидке видалення картки по кліку на хрестик (без модалок)
function handleDeleteTaskQuick(e, btn) {
    e.stopPropagation();
    guardAction(() => {
        btn.closest('.task-item').remove();
        saveState();
    });
}

// Клік по галочці "Виконано". Тут я змінюю статус і кидаю сигнал в Аналітику адміна
function toggleCheck(e, btn) {
    e.stopPropagation();
    const task = btn.closest('.task-item');
    btn.classList.toggle('checked');
    btn.innerHTML = btn.classList.contains('checked') ? '✓' : '';
    task.dataset.done = btn.classList.contains('checked') ? 'true' : 'false';
    saveState();

    if (btn.classList.contains('checked')) {
        try { sendStatisticIncrement("complete"); } catch (err) { }
    }
}


// ----  МОДАЛЬНЕ ВІКНО ДЕТАЛЬНОГО РЕДАГУВАННЯ ЗАВДАННЯ ----

function openTaskModal(taskEl) {
    guardAction(() => {
        currentTaskEl = taskEl;
        document.getElementById('taskModalName').value = taskEl.querySelector('.task-name-span').textContent.trim();

        // Використовую DOMPurify для захисту від хакерських скриптів (XSS) у тексті опису
        const safeDesc = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(taskEl.dataset.desc || '') : taskEl.dataset.desc;
        document.getElementById('taskDescEditor').innerHTML = safeDesc;

        // Розгортаю збережені файли і коментарі
        currentAttachments = JSON.parse(taskEl.dataset.attachments || '[]');
        renderAttachments();

        const comments = JSON.parse(taskEl.dataset.comments || '[]');
        renderComments(comments);
        document.getElementById('commentCount').textContent = `(${comments.length})`;

        commentsVisible = true;
        document.getElementById('commentsBody').style.display = '';
        document.getElementById('commentArrow').textContent = '▼';
        document.getElementById('commentArrow').style.transform = '';

        document.getElementById('taskModal').style.display = 'flex';
    });
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentTaskEl = null;
    currentAttachments = [];
    document.getElementById('newCommentInput').value = '';
    document.getElementById('taskDescEditor').innerHTML = '';
    document.getElementById('attachmentsList').innerHTML = '';
    document.getElementById('attachmentsSection').style.display = 'none';
}

function closeTaskOutside(e) {
    if (e.target === document.getElementById('taskModal')) closeTaskModal();
}

function saveTaskModal() {
    if (!currentTaskEl) return;
    const name = document.getElementById('taskModalName').value.trim();
    if (!name) return;

    // Зберігаю нові дані назад у DOM-елемент картки
    currentTaskEl.querySelector('.task-name-span').textContent = name;

    const rawDesc = document.getElementById('taskDescEditor').innerHTML;
    currentTaskEl.dataset.desc = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawDesc) : rawDesc;

    currentTaskEl.dataset.attachments = JSON.stringify(currentAttachments);

    const comments = Array.from(document.querySelectorAll('#commentsList .comment-text-span')).map(c => c.textContent);
    currentTaskEl.dataset.comments = JSON.stringify(comments);
    document.getElementById('commentCount').textContent = `(${comments.length})`;

    closeTaskModal();
    saveState();
}

function deleteCurrentTask() {
    if (currentTaskEl) currentTaskEl.remove();
    closeTaskModal();
    saveState();
}

// Міні-редактор тексту (робить жирний шрифт, курсив і т.д.)
function fmtText(cmd) {
    document.getElementById('taskDescEditor').focus();
    document.execCommand(cmd, false, null);
}


// ----  РОБОТА З ФАЙЛАМИ ТА КАРТИНКАМИ ----

// Моя логіка стиснення: оскільки LocalStorage має ліміт пам'яті (5МБ), 
// я пропускаю всі картинки через Canvas і зменшую їх якість, перш ніж зберігати
function compressImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Обробка файлів, які вибрав користувач (розділяю на картинки і документи)
function handleFileAttach(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            compressImage(file, 800, 800, function (compressedDataUrl) {
                currentAttachments.push({ name: file.name, dataUrl: compressedDataUrl, isImage: true });
                renderAttachments();
            });
        } else {
            currentAttachments.push({ name: file.name, dataUrl: null, isImage: false });
            renderAttachments();
        }
    });
    e.target.value = '';
}

// Малюю красиві плашки прикріплених файлів у модальному вікні
function renderAttachments() {
    const section = document.getElementById('attachmentsSection');
    const list = document.getElementById('attachmentsList');
    if (currentAttachments.length === 0) {
        section.style.display = 'none';
        list.innerHTML = '';
        return;
    }
    section.style.display = 'block';
    list.innerHTML = currentAttachments.map((att, idx) => {
        if (att.isImage && att.dataUrl) {
            return `
                        <div class="attach-card">
                            <div class="attach-thumb" style="background-image: url('${att.dataUrl}')"></div>
                            <div class="attach-info">
                                <span class="attach-name" title="${escHtml(att.name)}">${escHtml(att.name)}</span>
                                <button class="attach-remove" onclick="removeAttachment(${idx})" title="Видалити">✕</button>
                            </div>
                        </div>
                    `;
        } else {
            const ext = att.name.split('.').pop().substring(0, 4);
            return `
                        <div class="attach-card">
                            <div class="attach-thumb">📎 <span class="file-ext">${escHtml(ext)}</span></div>
                            <div class="attach-info">
                                <span class="attach-name" title="${escHtml(att.name)}">${escHtml(att.name)}</span>
                                <button class="attach-remove" onclick="removeAttachment(${idx})" title="Видалити">✕</button>
                            </div>
                        </div>
                    `;
        }
    }).join('');
}

function removeAttachment(idx) {
    currentAttachments.splice(idx, 1);
    renderAttachments();
}


// ---- СИСТЕМА КОМЕНТАРІВ ----

function toggleComments() {
    commentsVisible = !commentsVisible;
    document.getElementById('commentsBody').style.display = commentsVisible ? '' : 'none';
    document.getElementById('commentArrow').textContent = commentsVisible ? '▼' : '▶';
    document.getElementById('commentArrow').style.transform = commentsVisible ? '' : 'rotate(-90deg)';
}

function renderComments(comments) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    comments.forEach((c, idx) => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
                    <span class="comment-text-span">${escHtml(c)}</span>
                    <button class="comment-del-btn" onclick="deleteComment(${idx})" title="Видалити коментар">✕</button>
                `;
        list.appendChild(div);
    });
}

function addComment() {
    const input = document.getElementById('newCommentInput');
    const text = input.value.trim();
    if (!text) return;

    const comments = Array.from(document.querySelectorAll('#commentsList .comment-text-span')).map(c => c.textContent);
    comments.push(text);
    renderComments(comments);
    input.value = '';
    document.getElementById('commentCount').textContent = `(${comments.length})`;
}

function deleteComment(idx) {
    const comments = Array.from(document.querySelectorAll('#commentsList .comment-text-span')).map(c => c.textContent);
    comments.splice(idx, 1);
    renderComments(comments);
    document.getElementById('commentCount').textContent = `(${comments.length})`;
}


// ---- ПАНЕЛЬ ПЛАНУВАННЯ РОЗКЛАДУ (ПРАВА КОЛОНКА) ----

function openPlanModal(planEl) {
    guardAction(() => {
        currentPlanEl = planEl;
        // Заповнюю поля, якщо редагуємо існуючий план, або чищу, якщо створюємо новий
        if (planEl) {
            const data = JSON.parse(planEl.dataset.plan);
            document.getElementById('planStart').value = data.start;
            document.getElementById('planEnd').value = data.end;
            document.getElementById('planDesc').value = data.desc;
            document.getElementById('planDeleteBtn').style.display = '';
            document.getElementById('planSaveBtn').textContent = 'Зберегти';
        } else {
            document.getElementById('planStart').value = '';
            document.getElementById('planEnd').value = '';
            document.getElementById('planDesc').value = '';
            document.getElementById('planDeleteBtn').style.display = 'none';
            document.getElementById('planSaveBtn').textContent = 'Додати';
        }
        document.getElementById('planModal').style.display = 'flex';
    });
}

function closePlanModal() {
    document.getElementById('planModal').style.display = 'none';
    currentPlanEl = null;
}

function closePlanOutside(e) {
    if (e.target === document.getElementById('planModal')) closePlanModal();
}

function savePlan() {
    const start = document.getElementById('planStart').value;
    const end = document.getElementById('planEnd').value;
    const desc = document.getElementById('planDesc').value.trim();

    if (!start || !end) {
        document.getElementById('planStart').focus();
        return;
    }

    const planData = { start, end, desc };

    if (currentPlanEl) {
        currentPlanEl.dataset.plan = JSON.stringify(planData);
        updatePlanBlockText(currentPlanEl, planData);
    } else {
        createPlanBlock(planData);
    }

    closePlanModal();
    saveState();
}

function createPlanBlock(planData) {
    const board = document.getElementById('planBoard');
    const addBtn = board.querySelector('.add-plan-btn');

    const block = document.createElement('div');
    block.className = 'plan-block';
    block.dataset.plan = JSON.stringify(planData);
    updatePlanBlockText(block, planData);

    block.onclick = () => openPlanModal(block);
    board.insertBefore(block, addBtn);
    return block;
}

function updatePlanBlockText(block, planData) {
    const timeStr = `${planData.start} – ${planData.end}`;
    const descStr = planData.desc ? planData.desc : '';

    block.innerHTML = `
            <span class="plan-time">${escHtml(timeStr)}</span>
            <span class="plan-desc-text">${escHtml(descStr)}</span>
            `;
}

function deletePlan() {
    if (currentPlanEl) currentPlanEl.remove();
    closePlanModal();
    saveState();
}


// ---- ДОПОМІЖНІ УТИЛІТИ ТА АНАЛІТИКА ----

// Функція для екранування тексту. Вона перетворює теги на безпечні символи, щоб ніхто не міг зламати верстку
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Ця функція тихо (в фоні) відправляє сигнал на сервер для Аналітики адміна.
// Передаю туди тільки сухі цифри (наприклад, +1 до створених), щоб зберігти повну приватність тексту користувача.
function sendStatisticIncrement(actionType, columnId = "") {
    fetch('/Admin/IncrementTaskStat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: actionType, column: columnId })
    })
        .then(response => {
            if (response.ok) console.log("Статистика оновлена:", actionType, columnId);
        })
        .catch(error => console.warn("Не вдалося оновити статистику:", error));
}