import { supabase } from './config.js';

let allLeads = [];
let currentTagFilter = 'all';

// --- UI NAVIGATION ---
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
window.showSection = (name) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    document.getElementById('section' + name).classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    document.getElementById('detailsPanel').classList.add('hidden');
};
window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

// --- DATA ENGINE ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadData();
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term)));
        renderBoard(filtered);
    };
}

async function loadData() {
    const leadsRes = await supabase.from('leads').select('*').order('last_activity', { ascending: false });
    const tasksRes = await supabase.from('tasks').select('*, leads(name)');
    const apptsRes = await supabase.from('appointments').select('*, leads(name)').order('appt_date', { ascending: true });

    allLeads = leadsRes.data || [];
    renderBoard(allLeads);
    renderTasks(tasksRes.data || []);
    renderAppts(apptsRes.data || []);
    renderTagsNav(allLeads);
    updateSelects(allLeads);
    
    document.getElementById('statLeads').innerText = allLeads.length;
    document.getElementById('statTasks').innerText = (tasksRes.data || []).length;
    document.getElementById('statAppts').innerText = (apptsRes.data || []).length;
}

// --- KANBAN RENDERER (THE GHL BOARD) ---
function renderBoard(list) {
    const filteredByTag = currentTagFilter === 'all' ? list : list.filter(l => (l.tags || []).includes(currentTagFilter));
    
    const columns = { 'New': 'colNew', 'Negotiating': 'colNegotiating', 'Closed': 'colClosed' };
    Object.values(columns).forEach(id => document.getElementById(id).innerHTML = '');
    
    const counts = { 'New': 0, 'Negotiating': 0, 'Closed': 0 };

    filteredByTag.forEach(l => {
        const colId = columns[l.status] || 'colNew';
        counts[l.status]++;
        const card = `
            <div onclick="window.viewDetails('${l.id}')" class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-300 transition cursor-pointer group">
                <div class="flex justify-between items-start mb-2">
                    <p class="font-bold text-slate-800 text-sm">${l.name}</p>
                    <span class="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-bold uppercase tracking-tighter">${l.state || 'TX'}</span>
                </div>
                <p class="text-[11px] text-slate-400 font-mono mb-3">${l.phone}</p>
                <div class="flex flex-wrap gap-1">
                    ${(l.tags || []).map(t => `<span class="bg-slate-100 text-slate-500 text-[8px] px-1 py-0.5 rounded uppercase font-bold">#${t}</span>`).join('')}
                </div>
            </div>`;
        document.getElementById(colId).innerHTML += card;
    });

    document.getElementById('countNew').innerText = counts['New'];
    document.getElementById('countNegotiating').innerText = counts['Negotiating'];
    document.getElementById('countClosed').innerText = counts['Closed'];
}

// --- TAGS (SMART LISTS) LOGIC ---
function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const container = document.getElementById('tagNav');
    container.innerHTML = tags.map(t => `<button onclick="window.filterByTag('${t}')" class="w-full text-left py-2 px-4 text-[11px] text-slate-500 hover:text-white uppercase font-bold tracking-widest italic transition"># ${t}</button>`).join('');
}

window.filterByTag = (tag) => {
    currentTagFilter = tag;
    document.getElementById('viewTitle').innerText = tag === 'all' ? "Lead Pipeline" : `List: ${tag}`;
    renderBoard(allLeads);
};

// --- REST OF LOGIC (LEAD DETAILS, TASKS, APPTS) ---
window.viewDetails = async (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name;
    document.getElementById('ePhone').value = lead.phone;
    document.getElementById('eEmail').value = lead.email || "";
    document.getElementById('eAddress').value = lead.address || "";
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eStatus').value = lead.status;
    document.getElementById('eTags').value = (lead.tags || []).join(', ');
    renderHistory(lead.notes);
};

function renderHistory(fullText) {
    const container = document.getElementById('notesHistory');
    if (!fullText) { container.innerHTML = "<p class='text-xs text-slate-300 italic'>No logs.</p>"; return; }
    const notesArray = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notesArray.reverse().map(n => `<div class="py-3 text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">${n.trim()}</div>`).join('');
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
    loadData(); alert("Saved!");
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
        zip_code: document.getElementById('lZip').value, state: document.getElementById('lState').value,
        notes: document.getElementById('lNotes').value ? `\n[${new Date().toLocaleString()}]: ${document.getElementById('lNotes').value} ---` : "",
        status: 'New', last_activity: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert("Duplicate Phone or Error"); else { window.closeModal('leadModal'); loadData(); }
};

document.getElementById('saveTaskBtn').onclick = async () => {
    const editId = document.getElementById('tEditId').value;
    const payload = { title: document.getElementById('tTitle').value, priority: document.getElementById('tPriority').value, lead_id: document.getElementById('tLeadId').value || null, due_date: document.getElementById('tDate').value };
    if(editId) await supabase.from('tasks').update(payload).eq('id', editId); else await supabase.from('tasks').insert([payload]);
    window.closeModal('taskModal'); loadData();
};

document.getElementById('saveApptBtn').onclick = async () => {
    const editId = document.getElementById('aEditId').value;
    const payload = { title: document.getElementById('aTitle').value, appt_date: document.getElementById('aDate').value, lead_id: document.getElementById('aLeadId').value || null };
    if(editId) await supabase.from('appointments').update(payload).eq('id', editId); else await supabase.from('appointments').insert([payload]);
    window.closeModal('apptModal'); loadData();
};

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    container.innerHTML = list.map(t => `<div class="bg-white p-6 rounded-[2rem] border border-slate-100 border-l-4 ${t.priority === 'High' ? 'border-l-red-500' : 'border-l-blue-500'} shadow-sm"><div class="flex justify-between items-start mb-4"><span class="text-[10px] font-bold uppercase text-slate-400">${t.priority} Priority</span><div class="flex gap-2"><button onclick="window.editTask('${t.id}')" class="text-slate-300 hover:text-blue-500 transition"><i class="fa fa-edit"></i></button><button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-check-circle text-xl"></i></button></div></div><h4 class="font-bold text-slate-800">${t.title}</h4><p class="text-[10px] text-blue-500 mt-2 font-bold uppercase tracking-tighter italic">Lead: ${t.leads ? t.leads.name : 'General'}</p></div>`).join('');
}

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `<div class="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm"><div class="flex items-center gap-6"><div class="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100"><i class="fa fa-calendar-check text-xl"></i></div><div><h4 class="font-bold text-slate-800 text-lg">${a.title}</h4><p class="text-xs text-slate-500 font-bold uppercase tracking-widest italic">Lead: ${a.leads ? a.leads.name : 'N/A'}</p><p class="text-[10px] text-emerald-600 font-bold mt-1 uppercase">${new Date(a.appt_date).toLocaleString()}</p></div></div><div class="flex gap-4 px-4"><button onclick="window.editAppt('${a.id}')" class="text-slate-300 hover:text-blue-500 transition"><i class="fa fa-edit text-xl"></i></button><button onclick="window.deleteItem('appointments', '${a.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-trash text-xl"></i></button></div></div>`).join('');
}

window.editTask = async (id) => {
    const { data: t } = await supabase.from('tasks').select('*').eq('id', id).single();
    if(t) { document.getElementById('tEditId').value = t.id; document.getElementById('tTitle').value = t.title; document.getElementById('tPriority').value = t.priority; document.getElementById('tLeadId').value = t.lead_id || ""; document.getElementById('tDate').value = t.due_date || ""; document.getElementById('taskTitleHeader').innerText = "Edit Task"; window.openModal('taskModal'); }
};

window.editAppt = async (id) => {
    const { data: a } = await supabase.from('appointments').select('*').eq('id', id).single();
    if(a) { document.getElementById('aEditId').value = a.id; document.getElementById('aTitle').value = a.title; document.getElementById('aLeadId').value = a.lead_id || ""; if(a.appt_date) { const d = new Date(a.appt_date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); document.getElementById('aDate').value = d.toISOString().slice(0, 16); } document.getElementById('apptTitleHeader').innerText = "Edit Appt"; window.openModal('apptModal'); }
};

function updateSelects(leads) {
    const options = '<option value="">General / No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
    document.getElementById('aLeadId').innerHTML = options;
}

document.getElementById('csvFileInput').onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const rows = ev.target.result.split('\n').slice(1);
        const dataToInsert = rows.filter(r => r.trim()).map(r => {
            const cols = r.split(',');
            return { name: cols[0], phone: cols[1], status: 'New', last_activity: new Date().toISOString() };
        });
        await supabase.from('leads').insert(dataToInsert); loadData();
    };
    reader.readAsText(file);
};

window.filterStatus = (status) => {
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const filtered = status === 'all' ? allLeads : allLeads.filter(l => l.status === status);
    renderBoard(filtered);
};

window.deleteItem = async (table, id) => { if (confirm("Delete?")) { await supabase.from(table).delete().eq('id', id); loadData(); } };

init();
