import { supabase } from './config.js';

let allLeads = [];

// UI Setup
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.showSection = (name) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    document.getElementById('section' + name).classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    document.getElementById('viewTitle').innerText = name;
};
window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadData();
}

async function loadData() {
    const leadsRes = await supabase.from('leads').select('*').order('last_activity', { ascending: false });
    const tasksRes = await supabase.from('tasks').select('*, leads(name)');
    const apptsRes = await supabase.from('appointments').select('*, leads(name)').order('appt_date', { ascending: true });

    allLeads = leadsRes.data || [];
    renderLeads(allLeads);
    renderTasks(tasksRes.data || []);
    renderAppts(apptsRes.data || []);
    renderTagsNav(allLeads);
    updateSelects(allLeads);
}

// RENDERING
function renderLeads(list) {
    const container = document.getElementById('leadsListContainer');
    container.innerHTML = list.map(l => {
        const dateStr = new Date(l.last_activity).toLocaleDateString();
        return `
            <div onclick="window.viewDetails('${l.id}')" class="p-4 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group border-l-4 border-transparent hover:border-blue-500 bg-white">
                <div>
                    <p class="font-bold text-slate-800 text-sm">${l.name}</p>
                    <p class="text-[9px] text-slate-400 font-mono tracking-tighter">${l.phone} • ${l.state || 'N/A'}</p>
                </div>
                <div class="text-right">
                    <span class="text-[8px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-bold uppercase">${l.status}</span>
                    <p class="text-[8px] text-slate-300 mt-1 uppercase font-bold">Active: ${dateStr}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    container.innerHTML = list.map(t => {
        const priorityColor = t.priority === 'High' ? 'text-red-500' : (t.priority === 'Medium' ? 'text-orange-500' : 'text-slate-400');
        return `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm group">
                <div class="flex justify-between items-start">
                    <span class="text-[8px] font-bold uppercase ${priorityColor}">${t.priority || 'Low'} Priority</span>
                    <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-200 hover:text-emerald-500"><i class="fa fa-check-circle text-lg"></i></button>
                </div>
                <h4 class="font-bold text-slate-800 text-sm mt-1">${t.title}</h4>
                <p class="text-[9px] text-blue-500 font-bold mt-2 uppercase tracking-tighter">${t.leads ? t.leads.name : 'General'}</p>
            </div>
        `;
    }).join('');
}

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
            <div>
                <p class="text-[8px] font-bold text-emerald-600 uppercase">Upcoming Meeting</p>
                <h4 class="font-bold text-slate-800">${a.title} with ${a.leads ? a.leads.name : 'Client'}</h4>
                <p class="text-xs text-slate-500"><i class="fa fa-clock mr-1"></i>${new Date(a.appt_date).toLocaleString()}</p>
            </div>
            <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-emerald-200 hover:text-red-500"><i class="fa fa-trash"></i></button>
        </div>
    `).join('');
}

// LEAD DETAILS & ACTIONS
window.viewDetails = async (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name;
    document.getElementById('ePhone').value = lead.phone;
    document.getElementById('eEmail').value = lead.email;
    document.getElementById('labelStatus').innerText = lead.status;
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eTags').value = (lead.tags || []).join(', ');
    document.getElementById('lastActivityLabel').innerText = "Last activity: " + new Date(lead.last_activity).toLocaleString();
    renderNotes(lead.notes); // Note: In this version we store history in the 'notes' text field as a list
};

window.saveLeadUpdates = async () => {
    const id = document.getElementById('eId').value;
    const payload = {
        name: document.getElementById('eName').value,
        phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value,
        state: document.getElementById('eState').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
        last_activity: new Date().toISOString()
    };
    await supabase.from('leads').update(payload).eq('id', id);
    loadData();
    alert("Record updated!");
};

window.addNote = async () => {
    const id = document.getElementById('eId').value;
    const lead = allLeads.find(l => l.id === id);
    const newNoteText = document.getElementById('newNote').value;
    if (!newNoteText) return;

    const timestamp = new Date().toLocaleString();
    const updatedNotes = (lead.notes || "") + `\n[${timestamp}]: ${newNoteText} ---`;
    
    await supabase.from('leads').update({ notes: updatedNotes, last_activity: new Date().toISOString() }).eq('id', id);
    document.getElementById('newNote').value = "";
    loadData();
    // Re-render notes locally for speed
    renderNotes(updatedNotes);
};

function renderNotes(fullText) {
    const container = document.getElementById('notesHistory');
    if (!fullText) { container.innerHTML = "<p class='text-[10px] text-slate-400 italic'>No activity log yet.</p>"; return; }
    
    const notesArray = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notesArray.reverse().map(n => `
        <div class="py-3">
            <p class="text-[10px] text-slate-700 whitespace-pre-wrap">${n.trim()}</p>
        </div>
    `).join('');
}

// CREATION ACTIONS
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { name: document.getElementById('lName').value, phone: document.getElementById('lPhone').value, state: document.getElementById('lState').value, status: 'New', last_activity: new Date().toISOString() };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert("Error: Duplicate phone or database issue.");
    else { window.closeModal('leadModal'); loadData(); }
};

document.getElementById('saveTaskBtn').onclick = async () => {
    const payload = { title: document.getElementById('tTitle').value, priority: document.getElementById('tPriority').value, lead_id: document.getElementById('tLeadId').value || null, due_date: document.getElementById('tDate').value };
    await supabase.from('tasks').insert([payload]);
    window.closeModal('taskModal'); loadData();
};

document.getElementById('saveApptBtn').onclick = async () => {
    const payload = { title: document.getElementById('aTitle').value, lead_date: document.getElementById('aDate').value, lead_id: document.getElementById('aLeadId').value || null };
    // Fixed: in SQL snippet we called it appt_date
    await supabase.from('appointments').insert([{ title: payload.title, appt_date: document.getElementById('aDate').value, lead_id: payload.lead_id }]);
    window.closeModal('apptModal'); loadData();
};

// HELPERS
window.filterStatus = (status) => {
    const filtered = status === 'all' ? allLeads : allLeads.filter(l => l.status === status);
    renderLeads(filtered);
};

function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const container = document.getElementById('dynamicTags');
    container.innerHTML = '<p class="px-4 text-[10px] font-bold uppercase text-slate-500 mb-2">Smart Lists</p>' + tags.map(t => `
        <button onclick="window.filterByTag('${t}')" class="w-full text-left py-1 px-4 text-[11px] hover:text-white transition"># ${t}</button>
    `).join('');
}

window.filterByTag = (tag) => {
    const filtered = allLeads.filter(l => (l.tags || []).includes(tag));
    renderLeads(filtered);
};

function updateSelects(leads) {
    const options = '<option value="">No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
    document.getElementById('aLeadId').innerHTML = options;
}

window.deleteItem = async (table, id) => { if(confirm("Confirm action?")) { await supabase.from(table).delete().eq('id', id); loadData(); } };

init();
