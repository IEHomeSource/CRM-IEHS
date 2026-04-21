import { supabase } from './config.js';

let allLeads = [];

// --- NAVEGACIÓN Y UI ---
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.showSection = (name) => {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    
    // 2. Mostrar la seleccionada
    const target = document.getElementById('section' + name);
    target.classList.add('active');
    document.getElementById('nav' + name).classList.add('active');
    
    // 3. Ajustar el Header y Botones dinámicos
    document.getElementById('viewTitle').innerText = name;
    const actionBtn = document.getElementById('mainActionButton');
    const leadFilters = document.getElementById('leadFilters');
    const searchContainer = document.getElementById('searchContainer');

    if (name === 'Leads') {
        actionBtn.innerText = "+ New Lead";
        actionBtn.onclick = () => window.openModal('leadModal');
        leadFilters.classList.remove('hidden');
        searchContainer.classList.remove('hidden');
    } else if (name === 'Tasks') {
        actionBtn.innerText = "+ New Task";
        actionBtn.onclick = () => window.openModal('taskModal');
        leadFilters.classList.add('hidden');
        searchContainer.classList.add('hidden');
    } else if (name === 'Calendar') {
        actionBtn.innerText = "+ New Appt";
        actionBtn.onclick = () => window.openModal('apptModal');
        leadFilters.classList.add('hidden');
        searchContainer.classList.add('hidden');
    }
};

window.showTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    document.getElementById('contentInfo').classList.add('hidden');
    document.getElementById('contentNotes').classList.add('hidden');
    document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden');
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

// --- INICIALIZACIÓN ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadData();

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => 
            l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term))
        );
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
}

// --- RENDERING ---
function renderLeads(list) {
    const container = document.getElementById('leadsListContainer');
    container.innerHTML = list.map(l => `
        <div onclick="window.viewDetails('${l.id}')" class="p-4 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center bg-white border-b border-slate-50 group border-l-4 border-transparent hover:border-blue-500">
            <div>
                <p class="font-bold text-slate-800 text-sm">${l.name}</p>
                <p class="text-[9px] text-slate-400 font-mono">${l.phone} • ${l.state || 'N/A'}</p>
            </div>
            <div class="text-right">
                <span class="text-[8px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-bold uppercase tracking-tighter">${l.status}</span>
                <p class="text-[8px] text-slate-300 mt-1 uppercase font-bold italic">${new Date(l.last_activity).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    document.getElementById('taskCountDisplay').innerText = list.length;
    container.innerHTML = list.map(t => {
        const priorityColor = t.priority === 'High' ? 'text-red-500' : (t.priority === 'Medium' ? 'text-orange-500' : 'text-slate-400');
        return `
            <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-blue-300 transition group">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[8px] font-bold uppercase ${priorityColor}">${t.priority} Priority</span>
                    <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-200 hover:text-emerald-500 transition"><i class="fa fa-check-circle text-xl"></i></button>
                </div>
                <h4 class="font-bold text-slate-800 text-sm">${t.title}</h4>
                <p class="text-[10px] text-blue-500 font-bold mt-2 uppercase italic">${t.leads ? t.leads.name : 'General Task'}</p>
            </div>
        `;
    }).join('');
}

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-emerald-50 p-5 rounded-xl border border-emerald-100 flex justify-between items-center hover:bg-emerald-100 transition">
            <div>
                <p class="text-[8px] font-bold text-emerald-600 uppercase italic mb-1">Appointment Scheduled</p>
                <h4 class="font-bold text-slate-800 text-sm">${a.title} with ${a.leads ? a.leads.name : 'Client'}</h4>
                <p class="text-[10px] text-slate-500 font-bold mt-1 uppercase">${new Date(a.appt_date).toLocaleString()}</p>
            </div>
            <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-emerald-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
        </div>
    `).join('');
}

// --- FICHA DE CONTACTO ---
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
    renderNotes(lead.notes);
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
    alert("Updated!");
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
    if (!fullText) { container.innerHTML = "<p class='text-[10px] text-slate-400 italic'>No logs yet.</p>"; return; }
    const notesArray = fullText.split('---').filter(n => n.trim() !== "");
    container.innerHTML = notesArray.reverse().map(n => `<div class="py-3 text-[10px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">${n.trim()}</div>`).join('');
}

// --- CREACIÓN ---
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { name: document.getElementById('lName').value, phone: document.getElementById('lPhone').value, state: document.getElementById('lState').value, status: 'New', last_activity: new Date().toISOString() };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert("Phone number already exists!");
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

// --- OTROS ---
window.filterStatus = (status) => {
    const filtered = status === 'all' ? allLeads : allLeads.filter(l => l.status === status);
    renderLeads(filtered);
};

function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const container = document.getElementById('tagListContainer');
    container.innerHTML = tags.map(t => `<button onclick="window.filterByTag('${t}')" class="w-full text-left py-1.5 px-4 text-[10px] text-slate-500 hover:text-white uppercase font-bold tracking-widest italic"># ${t}</button>`).join('');
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
    if (confirm("Delete this?")) {
        await supabase.from(table).delete().eq('id', id);
        if (table === 'leads') document.getElementById('detailsPanel').classList.add('hidden');
        loadData();
    }
};

init();
