import { supabase } from './config.js';

let allLeads = [];
let currentTagFilter = 'all';

// --- NAVIGATION & UI ENGINE ---

/**
 * Handle navigation between main sections and update header buttons
 * @param {string} name - The section name (Leads, Tasks, Calendar)
 */
window.showSection = (name) => {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Remove active style from all nav items
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    // Show selected section
    document.getElementById('section' + name).classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    
    // Update Header Title
    const titleMap = { 'Leads': 'Lead Pipeline', 'Tasks': 'Task Management', 'Calendar': 'Appointments' };
    document.getElementById('viewTitle').innerText = titleMap[name];

    // Show/Hide Header Action Buttons based on section
    document.getElementById('btnNewLead').classList.add('hidden');
    document.getElementById('btnNewTask').classList.add('hidden');
    document.getElementById('btnNewAppt').classList.add('hidden');

    if(name === 'Leads') document.getElementById('btnNewLead').classList.remove('hidden');
    if(name === 'Tasks') document.getElementById('btnNewTask').classList.remove('hidden');
    if(name === 'Calendar') document.getElementById('btnNewAppt').classList.remove('hidden');

    document.getElementById('detailsPanel').classList.add('hidden');
};

window.openModal = (id) => {
    if(id === 'taskModal' && !document.getElementById('tEditId').value) { document.getElementById('taskTitleHeader').innerText = "New Task"; }
    if(id === 'apptModal' && !document.getElementById('aEditId').value) { document.getElementById('apptTitleHeader').innerText = "New Appointment"; }
    document.getElementById(id).classList.remove('hidden');
};

window.closeModal = (id) => {
    if(id === 'taskModal') document.getElementById('tEditId').value = "";
    if(id === 'apptModal') document.getElementById('aEditId').value = "";
    document.getElementById(id).classList.add('hidden');
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

// --- DATA INITIALIZATION ---

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    
    loadData();

    // Search functionality
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
    // Fetch all data from Supabase
    const leadsRes = await supabase.from('leads').select('*').order('last_activity', { ascending: false });
    const tasksRes = await supabase.from('tasks').select('*, leads(name)').order('created_at', { ascending: false });
    const apptsRes = await supabase.from('appointments').select('*, leads(name)').order('appt_date', { ascending: true });

    allLeads = leadsRes.data || [];
    
    renderBoard(allLeads);
    renderTasks(tasksRes.data || []);
    renderAppts(apptsRes.data || []);
    renderTagsNav(allLeads);
    updateSelects(allLeads);
    
    // Update Top Counters
    document.getElementById('statLeads').innerText = allLeads.length;
    document.getElementById('statTasks').innerText = (tasksRes.data || []).filter(t => !t.is_completed).length;
    document.getElementById('statAppts').innerText = (apptsRes.data || []).length;
}

// --- RENDERERS ---

/**
 * Render Kanban Board for Leads
 */
function renderBoard(list) {
    const filteredByTag = currentTagFilter === 'all' ? list : list.filter(l => (l.tags || []).includes(currentTagFilter));
    
    const colIds = { 'New': 'colNew', 'Negotiating': 'colNegotiating', 'Closed': 'colClosed' };
    Object.values(colIds).forEach(id => document.getElementById(id).innerHTML = '');
    
    const counts = { 'New': 0, 'Negotiating': 0, 'Closed': 0 };

    filteredByTag.forEach(l => {
        let status = l.status || 'New';
        if (!colIds[status]) status = 'New'; 

        counts[status]++;
        const colElement = document.getElementById(colIds[status]);
        
        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition cursor-pointer group";
        card.onclick = () => window.viewDetails(l.id);
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <p class="font-bold text-slate-800 text-sm">${l.name || 'Unnamed'}</p>
                <span class="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase tracking-tighter">${l.state || 'N/A'}</span>
            </div>
            <p class="text-[11px] text-slate-400 font-medium mb-3"><i class="fa fa-phone mr-1"></i> ${l.phone || 'No phone'}</p>
            <div class="flex flex-wrap gap-1">
                ${(l.tags || []).map(t => `<span class="bg-blue-50 text-blue-500 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">#${t}</span>`).join('')}
            </div>
        `;
        colElement.appendChild(card);
    });

    document.getElementById('countNew').innerText = counts['New'];
    document.getElementById('countNegotiating').innerText = counts['Negotiating'];
    document.getElementById('countClosed').innerText = counts['Closed'];
}

/**
 * Handle Tags Navigation (Smart Lists) - Ensuring NO duplicates
 */
function renderTagsNav(data) {
    // Get unique tags from all leads
    const allTagsRaw = data.flatMap(l => l.tags || []);
    const uniqueTags = [...new Set(allTagsRaw.map(t => t.trim()).filter(t => t !== ""))];
    
    const container = document.getElementById('tagNavContainer');
    container.innerHTML = uniqueTags.map(tag => `
        <div onclick="window.filterByTag('${tag}')" id="navTag-${tag}" class="nav-item text-xs italic">
            <i class="fa fa-hashtag"></i> ${tag.toUpperCase()}
        </div>
    `).join('');
}

window.filterByTag = (tag) => {
    currentTagFilter = tag;
    window.showSection('Leads'); // Always go to board when filtering by tag
    document.getElementById('viewTitle').innerText = tag === 'all' ? "Lead Pipeline" : `List: ${tag}`;
    
    // Highlight active tag in sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(tag === 'all') document.getElementById('navTagAll').classList.add('active');
    else document.getElementById(`navTag-${tag}`)?.classList.add('active');
    
    renderBoard(allLeads);
};

/**
 * Render Tasks with "Complete" logic
 */
function renderTasks(list) {
    const pendingContainer = document.getElementById('tasksList');
    const completedContainer = document.getElementById('tasksCompletedList');
    pendingContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    list.forEach(t => {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group ${t.is_completed ? 'completed' : ''}`;
        taskCard.innerHTML = `
            <div class="flex items-center gap-4">
                <button onclick="window.toggleTaskStatus('${t.id}', ${t.is_completed})" 
                        class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all 
                        ${t.is_completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-blue-500 text-transparent hover:text-slate-300'}">
                    <i class="fa fa-check text-[10px]"></i>
                </button>
                <div>
                    <h4 class="text-sm font-bold text-slate-700">${t.title}</h4>
                    <p class="text-[10px] text-blue-500 font-bold uppercase mt-1">Lead: ${t.leads ? t.leads.name : 'General'}</p>
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onclick="window.editTask('${t.id}')" class="text-slate-400 hover:text-blue-500"><i class="fa fa-edit"></i></button>
                <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-400 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </div>
        `;
        
        if(t.is_completed) completedContainer.appendChild(taskCard);
        else pendingContainer.appendChild(taskCard);
    });
}

window.toggleTaskStatus = async (id, currentStatus) => {
    const { error } = await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
    if (error) alert(error.message); else loadData();
};

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-5">
                <div class="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100"><i class="fa fa-calendar-check text-xl"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-base">${a.title}</h4>
                    <p class="text-xs text-slate-500 font-bold uppercase">Lead: ${a.leads ? a.leads.name : 'N/A'}</p>
                    <p class="text-[11px] text-emerald-600 font-bold mt-1 uppercase"><i class="fa fa-clock mr-1"></i> ${new Date(a.appt_date).toLocaleString()}</p>
                </div>
            </div>
            <div class="flex gap-4 px-4">
                <button onclick="window.editAppt('${a.id}')" class="text-slate-300 hover:text-blue-500"><i class="fa fa-edit"></i></button>
                <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-slate-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// --- CRUD OPERATIONS ---

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
    if (!fullText) { container.innerHTML = "<p class='text-xs text-slate-300 italic'>No logs.</p>"; return; }
    const notesArray = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notesArray.reverse().map(n => `<div class="py-3 text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">${n.trim()}</div>`).join('');
}

window.saveLeadUpdates = async () => {
    const id = document.getElementById('eId').value;
    const payload = {
        name: document.getElementById('eName').value, 
        phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value, 
        address: document.getElementById('eAddress').value,
        state: document.getElementById('eState').value, 
        status: document.getElementById('eStatus').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
        last_activity: new Date().toISOString()
    };
    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) alert(error.message); else { loadData(); alert("Changes Saved!"); }
};

window.addNote = async () => {
    const id = document.getElementById('eId').value;
    const lead = allLeads.find(l => l.id === id);
    const newNoteText = document.getElementById('newNote').value;
    if (!newNoteText) return;
    const updatedNotes = (lead.notes || "") + `\n[${new Date().toLocaleString()}]: ${newNoteText} ---`;
    await supabase.from('leads').update({ notes: updatedNotes, last_activity: new Date().toISOString() }).eq('id', id);
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
    if(!payload.name || !payload.phone) return alert("Name/Phone required.");
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert(error.message); else { window.closeModal('leadModal'); loadData(); }
};

document.getElementById('saveTaskBtn').onclick = async () => {
    const editId = document.getElementById('tEditId').value;
    const payload = { 
        title: document.getElementById('tTitle').value, 
        priority: document.getElementById('tPriority').value, 
        lead_id: document.getElementById('tLeadId').value || null, 
        due_date: document.getElementById('tDate').value 
    };
    const { error } = editId ? await supabase.from('tasks').update(payload).eq('id', editId) : await supabase.from('tasks').insert([payload]);
    if (error) alert(error.message); else { window.closeModal('taskModal'); loadData(); }
};

document.getElementById('saveApptBtn').onclick = async () => {
    const editId = document.getElementById('aEditId').value;
    const payload = { 
        title: document.getElementById('aTitle').value, 
        appt_date: document.getElementById('aDate').value, 
        lead_id: document.getElementById('aLeadId').value || null 
    };
    const { error } = editId ? await supabase.from('appointments').update(payload).eq('id', editId) : await supabase.from('appointments').insert([payload]);
    if (error) alert(error.message); else { window.closeModal('apptModal'); loadData(); }
};

// --- UTILS ---

window.editTask = async (id) => {
    const { data: t } = await supabase.from('tasks').select('*').eq('id', id).single();
    if(t) { 
        document.getElementById('tEditId').value = t.id; 
        document.getElementById('tTitle').value = t.title; 
        document.getElementById('tPriority').value = t.priority; 
        document.getElementById('tLeadId').value = t.lead_id || ""; 
        document.getElementById('tDate').value = t.due_date || ""; 
        document.getElementById('taskTitleHeader').innerText = "Edit Task"; 
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
        document.getElementById('apptTitleHeader').innerText = "Edit Appointment"; 
        window.openModal('apptModal'); 
    }
};

function updateSelects(leads) {
    const options = '<option value="">General / No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
    document.getElementById('aLeadId').innerHTML = options;
}

window.deleteItem = async (table, id) => { if (confirm("Are you sure you want to delete this?")) { await supabase.from(table).delete().eq('id', id); loadData(); } };

init();
