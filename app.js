import { supabase } from './config.js';

let allLeads = [];
let currentTagFilter = 'all';

// --- NAVIGATION ---
window.showSection = (name) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    document.getElementById('section' + name).classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    
    // Header Logic
    document.getElementById('viewTitle').innerText = (name === 'Leads') ? 'Lead Pipeline' : name;
    
    // Show/Hide Filter Bar only on Leads section
    const filterBar = document.getElementById('filterBar');
    if(name === 'Leads') filterBar.classList.remove('hidden');
    else filterBar.classList.add('hidden');

    // Button Visibility
    document.getElementById('btnNewLead').classList.add('hidden');
    document.getElementById('btnNewTask').classList.add('hidden');
    document.getElementById('btnNewAppt').classList.add('hidden');

    if(name === 'Leads') document.getElementById('btnNewLead').classList.remove('hidden');
    if(name === 'Tasks') document.getElementById('btnNewTask').classList.remove('hidden');
    if(name === 'Calendar') document.getElementById('btnNewAppt').classList.remove('hidden');

    document.getElementById('detailsPanel').classList.add('hidden');
};

window.openModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
    if(id === 'taskModal') document.getElementById('tEditId').value = "";
    if(id === 'apptModal') document.getElementById('aEditId').value = "";
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

// --- DATA ENGINE ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    
    loadData();

    // Excel Logic
    document.getElementById('csvFileInput').onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rows = ev.target.result.split('\n').slice(1);
            const dataToInsert = rows.filter(r => r.trim()).map(r => {
                const cols = r.split(',');
                return { name: cols[0], phone: cols[1], email: cols[2] || '', status: 'New', last_activity: new Date().toISOString() };
            });
            await supabase.from('leads').insert(dataToInsert);
            loadData();
        };
        reader.readAsText(file);
    };

    // Search Logic
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => 
            (l.name && l.name.toLowerCase().includes(term)) || 
            (l.phone && l.phone.includes(term))
        );
        renderBoard(filtered);
    };
}

async function loadData() {
    const leadsRes = await supabase.from('leads').select('*').order('last_activity', { ascending: false });
    const tasksRes = await supabase.from('tasks').select('*, leads(name)').order('created_at', { ascending: false });
    const apptsRes = await supabase.from('appointments').select('*, leads(name)').order('appt_date', { ascending: true });

    allLeads = leadsRes.data || [];
    
    renderBoard(allLeads);
    renderTasks(tasksRes.data || []);
    renderAppts(apptsRes.data || []);
    renderTagPills(allLeads); // Internal filter bar
    updateSelects(allLeads);
    
    document.getElementById('statLeads').innerText = allLeads.length;
    document.getElementById('statTasks').innerText = (tasksRes.data || []).filter(t => !t.is_completed).length;
    document.getElementById('statAppts').innerText = (apptsRes.data || []).length;
}

// --- RENDERING ---

/**
 * Renders the Internal Tag Filter Bar (Pills)
 */
function renderTagPills(data) {
    const allTags = data.flatMap(l => l.tags || []);
    const uniqueTags = [...new Set(allTags.map(t => t.trim()).filter(t => t !== ""))];
    
    const container = document.getElementById('tagPillsContainer');
    // Always add "ALL" pill
    let html = `<div onclick="window.filterByTag('all')" class="tag-pill ${currentTagFilter === 'all' ? 'active' : ''}">ALL LEADS</div>`;
    
    html += uniqueTags.map(tag => `
        <div onclick="window.filterByTag('${tag}')" class="tag-pill ${currentTagFilter === tag ? 'active' : ''}">
            # ${tag.toUpperCase()}
        </div>
    `).join('');
    
    container.innerHTML = html;
}

window.filterByTag = (tag) => {
    currentTagFilter = tag;
    renderTagPills(allLeads);
    renderBoard(allLeads);
};

function renderBoard(list) {
    const filtered = currentTagFilter === 'all' ? list : list.filter(l => (l.tags || []).includes(currentTagFilter));
    const colIds = { 'New': 'colNew', 'Negotiating': 'colNegotiating', 'Closed': 'colClosed' };
    Object.values(colIds).forEach(id => document.getElementById(id).innerHTML = '');
    
    const counts = { 'New': 0, 'Negotiating': 0, 'Closed': 0 };

    filtered.forEach(l => {
        let status = l.status || 'New';
        if (!colIds[status]) status = 'New'; 
        counts[status]++;

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition cursor-pointer group";
        card.onclick = () => window.viewDetails(l.id);
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <p class="font-bold text-slate-800 text-sm">${l.name || 'Unnamed'}</p>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black uppercase">${l.state || '--'}</span>
            </div>
            <p class="text-[10px] text-slate-400 font-bold mb-3"><i class="fa fa-phone mr-1 text-[8px]"></i> ${l.phone || 'No phone'}</p>
            <div class="flex flex-wrap gap-1">
                ${(l.tags || []).map(t => `<span class="bg-blue-50 text-blue-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">#${t}</span>`).join('')}
            </div>
        `;
        document.getElementById(colIds[status]).appendChild(card);
    });

    document.getElementById('countNew').innerText = counts['New'];
    document.getElementById('countNegotiating').innerText = counts['Negotiating'];
    document.getElementById('countClosed').innerText = counts['Closed'];
}

function renderTasks(list) {
    const pending = document.getElementById('tasksList');
    const completed = document.getElementById('tasksCompletedList');
    pending.innerHTML = ''; completed.innerHTML = '';

    list.forEach(t => {
        const div = document.createElement('div');
        div.className = `bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group ${t.is_completed ? 'opacity-60' : ''}`;
        div.innerHTML = `
            <div class="flex items-center gap-4">
                <button onclick="window.toggleTaskStatus('${t.id}', ${t.is_completed})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:text-slate-200'}">
                    <i class="fa fa-check text-[10px]"></i>
                </button>
                <div>
                    <h4 class="text-sm font-bold text-slate-700 ${t.is_completed ? 'line-through' : ''}">${t.title}</h4>
                    <p class="text-[9px] text-blue-500 font-black uppercase">Lead: ${t.leads ? t.leads.name : 'General'}</p>
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onclick="window.editTask('${t.id}')" class="text-slate-400 hover:text-blue-500"><i class="fa fa-edit"></i></button>
                <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </div>
        `;
        if(t.is_completed) completed.appendChild(div); else pending.appendChild(div);
    });
}

window.toggleTaskStatus = async (id, current) => {
    await supabase.from('tasks').update({ is_completed: !current }).eq('id', id);
    loadData();
};

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm hover:border-emerald-300 transition">
            <div class="flex items-center gap-5">
                <div class="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600"><i class="fa fa-calendar-day text-xl"></i></div>
                <div>
                    <h4 class="font-black text-slate-800 text-base uppercase italic tracking-tighter">${a.title}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Lead: ${a.leads ? a.leads.name : 'N/A'}</p>
                    <p class="text-[11px] text-emerald-600 font-black mt-1 uppercase italic">${new Date(a.appt_date).toLocaleString()}</p>
                </div>
            </div>
            <div class="flex gap-4">
                <button onclick="window.editAppt('${a.id}')" class="text-slate-300 hover:text-blue-500"><i class="fa fa-edit"></i></button>
                <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-slate-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// --- CRUD ---
window.viewDetails = async (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name || "";
    document.getElementById('ePhone').value = lead.phone || "";
    document.getElementById('eEmail').value = lead.email || "";
    document.getElementById('eAddress').value = lead.address || "";
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eStatus').value = lead.status || "New";
    document.getElementById('eTags').value = (lead.tags || []).join(', ');
    renderHistory(lead.notes);
};

function renderHistory(fullText) {
    const container = document.getElementById('notesHistory');
    if (!fullText) { container.innerHTML = "<p class='text-[10px] text-slate-300 italic'>No logs.</p>"; return; }
    const notes = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notes.reverse().map(n => `<div class="py-3 text-[11px] text-slate-600 leading-relaxed font-medium">${n.trim()}</div>`).join('');
}

window.saveLeadUpdates = async () => {
    const id = document.getElementById('eId').value;
    const payload = {
        name: document.getElementById('eName').value, phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value, address: document.getElementById('eAddress').value,
        state: document.getElementById('eState').value, status: document.getElementById('eStatus').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
        last_activity: new Date().toISOString()
    };
    await supabase.from('leads').update(payload).eq('id', id);
    loadData(); alert("Updated!");
};

window.addNote = async () => {
    const id = document.getElementById('eId').value;
    const lead = allLeads.find(l => l.id === id);
    const text = document.getElementById('newNote').value;
    if (!text) return;
    const updated = (lead.notes || "") + `\n[${new Date().toLocaleString()}]: ${text} ---`;
    await supabase.from('leads').update({ notes: updated, last_activity: new Date().toISOString() }).eq('id', id);
    document.getElementById('newNote').value = ""; loadData(); window.viewDetails(id);
};

document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { 
        name: document.getElementById('lName').value, phone: document.getElementById('lPhone').value, 
        email: document.getElementById('lEmail').value, address: document.getElementById('lAddress').value,
        state: document.getElementById('lState').value,
        notes: document.getElementById('lNotes').value ? `\n[${new Date().toLocaleString()}]: ${document.getElementById('lNotes').value} ---` : "",
        status: 'New', last_activity: new Date().toISOString() 
    };
    await supabase.from('leads').insert([payload]);
    window.closeModal('leadModal'); loadData();
};

document.getElementById('saveTaskBtn').onclick = async () => {
    const id = document.getElementById('tEditId').value;
    const payload = { title: document.getElementById('tTitle').value, priority: document.getElementById('tPriority').value, lead_id: document.getElementById('tLeadId').value || null, due_date: document.getElementById('tDate').value };
    if(id) await supabase.from('tasks').update(payload).eq('id', id);
    else await supabase.from('tasks').insert([payload]);
    window.closeModal('taskModal'); loadData();
};

document.getElementById('saveApptBtn').onclick = async () => {
    const id = document.getElementById('aEditId').value;
    const payload = { title: document.getElementById('aTitle').value, appt_date: document.getElementById('aDate').value, lead_id: document.getElementById('aLeadId').value || null };
    if(id) await supabase.from('appointments').update(payload).eq('id', id);
    else await supabase.from('appointments').insert([payload]);
    window.closeModal('apptModal'); loadData();
};

window.editTask = async (id) => {
    const { data: t } = await supabase.from('tasks').select('*').eq('id', id).single();
    if(t) { 
        document.getElementById('tEditId').value = t.id; 
        document.getElementById('tTitle').value = t.title; 
        document.getElementById('tPriority').value = t.priority; 
        document.getElementById('tLeadId').value = t.lead_id || ""; 
        document.getElementById('tDate').value = t.due_date || ""; 
        window.openModal('taskModal'); 
    }
};

window.editAppt = async (id) => {
    const { data: a } = await supabase.from('appointments').select('*').eq('id', id).single();
    if(a) { 
        document.getElementById('aEditId').value = a.id; 
        document.getElementById('aTitle').value = a.title; 
        document.getElementById('aLeadId').value = a.lead_id || ""; 
        if(a.appt_date) {
            const d = new Date(a.appt_date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('aDate').value = d.toISOString().slice(0, 16);
        }
        window.openModal('apptModal'); 
    }
};

function updateSelects(leads) {
    const options = '<option value="">General / No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
    document.getElementById('aLeadId').innerHTML = options;
}

window.deleteItem = async (table, id) => { if (confirm("Delete?")) { await supabase.from(table).delete().eq('id', id); loadData(); } };

init();
