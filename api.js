// api.js — демо-версия: localStorage + CSV + JSON
const API = {
    _tasks: null, _subjects: null, _buildings: null, _shop: null,

    async loadTasks() {
        if (this._tasks) return this._tasks;
        const csv = await fetch('data/tasks.csv', { cache: 'no-store' }).then(r => r.text());
        this._tasks = this._parseCSV(csv);
        console.log("Загружено заданий:", this._tasks.length);
        return this._tasks;
    },
    async loadSubjects() {
        if (this._subjects) return this._subjects;
        this._subjects = await fetch('data/subjects.json').then(r => r.json());
        return this._subjects;
    },
    async loadBuildings() {
        if (this._buildings) return this._buildings;
        this._buildings = await fetch('data/buildings.json').then(r => r.json());
        return this._buildings;
    },
    async loadShop() {
        if (this._shop) return this._shop;
        this._shop = await fetch('data/shop.json').then(r => r.json());
        return this._shop;
    },

    _parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        const headerLine = this._parseLine(lines[0]);
        const header = headerLine.map(h => h.replace(/^"|"$/g, ''));

        return lines.slice(1).filter(line => line.trim()).map(line => {
            const cells = this._parseLine(line);
            const obj = {};
            header.forEach((h, i) => {
                let val = cells[i] || '';
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1).replace(/""/g, '"');
                }
                obj[h] = val;
            });
            ['id','subject_id','class_num','reward','is_active'].forEach(k => {
                if (obj[k] !== undefined) obj[k] = parseInt(obj[k], 10);
            });
            return obj;
        });
    },

    _parseLine(line) {
        const out = []; let cur = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) { out.push(cur); cur = ''; }
            else cur += c;
        }
        out.push(cur); return out;
    },

    async call(action, data = {}) {
        const user = JSON.parse(localStorage.getItem('demo_user') || 'null');
        const tasksDone = JSON.parse(localStorage.getItem('demo_done') || '{}');
        const ownedRes = JSON.parse(localStorage.getItem('demo_resources') || '{}');
        const builtList = JSON.parse(localStorage.getItem('demo_built') || '[]');

        switch (action) {
            case 'init': return { success: true, user: { ...user, sparks: user.sparks ?? 0, experience_total: user.experience_total ?? 0, school_level: user.school_level ?? 1, lives: 3, has_phone: true } };

            case 'set_class': {
                const updated = { ...user, class: parseInt(data.class, 10) };
                localStorage.setItem('demo_user', JSON.stringify(updated));
                return { success: true, class: updated.class };
            }

            case 'get_tasks': {
                const cls = user?.class;
                if (!cls) return { success: false, error: 'Класс не выбран' };
                const all = await this.loadTasks();
                const subjects = await this.loadSubjects();

                const filtered = subjects.filter(s => s.min_class <= cls && s.max_class >= cls);

                const grouped = filtered.map(s => {
                    // ВАЖНО: здесь добавлено || Number(t.class_num) === 0 (для всех классов)
                    const subjTasks = all.filter(t =>
                        Number(t.subject_id) === Number(s.id) &&
                        (Number(t.class_num) === Number(cls) || Number(t.class_num) === 0) &&
                        Number(t.is_active) === 1
                    );

                    const doneIds = Object.keys(tasksDone).map(Number);
                    const uncompleted = subjTasks.filter(t => !doneIds.includes(Number(t.id)));

                    return {
                        id: s.id, code: s.code, title: s.title, icon: s.icon,
                        done_count: subjTasks.length - uncompleted.length,
                        total_count: subjTasks.length,
                        remaining_total: uncompleted.length,
                        tasks: uncompleted.slice(0, 4).map(t => ({ ...t, completed: 0 })),
                        all_done: uncompleted.length === 0
                    };
                });
                return { success: true, class: cls, sparks: user.sparks ?? 0, subjects: grouped };
            }

            case 'complete_task': {
                const taskId = parseInt(data.task_id, 10);
                const all = await this.loadTasks();
                const task = all.find(t => Number(t.id) === taskId);
                if (!task || tasksDone[taskId]) return { success: false, error: 'Ошибка' };
                const isCorrect = (data.answer || '').toLowerCase() === task.correct_option.toLowerCase();
                const reward = isCorrect ? Number(task.reward) : 0;
                tasksDone[taskId] = { is_correct: isCorrect };
                localStorage.setItem('demo_done', JSON.stringify(tasksDone));
                const u = { ...user, sparks: (user.sparks ?? 0) + reward, experience_total: (user.experience_total ?? 0) + (isCorrect ? 5 : 0) };
                localStorage.setItem('demo_user', JSON.stringify(u));
                return { success: true, is_correct: isCorrect, correct_option: task.correct_option, explanation: task.explanation, reward, sparks: u.sparks, streak: 1, streak_bonus: 0, level_up: null };
            }

            case 'get_shop': {
                const shop = await this.loadShop();
                return { success: true, sparks: user.sparks ?? 0, resources: shop, owned: ownedRes };
            }

            case 'buy_resource': {
                const shop = await this.loadShop();
                const res = shop.find(r => r.code === data.resource_code);
                const qty = data.qty || 1;
                const total = res.price * qty;
                if ((user.sparks ?? 0) < total) return { success: false, error: 'Мало Искр' };
                user.sparks -= total;
                localStorage.setItem('demo_user', JSON.stringify(user));
                ownedRes[res.code] = (ownedRes[res.code] || 0) + qty;
                localStorage.setItem('demo_resources', JSON.stringify(ownedRes));
                return { success: true, sparks_left: user.sparks, resource: res.title, qty };
            }

            case 'get_development': {
                const buildings = await this.loadBuildings();
                const now = Date.now();

                if (builtList.length === 0) {
                    builtList.push({ id: 1, code: "main_school", title: "Главное здание", icon: "🏫", is_ready: true, ready_at: now, exp_reward: 100, x: 2, y: 2, size_x: 3, size_y: 3 });
                    builtList.push({ id: 2, code: "gate", title: "Ворота", icon: "🚪", is_ready: true, ready_at: now, exp_reward: 20, x: 4, y: 7, size_x: 1, size_y: 1 });
                    localStorage.setItem('demo_built', JSON.stringify(builtList));
                }

                let builtChanged = false;
                builtList.forEach(b => {
                    if (!b.is_ready && b.ready_at <= now) { b.is_ready = true; builtChanged = true; }
                });
                if (builtChanged) localStorage.setItem('demo_built', JSON.stringify(builtList));

                const builtCounts = {};
                builtList.filter(b => b.is_ready).forEach(b => builtCounts[b.code] = (builtCounts[b.code] || 0) + 1);

                return {
                    success: true, level: user.school_level ?? 1, level_title: `Школа (Ур. ${user.school_level ?? 1})`,
                    exp: user.experience_total ?? 0, next_level_exp: (user.school_level ?? 1) * 100,
                    owned: ownedRes, built: builtList.filter(b => b.is_ready).map(b => ({...b, id: b.id})),
                    built_counts: builtCounts,
                    in_progress: builtList.filter(b => !b.is_ready).map(b => ({ ...b, seconds_left: Math.floor((b.ready_at - now) / 1000) })),
                    buildings: buildings,
                    experience_total: user.experience_total ?? 0,
                };
            }

            case 'build': {
                const buildings = await this.loadBuildings();
                const bld = buildings.find(b => b.code === data.building_code);
                if (!bld) return { success: false, error: 'Здание не найдено' };

                for (const res in bld) {
                    if (res.startsWith('cost_') && bld[res] > 0) {
                        const code = res.replace('cost_', '');
                        if ((ownedRes[code] || 0) < bld[res]) return { success: false, error: `Не хватает: ${code}` };
                    }
                }
                for (const res in bld) {
                    if (res.startsWith('cost_') && bld[res] > 0) {
                        const code = res.replace('cost_', '');
                        ownedRes[code] -= bld[res];
                    }
                }
                localStorage.setItem('demo_resources', JSON.stringify(ownedRes));

                const seconds = bld.exp_reward * 2;
                const newB = { id: Date.now(), code: bld.code, title: bld.title, icon: bld.icon, is_ready: false, ready_at: Date.now() + (seconds * 1000), exp_reward: bld.exp_reward, x: Math.floor(Math.random() * 5), y: Math.floor(Math.random() * 5) };
                builtList.push(newB);
                localStorage.setItem('demo_built', JSON.stringify(builtList));

                return { success: true, building: bld, seconds, exp_reward: bld.exp_reward };
            }

            case 'finish_building': {
                const b = builtList.find(x => x.id === data.instance_id);
                if (!b || b.is_ready) return { success: false, error: 'Уже готово' };
                b.is_ready = true;
                localStorage.setItem('demo_built', JSON.stringify(builtList));
                const newExp = (user.experience_total ?? 0) + b.exp_reward;
                user.experience_total = newExp;
                localStorage.setItem('demo_user', JSON.stringify(user));
                return { success: true, building: b, exp_gained: b.exp_reward, new_exp: newExp, experience_total: newExp };
            }

            case 'get_achievements': return { success: true, achievements: [], rank: 'intern', total: 0 };
            case 'get_experience': return { success: true, experience: 0, experience_total: user.experience_total ?? 0, quarters: [] };
            default: return { success: false, error: 'Unknown action' };
        }
    }
};
