import { supabase } from './config.js';

let allLeads = [];

// --- UI HELPERS ---
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.showSection = (name) => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    document.getElementById('section' + name).classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    document.getElementById('detailsPanel').classList.add('hidden');

    const mainBtn = document.getElementById('headerMainBtn');
    if(name === 'Leads') { mainBtn.innerText = "+ New Lead"; mainBtn.onclick = () => window.openModal('leadModal'); }
    else if(name === 'Tasks') { mainBtn.innerText = "+ New Task"; mainBtn.onclick = () => window.openModal('taskModal'); }
    else if(name === 'Calendar') { mainBtn.innerText = "+ New Appt"; mainBtn.onclick = () => window.openModal('apptModal'); }
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

// --- DATA ENGINE ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadData();

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term)));
        renderLeads(filtered);
    });
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
    
    // ACTUALIZAR CONTADORES EN PANTALLA
    document.getElementById('statLeads').innerText = allLeads.length;
    document.getElementById('statTasks').innerText = (tasksRes.data || []).length;
    document.getElementById('statAppts').innerText = (apptsRes.data || []).length;
}

// --- RENDERERS ---
function renderLeads(list) {
    const container = document.getElementById('leadsList');
    container.innerHTML = list.map(l => `
        <div onclick="window.viewDetails('${l.id}')" class="p-5 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center bg-white border-b border-slate-50 border-l-4 border-transparent hover:border-blue-500">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs font-mono border">${l.name.substring(0,2).toUpperCase()}</div>
                <div>
                    <p class="font-bold text-slate-800 text-base">${l.name}</p>
                    <p class="text-xs text-slate-400 font-mono tracking-tighter">${l.phone} • ${l.state || 'N/A'}</p>
                </div>
            </div>
            <div class="text-right">
                <span class="text-[9px] font-bold px-3 py-1 rounded-full uppercase ${getStatusColor(l.status)}">${l.status}</span>
                <p class="text-[9px] text-slate-300 mt-2 font-bold italic">Active: ${new Date(l.last_activity).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function getStatusColor(status) {
    if (status === 'New') return 'bg-blue-100 text-blue-700';
    if (status === 'Negotiating') return 'bg-orange-100 text-orange-700';
    if (status === 'Closed') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
}

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    container.innerHTML = list.map(t => {
        const priorityColor = t.priority === 'High' ? 'border-l-red-500' : (t.priority === 'Medium' ? 'border-l-orange-500' : 'border-l-slate-300');
        return `
            <div class="bg-white p-6 rounded-[2rem] border border-slate-100 border-l-4 ${priorityColor} shadow-sm group hover:shadow-md transition-all">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[10px] font-bold uppercase text-slate-400 tracking-widest">${t.priority} Priority</span>
                    <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-200 hover:text-emerald-500 transition"><i class="fa fa-check-circle text-2xl"></i></button>
                </div>
                <h4 class="font-bold text-slate-800 text-lg">${t.title}</h4>
                <div class="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <p class="text-[10px] text-blue-500 font-bold uppercase italic">${t.leads ? t.leads.name : 'General Task'}</p>
                    <p class="text-[10px] text-slate-400 font-bold tracking-widest"><i class="fa fa-clock mr-1"></i>${t.due_date || 'N/A'}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm hover:border-emerald-200 transition">
            <div class="flex items-center gap-6">
                <div class="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100"><i class="fa fa-calendar-alt text-2xl"></i></div>
                <div>
                    <h4 class="font-bold text-slate-800 text-xl">${a.title}</h4>
                    <p class="text-sm text-slate-500 font-medium">Lead: <span class="text-slate-800 font-bold">${a.leads ? a.leads.name : 'N/A'}</span></p>
                    <p class="text-[11px] text-emerald-600 font-bold mt-1 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block">${new Date(a.appt_date).toLocaleString()}</p>
                </div>
            </div>
            <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-slate-200 hover:text-red-500 transition px-4"><i class="fa fa-trash"></i></button>
        </div>
    `).join('');
}

// --- LOGIC ---
window.viewDetails = async (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name;
    document.getElementById('ePhone').value = lead.phone;
    document.getElementById('eEmail').value = lead.email;
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eTags').value = (lead.tags || []).join(', ');
    document.getElementById('labelStatus').innerText = lead.status;
    document.getElementById('eStatus').value = lead.status;
    renderNotes(lead.notes);
};

window.saveLeadUpdates = async () => {
    const id = document.getElementById('eId').value;
    const payload = {
        name: document.getElementById('eName').value,
        phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value,
        state: document.getElementById('eState').value,
        status: document.getElementById('eStatus').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
        last_activity: new Date().toISOString()
    };
    await supabase.from('leads').update(payload).eq('id', id);
    loadData();
    alert("Record Saved!");
};

window.addNote = async () => {
    const id = document.getElementById('eId').value;
    const lead = allLeads.find(l => l.id === id);
    const newNoteText = document.getElementById('newNote').value;
    if (!newNoteText) return;
    const updatedNotes = (lead.notes || "") + `\n[${new Date().toLocaleString()}]: ${newNoteText} ---`;
    await supabase.from('leads').update({ notes: updatedNotes, last_activity: new Date().toISOString() }).eq('id', id);
    document.getElementById('newNote').value = "";
    loadData();
    renderNotes(updatedNotes);
};

function renderNotes(fullText) {
    const container = document.getElementById('notesHistory');
    if (!fullText) { container.innerHTML = "<p class='text-xs text-slate-300 italic'>No logs found.</p>"; return; }
    const notesArray = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notesArray.reverse().map(n => `<div class="py-4 text-[13px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">${n.trim()}</div>`).join('');
}

// --- CREATION ---
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { name: document.getElementById('lName').value, phone: document.getElementById('lPhone').value, state: document.getElementById('lState').value, status: 'New', last_activity: new Date().toISOString() };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert("Error: Duplicate phone found.");
    else { window.closeModal('leadModal'); loadData(); }
};

document.getElementById('saveTaskBtn').onclick = async () => {
    const payload = { title: document.getElementById('tTitle').value, priority: document.getElementById('tPriority').value, lead_id: document.getElementById('tLeadId').value || null, due_date: document.getElementById('tDate').value };
    await supabase.from('tasks').insert([payload]);
    window.closeModal('taskModal'); loadData();
};

document.getElementById('saveApptBtn').onclick = async () => {
    const payload = { title: document.getElementById('aTitle').value, appt_date: document.getElementById('aDate').value, lead_id: document.getElementById('aLeadId').value || null };
    await supabase.from('appointments').insert([payload]);
    window.closeModal('apptModal'); loadData();
};

// --- IMPORT ---
document.getElementById('csvFileInput').onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const rows = ev.target.result.split('\n').slice(1);
        const dataToInsert = rows.filter(r => r.trim()).map(r => {
            const cols = r.split(',');
            return { name: cols[0], phone: cols[1], status: 'New', last_activity: new Date().toISOString() };
        });
        await supabase.from('leads').insert(dataToInsert);
        loadData();
    };
    reader.readAsText(file);
};

// --- HELPERS ---
window.filterStatus = (status) => {
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    const filtered = status === 'all' ? allLeads : allLeads.filter(l => l.status === status);
    renderLeads(filtered);
};

function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const container = document.getElementById('tagNav');
    container.innerHTML = tags.map(t => `<button onclick="window.filterByTag('${t}')" class="w-full text-left py-2 px-4 text-[11px] text-slate-500 hover:text-white uppercase font-bold tracking-widest italic transition"># ${t}</button>`).join('');
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

window.deleteItem = async (table, id) => {
    if (confirm("Delete permanently?")) {
        await supabase.from(table).delete().eq('id', id);
        if (table === 'leads') document.getElementById('detailsPanel').classList.add('hidden');
        loadData();
    }
};

init();
