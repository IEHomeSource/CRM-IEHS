import { supabase } from './config.js';

let allLeads = [];

window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.showSection = (name) => {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    document.getElementById('section' + name).classList.remove('hidden');
    document.getElementById('nav' + name).classList.add('active');
    document.getElementById('viewTitle').innerText = name;
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadLeads();
    loadTasks();
}

async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return;
    allLeads = data;
    renderLeads(data);
    renderTagsNav(data);
    updateTaskSelect(data);
}

function renderLeads(list) {
    const container = document.getElementById('leadsListContainer');
    container.innerHTML = list.map(l => `
        <div onclick="window.viewDetails('${l.id}')" class="p-4 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group border-l-4 border-transparent hover:border-blue-500">
            <div class="min-w-0">
                <p class="font-bold text-slate-800 truncate">${l.name}</p>
                <p class="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">${l.phone} | ${l.state || 'NO STATE'}</p>
            </div>
            <div class="flex gap-1">
                ${(l.tags || []).slice(0, 1).map(t => `<span class="bg-slate-100 text-slate-500 text-[8px] px-1.5 py-0.5 rounded font-bold">#${t}</span>`).join('')}
                <span class="text-[9px] px-2 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">${l.status}</span>
            </div>
        </div>
    `).join('');
}

window.viewDetails = (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name;
    document.getElementById('ePhone').value = lead.phone;
    document.getElementById('eEmail').value = lead.email;
    document.getElementById('eStatus').value = lead.status;
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eTags').value = (lead.tags || []).join(', ');
    document.getElementById('eNotes').value = lead.notes || '';
};

document.getElementById('updateLeadBtn').onclick = async () => {
    const id = document.getElementById('eId').value;
    const payload = {
        name: document.getElementById('eName').value,
        phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value,
        status: document.getElementById('eStatus').value,
        state: document.getElementById('eState').value,
        notes: document.getElementById('eNotes').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== "")
    };
    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) alert(error.message);
    else { loadLeads(); document.getElementById('detailsPanel').classList.add('hidden'); }
};

document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = {
        name: document.getElementById('lName').value,
        phone: document.getElementById('lPhone').value,
        email: document.getElementById('lEmail').value,
        state: document.getElementById('lState').value,
        notes: document.getElementById('lNotes').value,
        status: 'New'
    };
    const { error } = await supabase.from('leads').insert([payload]);
    if (error) alert("Duplicate phone or error");
    else { window.closeModal('leadModal'); loadLeads(); }
};

// --- LOGICA DE TAREAS Y BUSCADOR (Igual a la anterior pero adaptada) ---
async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*, leads(name)');
    const container = document.getElementById('tasksList');
    container.innerHTML = (data || []).map(t => `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
            <div>
                <p class="text-[9px] font-bold text-blue-500 uppercase">${t.leads ? t.leads.name : 'GENERAL'}</p>
                <p class="font-bold text-slate-700">${t.title}</p>
                <p class="text-[10px] text-slate-400 italic">${t.due_date || ''}</p>
            </div>
            <button onclick="window.deleteTask('${t.id}')" class="text-slate-300 hover:text-green-500"><i class="fa fa-check-circle text-xl"></i></button>
        </div>
    `).join('');
}

document.getElementById('saveTaskBtn').onclick = async () => {
    const payload = { title: document.getElementById('tTitle').value, lead_id: document.getElementById('tLeadId').value || null, due_date: document.getElementById('tDate').value };
    await supabase.from('tasks').insert([payload]);
    window.closeModal('taskModal'); loadTasks();
};

function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const container = document.getElementById('dynamicTags');
    container.innerHTML = '<p class="px-4 text-[10px] font-bold uppercase text-slate-500 mb-2">Smart Lists</p>';
    tags.forEach(t => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left py-1.5 px-4 text-[11px] hover:text-white transition";
        btn.innerHTML = `<i class="fa fa-tag mr-2 text-[8px]"></i> ${t}`;
        btn.onclick = () => { 
            const filtered = allLeads.filter(l => l.tags.includes(t));
            renderLeads(filtered);
            document.getElementById('viewTitle').innerText = "TAG: " + t;
        };
        container.appendChild(btn);
    });
}

function updateTaskSelect(leads) {
    const select = document.getElementById('tLeadId');
    select.innerHTML = '<option value="">Link to Lead</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
}

window.deleteLead = async (id) => { if(confirm("Delete?")) { await supabase.from('leads').delete().eq('id', id); loadLeads(); document.getElementById('detailsPanel').classList.add('hidden'); } };
window.deleteTask = async (id) => { await supabase.from('tasks').delete().eq('id', id); loadTasks(); };

init();
