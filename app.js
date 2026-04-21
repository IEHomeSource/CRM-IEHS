import { supabase } from './config.js';

let allLeads = [];

// --- UI HELPERS ---
window.openModal = (id) => {
    // Si abrimos para crear algo nuevo, nos aseguramos de que los IDs de edición estén vacíos
    if(id === 'taskModal' && !document.getElementById('tEditId').value) { 
        document.getElementById('taskTitleHeader').innerText = "New Task"; 
    }
    if(id === 'apptModal' && !document.getElementById('aEditId').value) { 
        document.getElementById('apptTitleHeader').innerText = "New Appointment"; 
    }
    document.getElementById(id).classList.remove('hidden');
};

window.closeModal = (id) => {
    // Limpiamos los campos de edición al cerrar
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
                <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs border uppercase">${l.name.substring(0,2)}</div>
                <div><p class="font-bold text-slate-800 text-sm">${l.name}</p><p class="text-xs text-slate-400 font-mono">${l.phone} • ${l.state || 'N/A'}</p></div>
            </div>
            <div class="text-right text-[10px] font-bold uppercase"><span class="px-2 py-1 rounded-full ${l.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${l.status}</span></div>
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
};

// --- EDIT LOGIC (CARGA DATOS EN MODAL) ---
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

window.editAppt = async (id) => {
    const { data: appt } = await supabase.from('appointments').select('*').eq('id', id).single();
    if(appt) {
        document.getElementById('aEditId').value = appt.id;
        document.getElementById('aTitle').value = appt.title;
        document.getElementById('aLeadId').value = appt.lead_id || "";
        if(appt.appt_date) {
            const d = new Date(appt.appt_date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            document.getElementById('aDate').value = d.toISOString().slice(0, 16);
        }
        document.getElementById('apptTitleHeader').innerText = "Edit Appt";
        window.openModal('apptModal');
    }
};

// --- SAVE LOGIC (AQUÍ ESTÁ EL ARREGLO DEL REEMPLAZO) ---
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = { 
        name: document.getElementById('lName').value, phone: document.getElementById('lPhone').value, 
        email: document.getElementById('lEmail').value, address: document.getElementById('lAddress').value,
        zip_code: document.getElementById('lZip').value, state: document.getElementById('lState').value,
        notes: document.getElementById('lNotes').value, status: 'New', last_activity: new Date().toISOString() 
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

    // EL ARREGLO: Si hay ID, actualizamos (update). Si no, creamos (insert).
    const { error } = editId 
        ? await supabase.from('tasks').update(payload).eq('id', editId) 
        : await supabase.from('tasks').insert([payload]);
    
    if (error) alert(error.message); else { window.closeModal('taskModal'); loadData(); }
};

document.getElementById('saveApptBtn').onclick = async () => {
    const editId = document.getElementById('aEditId').value;
    const payload = { 
        title: document.getElementById('aTitle').value, 
        appt_date: document.getElementById('aDate').value, 
        lead_id: document.getElementById('aLeadId').value || null 
    };

    // EL ARREGLO: Si hay ID, actualizamos (update). Si no, creamos (insert).
    const { error } = editId 
        ? await supabase.from('appointments').update(payload).eq('id', editId) 
        : await supabase.from('appointments').insert([payload]);

    if (error) alert(error.message); else { window.closeModal('apptModal'); loadData(); }
};

function renderTasks(list) {
    const container = document.getElementById('tasksList');
    container.innerHTML = list.map(t => `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 border-l-4 ${t.priority === 'High' ? 'border-l-red-500' : 'border-l-blue-500'} shadow-sm">
            <div class="flex justify-between items-start mb-4">
                <span class="text-[10px] font-bold uppercase text-slate-400">${t.priority} Priority</span>
                <div class="flex gap-2">
                    <button onclick="window.editTask('${t.id}')" class="text-slate-300 hover:text-blue-500 transition"><i class="fa fa-edit"></i></button>
                    <button onclick="window.deleteItem('tasks', '${t.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-check-circle text-xl"></i></button>
                </div>
            </div>
            <h4 class="font-bold text-slate-800">${t.title}</h4>
            <p class="text-[10px] text-blue-500 mt-2 font-bold uppercase tracking-tighter italic">Lead: ${t.leads ? t.leads.name : 'General'}</p>
        </div>
    `).join('');
}

function renderAppts(list) {
    const container = document.getElementById('apptsList');
    container.innerHTML = list.map(a => `
        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-6">
                <div class="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100"><i class="fa fa-calendar-check text-xl"></i></div>
                <div><h4 class="font-bold text-slate-800 text-lg">${a.title}</h4><p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Client: ${a.leads ? a.leads.name : 'N/A'}</p><p class="text-[10px] text-emerald-600 font-bold mt-1 uppercase">${new Date(a.appt_date).toLocaleString()}</p></div>
            </div>
            <div class="flex gap-4 px-4">
                <button onclick="window.editAppt('${a.id}')" class="text-slate-300 hover:text-blue-500 transition"><i class="fa fa-edit text-xl"></i></button>
                <button onclick="window.deleteItem('appointments', '${a.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-trash text-xl"></i></button>
            </div>
        </div>
    `).join('');
}

function updateSelects(leads) {
    const options = '<option value="">General / No Link</option>' + leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    document.getElementById('tLeadId').innerHTML = options;
    document.getElementById('aLeadId').innerHTML = options;
}

window.deleteItem = async (table, id) => {
    if (confirm("Delete?")) { await supabase.from(table).delete().eq('id', id); loadData(); }
};

init();
