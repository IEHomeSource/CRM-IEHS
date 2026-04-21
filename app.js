import { supabase } from './config.js';

let allLeads = [];

window.openModal = (id) => {
    if(id === 'taskModal') { 
        document.getElementById('tEditId').value = ""; 
        document.getElementById('taskTitleHeader').innerText = "New Task";
    }
    document.getElementById(id).classList.remove('hidden');
};

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

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    loadData();
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term)));
        renderLeads(filtered);
    };
}

async function loadData() {
    const leadsRes = await supabase.from('leads').select('*').order('last_activity', { ascending: false });
    const tasksRes = await supabase.from('tasks').select('*, leads(name)');
    const apptsRes = await supabase.from('appointments').select('*, leads(name)').order('appt_date', { ascending: true });

    allLeads = leadsRes.data || [];
    renderLeads(allLeads);
    renderTasks(tasksRes.data || []);
    renderAppts(apptsRes.data || []);
    updateSelects(allLeads);
    
    document.getElementById('statLeads').innerText = allLeads.length;
    document.getElementById('statTasks').innerText = (tasksRes.data || []).length;
    document.getElementById('statAppts').innerText = (apptsRes.data || []).length;
}

function renderLeads(list) {
    const container = document.getElementById('leadsList');
    container.innerHTML = list.map(l => `
        <div onclick="window.viewDetails('${l.id}')" class="p-5 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center bg-white border-b border-l-4 border-transparent hover:border-blue-500">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs border">${l.name.substring(0,2).toUpperCase()}</div>
                <div>
                    <p class="font-bold text-slate-800">${l.name}</p>
                    <p class="text-xs text-slate-400 font-mono">${l.phone} • ${l.state || 'N/A'}</p>
                </div>
            </div>
            <div class="text-right text-[10px] font-bold uppercase">
                <span class="px-2 py-1 rounded-full ${l.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${l.status}</span>
            </div>
        </div>
    `).join('');
}

window.viewDetails = async (id) => {
    const lead = allLeads.find(l => l.id === id);
    if (!lead) return;
    document.getElementById('detailsPanel').classList.remove('hidden');
    document.getElementById('eId').value = lead.id;
    document.getElementById('eName').value = lead.name;
    document.getElementById('ePhone').value = lead.phone;
    document.getElementById('eEmail').value = lead.email || "";
    document.getElementById('eState').value = lead.state || "TX";
    document.getElementById('eStatus').value = lead.status;
    document.getElementById('notesHistory').innerHTML = `<div class="p-4 text-sm text-slate-500">${lead.notes || "No notes yet."}</div>`;
};

// --- TASK EDITING LOGIC ---
window.editTask = async (id) => {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', id).single();
    if(task) {
        document.getElementById('tEditId').value = task.id;
        document.getElementById('tTitle').value = task.title;
        document.getElementById('tPriority').value = task.priority;
        document.getElementById('tLeadId').value = task.lead_id || "";
        document.getElementById('tDate').value = task.due_date || "";
        document.getElementById('taskTitleHeader').innerText = "Edit Task";
        window.openModal('taskModal');
    }
};

document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { 
        name: document.getElementById('lName').value, 
        phone: document.getElementById('lPhone').value, 
        email: document.getElementById('lEmail').value,
        address: document.getElementById('lAddress').value,
        zip_code: document.getElementById('lZip').value,
        state: document.getElementById('lState').value,
        notes: document.getElementById('lNotes').value,
        status: 'New', last_activity: new Date().toISOString() 
    };
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
    const { error } = editId 
        ? await supabase.from('tasks').update(payload).eq('id', editId) 
        : await supabase.from('tasks').insert([payload]);
    
    if (error) alert(error.message); else { window.closeModal('taskModal'); loadData(); }
};

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    container.innerHTML = list.map(t => `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 border-l-4 ${t.priority === 'High' ? 'border-l-red-500' : 'border-l-blue-500'} shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <span class="text-[10px] font-bold uppercase text-slate-400">${t.priority} Priority</span>
                <div class="flex gap-2">
                    <button onclick="window.editTask('${t.id}')" class="text-slate-300 hover:text-blue-500"><i class="fa fa-edit"></i></button>
                    <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-300 hover:text-red-500"><i class="fa fa-check-circle text-xl"></i></button>
                </div>
            </div>
            <h4 class="font-bold text-slate-800">${t.title}</h4>
            <p class="text-[10px] text-blue-500 mt-2">Linked: ${t.leads ? t.leads.name : 'None'}</p>
        </div>
    `).join('');
}

function updateSelects(leads) {
    const options = '<option value="">No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
}

window.deleteItem = async (table, id) => {
    if (confirm("Delete?")) { await supabase.from(table).delete().eq('id', id); loadData(); }
};

init();
