const App = {
    state: {
        user: null, tasks: [], currentTask: null, subjects: [], openSubjects: [],
        schoolBuilt: [], catalog: [], buildings: [], builtBuildings: [],
        builtCounts: {}, inProgress: [], ownedResources: {}, _qty: 1, _buildTimerInterval: null,
    },

    init() { this.showScreen('welcome'); },

    async startDemo() {
        this.showScreen('loader');
        await this._bootstrap();
    },

    async _bootstrap() {
        let user = JSON.parse(localStorage.getItem('demo_user') || 'null');
        if (!user) {
            user = { id: 1, name: 'Демо-ученик', class: null, sparks: 0, experience_total: 0, school_level: 1, lives: 3, streak_days: 0, rank_code: 'intern', achievements: [], has_phone: true };
            localStorage.setItem('demo_user', JSON.stringify(user));
        }
        try {
            const data = await API.call('init');
            if (!data.success) throw new Error(data.error || 'Ошибка профиля');
            this.state.user = data.user;
            this.state.user.class ? this.go('map') : this.go('class');
        } catch (e) {
            document.getElementById('screen-loader').innerHTML = `<div style="padding:40px;text-align:center;"><div style="font-size:64px;margin-bottom:16px;">😔</div><b>Ошибка</b><p class="subtitle" style="margin-top:8px;">${e.message}</p></div>`;
        }
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById('screen-' + id)?.classList.remove('hidden');
    },

    async go(screen) {
        this.showScreen(screen);
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screen));
        if (screen === 'class')        await this.renderClassSelect();
        if (screen === 'map')          await this.renderMap();
        if (screen === 'school')       await this.renderSchool();
        if (screen === 'map2d')        await this.renderMap2D();
        if (screen === 'shop')         await this.renderShop();
        if (screen === 'development')  await this.renderDevelopment();
        if (screen === 'tasks')        await this.renderTasks();
        if (screen === 'ach')          await this.renderAchievements();
    },

    modal(opts = {}) {
        const { icon = '', glow = 'default', title = '', subtitle = '', amount = null, chips = [], buttons = [{ text: 'ОК', primary: true }], wide = false, html = '' } = opts;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const chipsHtml = chips.length ? `<div>${chips.map(c => `<span class="modal-chip">${c}</span>`).join('')}</div>` : '';
        const buttonsHtml = buttons.map((b, i) => `<button class="modal-btn ${b.primary ? '' : 'btn-secondary'}" data-btn="${i}">${b.text}</button>`).join('');
        overlay.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}"><div class="modal-glow ${glow !== 'default' ? 'glow-' + glow : ''}"></div><div class="modal-content">${icon ? `<div class="modal-icon">${icon}</div>` : ''}${title ? `<div class="modal-title">${title}</div>` : ''}${amount !== null ? `<div class="modal-amount">${amount}</div>` : ''}${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}${chipsHtml}${html}<div class="modal-actions">${buttonsHtml}</div></div></div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        const close = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 250); };
        buttons.forEach((b, i) => { overlay.querySelector(`[data-btn="${i}"]`)?.addEventListener('click', () => { if (b.onClick) b.onClick(); close(); }); });
        if (buttons.length === 1) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        return close;
    },

    showSparksModal(amount, options = {}) {
        const { title = 'Отлично!', subtitle = 'Ещё одно задание выполнено!', bonus = 0, streak = 0, levelUp = null, chips: extraChips = [] } = options;
        const chips = [...extraChips];
        if (bonus > 0) chips.push(`🔥 Бонус за серию: +${bonus}`);
        if (streak > 1) chips.push(`Серия: <b>${streak} дн.</b>`);
        if (levelUp) chips.push(`🏫 Уровень школы: <b>${levelUp}</b>`);
        this.modal({ icon: '<img src="assets/spark.png" alt="">', glow: 'success', title, amount: amount > 0 ? `+${amount}` : null, subtitle, chips, buttons: [{ text: 'Продолжить', primary: true }] });
    },

    showErrorModal(correctOption, explanation) {
        this.modal({ icon: '😔', glow: 'danger', title: 'Неверно', subtitle: explanation || 'Попробуй ещё раз', chips: [`Правильный ответ: <b>${correctOption.toUpperCase()}</b>`], buttons: [{ text: 'Понятно', primary: true }] });
    },

    showError(error) {
        this.modal({ icon: '⚠️', glow: 'danger', title: 'Ошибка', subtitle: error, buttons: [{ text: 'Понятно', primary: true }] });
    },

    showWarning(title, text) {
        this.modal({ icon: '⚠️', glow: 'warning', title, subtitle: text, buttons: [{ text: 'Ок', primary: true }] });
    },

    async renderClassSelect() {
        let selected = null;
        document.querySelectorAll('.class-buttons:not(.disabled) button').forEach(btn => {
            btn.onclick = async () => {
                selected = parseInt(btn.dataset.class);
                document.querySelectorAll('.class-buttons button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                const subjects = await API.loadSubjects();
                const filtered = subjects.filter(s => s.min_class <= selected && s.max_class >= selected);
                document.getElementById('class-subjects').innerHTML = filtered.map(s => `<span class="subject-chip">${s.icon} ${s.title}</span>`).join('');
                document.getElementById('class-preview').classList.remove('hidden');
            };
        });
        document.querySelectorAll('.class-buttons.disabled button').forEach(btn => {
            btn.onclick = () => this.modal({ icon: '🚧', glow: 'warning', title: 'В разработке', subtitle: 'Этот класс ещё не открыт.', buttons: [{ text: 'Понятно', primary: true }] });
        });
        document.getElementById('btn-confirm-class').onclick = async () => {
            if (!selected) { this.showWarning('Выбери класс', 'Сначала нажми на свой класс'); return; }
            await this._doSetClass(selected);
        };
    },

    async _doSetClass(classNum) {
        const r = await API.call('set_class', { class: classNum, confirm: true });
        if (!r.success) { this.showError(r.error); return; }
        const init = await API.call('init');
        this.state.user = init.user;
        this.state.openSubjects = [];
        this.go('map');
    },

    async renderMap() {
        const u = this.state.user;
        document.getElementById('user-name').textContent = u.name;
        document.getElementById('user-class').textContent = u.class ? `${u.class} класс` : '';
        document.getElementById('top-sparks').textContent = u.sparks;
        document.getElementById('top-xp').textContent = u.experience_total || 0;
        document.getElementById('school-xp').textContent = u.experience_total || 0;
        const heartsBox = document.getElementById('top-lives');
        heartsBox.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.className = 'icon-heart';
            span.textContent = i < (u.lives || 0) ? '❤️' : '🤍';
            if (i >= (u.lives || 0)) span.style.opacity = '0.5';
            heartsBox.appendChild(span);
        }
        document.getElementById('school-level').textContent = u.school_level;
        document.getElementById('school-progress-fill').style.width = (u.school_progress || 0) + '%';
        const streakEl = document.getElementById('streak-display');
        if (streakEl) streakEl.textContent = u.streak_days > 0 ? `🔥 Серия: ${u.streak_days} дн.` : '';
        document.querySelectorAll('.nav-item').forEach(btn => { btn.onclick = () => this.go(btn.dataset.screen); });
    },

    async renderSchool() {
        const data = await API.call('get_development');
        if (!data.success) return;
        document.getElementById('school-level-display').textContent = data.level;
        document.getElementById('school-built-count').textContent = data.built.length;
        document.getElementById('school-progress-bar').style.width = Math.min(100, data.built.length * 5) + '%';
    },

    async renderMap2D() {
        const data = await API.call('get_development');
        if (!data.success) return;
        const canvas = document.getElementById('map2d-canvas');
        const GRID = 8; const CELL = 42;
        let html = `<div class="school-grid" style="position:relative;width:${GRID*CELL}px;height:${GRID*CELL}px;margin:0 auto;background: #a4d165;">`;
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                html += `<div style="position:absolute;left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px;border-right:1px dashed rgba(0,0,0,.1);border-bottom:1px dashed rgba(0,0,0,.1);box-sizing:border-box;"></div>`;
            }
        }
        data.built.forEach(b => {
            if (b.code === 'fence') {
                const gridSize = GRID * CELL; const thickness = 8;
                html += `<div class="school-perimeter" style="position:absolute;top:0;left:0;width:${gridSize}px;height:${thickness}px;background:repeating-linear-gradient(90deg,#8B5A2B 0,#8B5A2B 6px,#D2B48C 6px,#D2B48C 12px);z-index:1;"></div>`;
                html += `<div class="school-perimeter" style="position:absolute;bottom:0;left:0;width:${gridSize}px;height:${thickness}px;background:repeating-linear-gradient(90deg,#8B5A2B 0,#8B5A2B 6px,#D2B48C 6px,#D2B48C 12px);z-index:1;"></div>`;
                html += `<div class="school-perimeter" style="position:absolute;top:0;left:0;width:${thickness}px;height:${gridSize}px;background:repeating-linear-gradient(180deg,#8B5A2B 0,#8B5A2B 6px,#D2B48C 6px,#D2B48C 12px);z-index:1;"></div>`;
                html += `<div class="school-perimeter" style="position:absolute;top:0;right:0;width:${thickness}px;height:${gridSize}px;background:repeating-linear-gradient(180deg,#8B5A2B 0,#8B5A2B 6px,#D2B48C 6px,#D2B48C 12px);z-index:1;"></div>`;
            }
        });
        data.built.forEach(b => {
            if (b.x === null || b.y === null || b.code === 'fence') return;
            const w = (b.size_x || 1) * CELL; const h = (b.size_y || 1) * CELL; const isMain = b.code === 'main_school';
            html += `<div class="school-building" style="position:absolute;left:${b.x*CELL+2}px;top:${b.y*CELL+2}px;width:${w-4}px;height:${h-4}px;font-size:${isMain ? '48px' : '24px'};background:${isMain ? '#fff' : 'rgba(255,255,255,0.7)'};box-shadow:${isMain ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'};z-index:2;" title="${b.title}">${b.icon}</div>`;
        });
        if (data.built.length === 0) {
            html += `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:rgba(0,0,0,.5);z-index:5;font-size:13px;"><div style="font-size:48px;margin-bottom:8px;">🏗️</div><b>Пока пусто</b><p style="margin-top:4px;">Построй здание в разделе «Развитие»</p></div>`;
        }
        html += `</div>`;
        canvas.innerHTML = html;
        document.getElementById('map2d-level').textContent = data.level;
        document.getElementById('map2d-built-count').textContent = data.built.length;
        document.getElementById('map2d-progress').style.width = Math.min(100, data.built.length * 5) + '%';
    },

    async renderShop() {
        const data = await API.call('get_shop');
        if (!data.success) return;
        if (typeof data.sparks !== 'undefined') {
            this.state.user.sparks = data.sparks;
            document.getElementById('top-sparks').textContent = data.sparks;
        }
        document.getElementById('shop-sparks').textContent = data.sparks;
        const list = document.getElementById('shop-list');
        list.innerHTML = data.resources.map(r => {
            const owned = data.owned[r.code] || 0;
            const canBuy = data.sparks >= r.price;
            return `<div class="shop-item ${!canBuy ? 'disabled' : ''}"><div class="shop-item-icon">${r.icon}</div><div class="shop-item-info"><b>${r.title}</b><div class="subtitle">У тебя: ${owned} шт.</div></div><button class="shop-item-price" ${!canBuy ? 'disabled' : ''} onclick="App.buyResource('${r.code}', '${r.title}', ${r.price})"><img src="assets/spark.png" alt=""> ${r.price}</button></div>`;
        }).join('');
    },

    buyResource(code, title, price) {
        this.state._qty = 1;
        this.modal({
            icon: '<img src="assets/spark.png" alt="">', glow: 'warning', title: 'Купить ' + title + '?', subtitle: `Цена: ${price} Искр за 1 шт.`,
            html: `<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;"><button class="modal-btn btn-secondary" style="width:auto;padding:10px 20px;margin:0;" onclick="App.state._qty = Math.max(1, App.state._qty - 1); document.getElementById('qty-display').textContent = App.state._qty; document.getElementById('total-price').textContent = App.state._qty * ${price};">−</button><span id="qty-display" style="font-size:24px;font-weight:700;min-width:40px;text-align:center;">1</span><button class="modal-btn btn-secondary" style="width:auto;padding:10px 20px;margin:0;" onclick="App.state._qty++; document.getElementById('qty-display').textContent = App.state._qty; document.getElementById('total-price').textContent = App.state._qty * ${price};">+</button></div><p class="subtitle" style="margin-top:8px;">Итого: <b id="total-price">${price}</b> Искр</p>`,
            buttons: [{ text: 'Отмена', primary: false }, { text: 'Купить', primary: true, onClick: () => this._doBuy(code) }],
        });
    },

    async _doBuy(code) {
        const qty = this.state._qty || 1;
        const r = await API.call('buy_resource', { resource_code: code, qty });
        if (!r.success) { this.showError(r.error); return; }
        this.state.user.sparks = r.sparks_left;
        document.getElementById('top-sparks').textContent = r.sparks_left;
        this.modal({ icon: '✅', glow: 'success', title: 'Куплено!', subtitle: `${r.resource} × ${r.qty}`, chips: [`Осталось Искр: <b>${r.sparks_left}</b>`], buttons: [{ text: 'Ок', primary: true, onClick: () => this.renderShop() }] });
    },

    async renderDevelopment() {
        const data = await API.call('get_development');
        if (!data.success) return;
        const exp = data.exp; const nextExp = data.next_level_exp || exp || 1;
        const progress = nextExp > 0 ? Math.min(100, Math.round(exp / nextExp * 100)) : 100;
        document.getElementById('dev-level-title').textContent = data.level_title;
        document.getElementById('dev-exp').textContent = exp;
        document.getElementById('dev-next-exp').textContent = nextExp;
        document.getElementById('dev-progress').style.width = progress + '%';
        const resEl = document.getElementById('dev-resources');
        const resources = ['wood', 'stone', 'brick'];
        const icons = { wood:'🪵', stone:'🪨', brick:'🧱' };
        const titles = { wood:'Дерево', stone:'Камень', brick:'Кирпич' };
        resEl.innerHTML = resources.map(r => `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bg);border-radius:8px;"><span>${icons[r]}</span><span style="font-size:13px;">${titles[r]}</span><b>${data.owned[r] || 0}</b></div>`).join('');
        this.state.buildings = data.buildings;
        this.state.builtBuildings = data.built.map(b => b.code);
        this.state.builtCounts = data.built_counts || {};
        this.state.inProgress = (data.in_progress || []).map(b => ({ ...b, total_seconds: Math.max(1, b.seconds_left) }));
        this.state.ownedResources = data.owned;
        this._renderBuildings('all');
        this._initDevTabs();
    },

    _initDevTabs() {
        document.querySelectorAll('#screen-development .tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('#screen-development .tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._renderBuildings(btn.dataset.cat);
            };
        });
    },

    _renderBuildings(category) {
        const list = document.getElementById('dev-buildings');
        const buildings = category === 'all' ? this.state.buildings : this.state.buildings.filter(b => b.category === category);
        if (!buildings.length) { list.innerHTML = '<p class="subtitle">В этой категории пока ничего нет</p>'; return; }
        const costIcons = { wood:'🪵', stone:'🪨', brick:'🧱' };
        const builtCounts = this.state.builtCounts || {};
        const inProgressMap = {};
        (this.state.inProgress || []).forEach(b => { if (!inProgressMap[b.code]) inProgressMap[b.code] = []; inProgressMap[b.code].push(b); });
        list.innerHTML = buildings.map(b => {
            const built = builtCounts[b.code] || 0;
            const maxCount = b.max_count !== null ? parseInt(b.max_count) : null;
            const inProg = inProgressMap[b.code] || [];
            const limitReached = maxCount !== null && (built + inProg.length) >= maxCount;
            const canBuild = this._canBuild(b) && !limitReached;
            const costs = ['wood','stone','brick'].filter(r => b['cost_' + r] > 0).map(r => `<span style="font-size:12px;padding:3px 8px;background:var(--bg);border-radius:6px;">${costIcons[r]} ${b['cost_' + r]}</span>`).join('');
            let countText = maxCount === 1 && built > 0 ? ' · <span style="color:var(--success)">✅</span>' : (maxCount !== null ? ` · <b>${built}</b> / ${maxCount}` : ` · построено: <b>${built}</b>`);
            let inProgHtml = inProg.map(ip => `<div class="build-progress" data-instance="${ip.id}"><div class="build-progress-info"><span>⏳ Строится</span><span class="build-timer" data-instance="${ip.id}">${this.formatDuration(ip.seconds_left)}</span></div><div class="progress-bar" style="margin-top:6px;"><div class="progress-fill build-progress-fill" data-instance="${ip.id}" style="width:0%"></div></div></div>`).join('');
            let buttonHtml = limitReached ? `<p class="subtitle" style="color:var(--success);text-align:center;margin-top:8px;">${maxCount === 1 ? '✅ Построено' : '✅ Максимум'}</p>` : `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${costs}</div><button class="btn-primary" style="font-size:14px;padding:10px;" ${canBuild ? '' : 'disabled'} onclick="App.build('${b.code}')">${canBuild ? 'Построить' : 'Не хватает ресурсов'}</button>`;
            return `<div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><span style="font-size:36px;">${b.icon}</span><div style="flex:1;"><b>${b.title}</b><div class="subtitle">Ур. ${b.level_required} · +${b.exp_reward} опыта${countText}</div></div></div>${inProgHtml}${buttonHtml}</div>`;
        }).join('');
        if (Object.keys(inProgressMap).length > 0) this._startBuildTimers();
    },

    _canBuild(building) {
        const owned = this.state.ownedResources || {};
        return ['wood','stone','brick'].every(r => (owned[r] || 0) >= (building['cost_' + r] || 0));
    },

    async build(code) {
        const r = await API.call('build', { building_code: code });
        if (!r.success) { this.showError(r.error); return; }
        await this.renderDevelopment();
        this.modal({ icon: r.building.icon, glow: 'warning', title: 'Строительство начато!', subtitle: r.building.title, chips: [`⏱ Время: ${this.formatDuration(r.seconds)}`, `+${r.exp_reward} опыта`], buttons: [{ text: 'Ок', primary: true }] });
    },

    formatDuration(seconds) {
        seconds = Math.max(0, parseInt(seconds) || 0);
        if (seconds < 60) return `${seconds} сек`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
        if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ч`;
        return `${(seconds / 86400).toFixed(1)} дн`;
    },

    _startBuildTimers() {
        if (this._buildTimerInterval) clearInterval(this._buildTimerInterval);
        const update = async () => {
            let hasReady = false;
            for (const b of (this.state.inProgress || [])) {
                b.seconds_left = Math.max(0, b.seconds_left - 1);
                document.querySelectorAll(`.build-timer[data-instance="${b.id}"]`).forEach(el => el.textContent = App.formatDuration(b.seconds_left));
                const fill = document.querySelector(`.build-progress-fill[data-instance="${b.id}"]`);
                if (fill) fill.style.width = Math.min(100, Math.round((b.total_seconds - b.seconds_left) / b.total_seconds * 100)) + '%';
                if (b.seconds_left <= 0) hasReady = true;
            }
            if (hasReady) { clearInterval(this._buildTimerInterval); this._buildTimerInterval = null; await this._autoFinishBuildings(); }
        };
        this._buildTimerInterval = setInterval(update, 1000);
    },

    async _autoFinishBuildings() {
        for (const b of (this.state.inProgress || []).filter(x => x.seconds_left <= 0)) {
            const r = await API.call('finish_building', { instance_id: b.id });
            if (r.success) {
                this.showSparksModal(0, { title: 'Строительство завершено!', subtitle: r.building.title, chips: [`+${r.exp_gained} опыта`] });
                this.state.user.experience_total = r.experience_total;
                document.getElementById('top-xp').textContent = r.experience_total;
            }
        }
        await this.renderDevelopment();
    },

    async renderTasks() {
        const data = await API.call('get_tasks');
        if (!data.success) { this.showError(data.error || 'Не удалось загрузить задания'); return; }
        if (typeof data.sparks !== 'undefined') { this.state.user.sparks = data.sparks; document.getElementById('top-sparks').textContent = data.sparks; }
        const list = document.getElementById('tasks-list');
        if (!data.subjects?.length) { list.innerHTML = '<p class="subtitle">Для твоего класса пока нет заданий</p>'; return; }
        this.state.subjects = data.subjects;
        const activeSubjects = data.subjects.map((s, idx) => ({ ...s, originalIdx: idx })).filter(s => (s.tasks || []).length > 0);
        if (activeSubjects.length === 0) { list.innerHTML = `<div class="card" style="text-align:center;padding:40px 20px;"><div style="font-size:64px;margin-bottom:16px;">🎉</div><b style="font-size:18px;">Все задания выполнены!</b><p class="subtitle" style="margin-top:8px;">Возвращайся позже — появятся новые задания</p></div>`; return; }
        const existingIndices = activeSubjects.map(s => s.originalIdx);
        this.state.openSubjects = (this.state.openSubjects || []).filter(i => existingIndices.includes(i));
        list.innerHTML = activeSubjects.map((s) => {
            const idx = s.originalIdx; const total = s.total_count || 0; const done = s.done_count || 0; const remaining = s.remaining_total || 0; const progress = total > 0 ? Math.round(done / total * 100) : 0;
            return `<div class="subject-accordion" data-subject-idx="${idx}"><div class="subject-header" onclick="App.toggleSubject(${idx})"><span class="subject-icon">${s.icon}</span><div class="subject-info"><b>${s.title}</b><span class="subtitle">Осталось: <b>${remaining}</b> из ${total}</span></div><div class="subject-progress"><div class="subject-progress-bar"><div class="subject-progress-fill" style="width:${progress}%"></div></div></div><span class="subject-arrow" id="arrow-${idx}">▾</span></div><div class="subject-body hidden" id="subject-body-${idx}">${s.tasks.map(t => `<div class="task-row" onclick="App.openTask(${t.id})"><span class="task-topic">${t.topic}</span><span class="task-reward"><span class="task-plus">+${t.reward}</span><img src="assets/spark.png" class="task-spark" alt=""></span></div>`).join('')}</div></div>`;
        }).join('');
        this._applySubjectState();
    },

    toggleSubject(idx) {
        const open = this.state.openSubjects || [];
        if (open.includes(idx)) this.state.openSubjects = open.filter(i => i !== idx);
        else this.state.openSubjects = [...open, idx];
        this._applySubjectState();
    },

    _applySubjectState() {
        const open = this.state.openSubjects || [];
        document.querySelectorAll('.subject-accordion').forEach(acc => {
            const idx = parseInt(acc.dataset.subjectIdx); const body = acc.querySelector('.subject-body'); const arrow = acc.querySelector('.subject-arrow');
            if (open.includes(idx)) { acc.classList.add('open'); body?.classList.remove('hidden'); if (arrow) arrow.style.transform = 'rotate(180deg)'; }
            else { acc.classList.remove('open'); body?.classList.add('hidden'); if (arrow) arrow.style.transform = 'rotate(0deg)'; }
        });
    },

    openTask(taskId) {
        let task = null;
        this.state.subjects.forEach(s => (s.tasks || []).forEach(t => { if (t.id == taskId) task = t; }));
        if (!task) return;
        this.state.currentTask = task;
        document.getElementById('task-body').innerHTML = `<p class="subtitle">${task.topic}</p><p style="font-size:20px;margin:16px 0;">${task.question}</p>${['a','b','c','d'].map(o => `<button class="option" data-opt="${o}">${o.toUpperCase()}. ${task['option_'+o]}</button>`).join('')}<button class="btn-primary" id="btn-answer" disabled>Ответить</button>`;
        document.querySelectorAll('.option').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('btn-answer').disabled = false;
            };
        });
        document.getElementById('btn-answer').onclick = () => this.submitAnswer();
        this.go('task');
    },

    async submitAnswer() {
        const sel = document.querySelector('.option.selected');
        if (!sel) return;
        const r = await API.call('complete_task', { task_id: this.state.currentTask.id, answer: sel.dataset.opt });
        if (!r.success) { this.showError(r.error); return; }
        if (typeof r.sparks !== 'undefined') { this.state.user.sparks = r.sparks; document.getElementById('top-sparks').textContent = r.sparks; }
        if (r.is_correct) {
            this.showSparksModal(r.reward, { title: 'Отлично!', subtitle: 'Ещё одно задание выполнено!', bonus: r.streak_bonus || 0, streak: r.streak || 0, levelUp: r.level_up || null });
        } else {
            this.showErrorModal(r.correct_option, r.explanation);
        }
        const waitClose = setInterval(() => {
            if (!document.querySelector('.modal-overlay')) { clearInterval(waitClose); this.go('tasks'); }
        }, 200);
    },

    async renderAchievements() {
        const [achData, expData] = await Promise.all([API.call('get_achievements'), API.call('get_experience')]);
        const ranks = { intern:'🌱 Стажёр', znatok:'📚 Знаток', aktivist:'🏫 Активист', lider:'⭐ Лидер', legend:'👑 Легенда школы' };
        let html = `<div class="card accent"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;"><div><b>Твой статус</b><div class="subtitle">${ranks[achData.rank] || achData.rank}</div></div><div style="text-align:right;display:flex;align-items:center;gap:8px;"><img src="assets/xp.png" style="width:36px;height:36px;object-fit:contain;"><div><b style="font-size:22px;color:var(--max-blue);">${expData.experience_total}</b><div class="subtitle">Опыт за всё время</div></div></div></div></div>`;
        if (!achData.achievements.length) html += '<p class="subtitle" style="text-align:center;padding:20px;">🏆 В демо-версии достижения недоступны</p>';
        document.getElementById('ach-list').innerHTML = html;
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
