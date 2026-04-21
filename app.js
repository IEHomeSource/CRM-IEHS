// app.js - Full Integration Logic
import { supabase } from './config.js';

let allLeads = []; // Memory store

/**
 * INITIAL LOAD
 */
document.addEventListener('DOMContentLoaded', () => {
    loadLeads();
    // Logic for search bar
    document.getElementById('searchInput').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allLeads.filter(l => 
            l.name.toLowerCase().includes(term) || (l.phone && l.phone.includes(term))
        );
        renderLeads(filtered);
    };
});

/**
 * MAIN LOAD FUNCTION
 */
async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    
    allLeads = data;
    renderLeads(data);
    updateCounters(data);
    renderTagsNav(data);
}

/**
 * RENDER LEADS TABLE
 */
function renderLeads(list) {
    const tbody = document.getElementById('leadsTableBody');
    tbody.innerHTML = list.map(lead => `
        <tr class="hover:bg-slate-50 transition text-sm">
            <td class="p-4">
                <p class="font-bold text-slate-800">${lead.name}</p>
                <p class="text-[10px] text-slate-400">${lead.email || ''}</p>
            </td>
            <td class="p-4 text-[10px] text-slate-500">
                ${lead.city || ''} ${lead.state || ''}
            </td>
            <td class="p-4 font-mono text-xs text-blue-600 font-bold">${lead.phone || 'N/A'}</td>
            <td class="p-4">
                ${(lead.tags || []).map(t => `<span class="bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-full mr-1 font-bold uppercase">#${t}</span>`).join('')}
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-[10px] font-bold ${lead.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}">${lead.status}</span>
            </td>
            <td class="p-4 text-center">
                <button onclick="deleteLead('${lead.id}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa fa-trash text-xs"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * COUNTERS & STATS
 */
function updateCounters(data) {
    document.getElementById('totalCount').innerText = data.length;
    document.getElementById('closedCount').innerText = data.filter(l => l.status === 'Closed').length;
}

/**
 * TAGS NAVIGATION (GHL STYLE)
 */
function renderTagsNav(data) {
    const tags = [...new Set(data.flatMap(l => l.tags || []))];
    const nav = document.getElementById('tagsListNav');
    // Keep header
    nav.innerHTML = '<p class="px-3 text-[10px] font-bold text-slate-500 uppercase mb-2">Smart Lists (Tags)</p>';
    
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = "w-full flex items-center py-1.5 px-4 rounded hover:bg-slate-800 text-xs text-slate-400 transition";
        btn.innerHTML = `<i class="fa fa-tag mr-2 text-[9px]"></i> ${tag}`;
        btn.onclick = () => filterByTag(tag);
        nav.appendChild(btn);
    });
}

window.filterByTag = (tag) => {
    const filtered = tag === 'all' ? allLeads : allLeads.filter(l => l.tags.includes(tag));
    document.getElementById('viewTitle').innerText = tag === 'all' ? 'All Leads' : `Tag: ${tag}`;
    renderLeads(filtered);
};

/**
 * SAVE NEW LEAD (WITH DUPLICATE PHONE CHECK)
 */
document.getElementById('saveLeadBtn').onclick = async () => {
    const payload = {
        name: document.getElementById('lName').value,
        email: document.getElementById('lEmail').value,
        phone: document.getElementById('lPhone').value,
        address: document.getElementById('lAddress').value,
        city: document.getElementById('lCity').value,
        state: document.getElementById('lState').value,
        zip_code: document.getElementById('lZip').value,
        status: document.getElementById('lStatus').value,
        notes: document.getElementById('lNotes').value,
        tags: document.getElementById('lTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
    };

    if (!payload.name || !payload.phone) return alert("Name and Phone are mandatory!");

    const { error } = await supabase.from('leads').insert([payload]);

    if (error) {
        if (error.code === '23505') alert("⚠️ DUPLICATE PHONE: This lead already exists.");
        else alert("Error: " + error.message);
    } else {
        alert("Lead saved!");
        location.reload();
    }
};

/**
 * BULK IMPORT (CSV/EXCEL)
 */
document.getElementById('csvFileInput').onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async function(event) {
        const text = event.target.result;
        const rows = text.split('\n').slice(1); 
        const leads = rows.filter(r => r.trim() !== '').map(row => {
            const c = row.split(',');
            return { name: c[0], phone: c[1], status: 'New' };
        });
        const { error } = await supabase.from('leads').insert(leads);
        if (error) alert("Import Error: Make sure no phone numbers are duplicated.");
        else { alert("Import Successful!"); loadLeads(); }
    };
    reader.readAsText(file);
};

/**
 * DELETE LEAD
 */
window.deleteLead = async (id) => {
    if(confirm("Delete this contact?")) {
        await supabase.from('leads').delete().eq('id', id);
        loadLeads();
    }
};

/**
 * LOGOUT
 */
document.getElementById('logoutBtn').onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
};
