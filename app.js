// app.js - Full GHL Functional Logic
import { supabase } from './config.js';

let allLeads = []; // Global lead storage

/**
 * INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', () => {
    loadLeads();
    loadTasks();

    // Search Logic
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => 
            l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term))
        );
        renderLeads(filtered);
    };
});

/**
 * DATA LOADING FUNCTIONS
 */
async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    
    allLeads = data;
    renderLeads(data);
    updateCounters(data);
    renderTagsNav(data);
    updateLeadSelectors(data); // Fill dropdown for tasks
}

async function loadTasks() {
    const { data, error } = await supabase.from('tasks').select('*, leads(name)').order('due_date', { ascending: true });
    if (error) return console.error(error);
    renderTasks(data);
}

/**
 * RENDER LEADS TABLE
 */
function renderLeads(list) {
    const tbody = document.getElementById('leadsTableBody');
    tbody.innerHTML = list.map(lead => `
        <tr class="hover:bg-blue-50 transition cursor-pointer group" onclick="viewLeadDetails('${lead.id}')">
            <td class="p-4 font-bold text-slate-800">
                ${lead.name}
                <p class="text-[10px] text-slate-400 font-normal uppercase tracking-wider">${lead.status}</p>
            </td>
            <td class="p-4 text-xs font-mono text-blue-600 font-bold">${lead.phone || 'N/A'}</td>
            <td class="p-4 text-[10px] text-slate-500">${lead.city || ''}, ${lead.state || ''}</td>
            <td class="p-4">
                ${(lead.tags || []).map(t => `<span class="bg-blue-100 text-blue-600 text-[9px] px-2 py-0.5 rounded-full mr-1 font-bold uppercase tracking-tighter">#${t}</span>`).join('')}
            </td>
            <td class="p-4 text-center">
                <button onclick="event.stopPropagation(); deleteLead('${lead.id}')" class="text-slate-200 hover:text-red-500 transition"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * LEAD DETAIL VIEW (THE GHL "DRAWER")
 */
window.viewLeadDetails = async (id) => {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single();
    if (lead) {
        document.getElementById('editId').value = lead.id;
        document.getElementById('eName').value = lead.name;
        document.getElementById('ePhone').value = lead.phone;
        document.getElementById('eEmail').value = lead.email;
        document.getElementById('eStatus').value = lead.status;
        document.getElementById('eTags').value = (lead.tags || []).join(', ');
        document.getElementById('eNotes').value = lead.notes || '';
        document.getElementById('detailModal').classList.remove('hidden');
    }
};

/**
 * RENDER TASKS LIST
 */
function renderTasks(tasks) {
    const container = document.getElementById('tasksList');
    document.getElementById('taskCountDisplay').innerText = tasks.length;

    if (tasks.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-300">No active tasks found.</div>`;
        return;
    }

    container.innerHTML = tasks.map(t => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
                <p class="text-xs font-bold uppercase text-slate-400">Assigned Lead: ${t.leads ? t.leads.name : 'General'}</p>
                <h4 class="font-bold text-slate-800 mt-1">${t.title}</h4>
                <p class="text-[10px] text-blue-600 font-bold italic"><i class="fa fa-clock"></i> Due: ${t.due_date || 'No Date'}</p>
            </div>
            <button onclick="deleteItem('tasks', '${t.id}')" class="text-slate-200 hover:text-red-500"><i class="fa fa-check-circle text-2xl"></i></button>
        </div>
    `).join('');
}

/**
 * SAVE LEAD
 */
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = {
        name: document.getElementById('lName').value,
        phone: document.getElementById('lPhone').value,
        email: document.getElementById('lEmail').value,
        address: document.getElementById('lAddress').value,
        city: document.getElementById('lCity').value,
        state: document.getElementById('lState').value,
        zip_code: document.getElementById('lZip').value,
        status: document.getElementById('lStatus').value,
        notes: document.getElementById('lNotes').value,
        tags: document.getElementById('lTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
    };

    if (!payload.name || !payload.phone) return alert("Missing Info: Name and Phone are required.");

    const { error } = await supabase.from('leads').insert([payload]);
    if (error) {
        if (error.code === '23505') alert("Error: A lead with this phone already exists.");
        else alert(error.message);
    } else {
        alert("Lead created successfully!");
        location.reload();
    }
};

/**
 * SAVE TASK
 */
document.getElementById('saveTaskBtn').onclick = async () => {
    const title = document.getElementById('tTitle').value;
    const leadId = document.getElementById('tLeadId').value;
    const date = document.getElementById('tDate').value;

    if (!title) return alert("Task title is required.");

    const { error } = await supabase.from('tasks').insert([{
        title: title,
        lead_id: leadId === "" ? null : leadId,
        due_date: date
    }]);

    if (error) alert(error.message);
    else {
        alert("Task created!");
        document.getElementById('taskModal').classList.add('hidden');
        loadTasks();
    }
};

/**
 * UPDATE LEAD (FROM DETAIL VIEW)
 */
document.getElementById('updateLeadBtn').onclick = async () => {
    const id = document.getElementById('editId').value;
    const payload = {
        name: document.getElementById('eName').value,
        phone: document.getElementById('ePhone').value,
        email: document.getElementById('eEmail').value,
        status: document.getElementById('eStatus').value,
        notes: document.getElementById('eNotes').value,
        tags: document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
    };

    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) alert(error.message);
    else {
        alert("Contact updated.");
        document.getElementById('detailModal').classList.add('hidden');
        loadLeads();
    }
};

/**
 * UI HELPERS
 */
function updateCounters(data) {
    document.getElementById('totalCount').innerText = data.length;
    document.getElementById('closedCount').innerText = data.filter(l => l.status === 'Closed').length;
}

function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const nav = document.getElementById('tagsListNav');
    nav.innerHTML = '<p class="px-3 text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Smart Lists (Tags)</p>';
    
    // Add Show All button
    const allBtn = document.createElement('button');
    allBtn.className = "w-full text-left py-2 px-4 text-[12px] hover:text-white transition";
    allBtn.innerText = "All Contacts";
    allBtn.onclick = () => filterByTag('all');
    nav.appendChild(allBtn);

    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = "w-full flex items-center py-2 px-4 rounded hover:bg-slate-800 text-[11px] text-slate-400 transition";
        btn.innerHTML = `<i class="fa fa-tag mr-2 text-[9px]"></i> ${tag}`;
        btn.onclick = () => filterByTag(tag);
        nav.appendChild(btn);
    });
}

window.filterByTag = (tag) => {
    document.getElementById('viewTitle').innerText = tag === 'all' ? 'All Leads' : `Tag: ${tag}`;
    const filtered = tag === 'all' ? allLeads : allLeads.filter(l => (l.tags || []).includes(tag));
    renderLeads(filtered);
};

function updateLeadSelectors(leads) {
    const select = document.getElementById('tLeadId');
    const options = leads.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    select.innerHTML = `<option value="">General / No Lead</option>` + options;
}

window.deleteLead = async (id) => {
    if(confirm("Delete contact permanently?")) {
        await supabase.from('leads').delete().eq('id', id);
        loadLeads();
    }
};

window.deleteItem = async (table, id) => {
    if(confirm("Mark as completed/deleted?")) {
        await supabase.from(table).delete().eq('id', id);
        if (table === 'tasks') loadTasks();
    }
};

document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
};
