// app.js - Lead Management Logic
import { supabase } from './config.js';

let allLeads = []; // Global store for filtering

/**
 * FETCH AND RENDER LEADS
 */
async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    
    allLeads = data;
    renderLeads(allLeads);
    renderTagsNav(data);
}

function renderLeads(leadsList) {
    const tbody = document.getElementById('leadsTableBody');
    tbody.innerHTML = leadsList.map(lead => `
        <tr class="hover:bg-slate-50 transition text-sm">
            <td class="p-4">
                <p class="font-bold">${lead.name}</p>
                <p class="text-[10px] text-slate-400">${lead.email || 'No email'}</p>
            </td>
            <td class="p-4 text-xs">
                ${lead.city || ''}, ${lead.state || ''} ${lead.zip_code || ''}
            </td>
            <td class="p-4 font-mono text-xs">${lead.phone || 'N/A'}</td>
            <td class="p-4">
                ${(lead.tags || []).map(t => `<span class="bg-blue-100 text-blue-600 text-[9px] px-2 py-0.5 rounded-full mr-1 font-bold uppercase">${t}</span>`).join('')}
            </td>
            <td class="p-4"><span class="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded">${lead.status}</span></td>
            <td class="p-4 text-center">
                <button onclick="deleteLead('${lead.id}')" class="text-slate-300 hover:text-red-500"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * TAG FILTERING (GHL DASHBOARD STYLE)
 */
function renderTagsNav(data) {
    const allTags = [...new Set(data.flatMap(l => l.tags || []))];
    const nav = document.getElementById('tagsListNav');
    nav.innerHTML = '<p class="px-4 text-[10px] font-bold uppercase text-slate-500 mb-2">Filter by Tags</p>';
    
    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = "w-full flex items-center py-2 px-4 rounded-lg hover:text-white text-sm";
        btn.innerHTML = `<i class="fa fa-tag w-6 text-[10px]"></i> ${tag}`;
        btn.onclick = () => filterByTag(tag);
        nav.appendChild(btn);
    });
}

window.filterByTag = (tag) => {
    document.getElementById('viewTitle').innerText = tag === 'all' ? 'All Leads' : `Tag: ${tag}`;
    const filtered = tag === 'all' ? allLeads : allLeads.filter(l => l.tags.includes(tag));
    renderLeads(filtered);
};

/**
 * SAVE LEAD WITH DUPLICATE CHECK
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
        notes: document.getElementById('lNotes').value,
        tags: document.getElementById('lTags').value.split(',').map(t => t.trim()).filter(t => t !== ""),
    };

    const { error } = await supabase.from('leads').insert([payload]);

    if (error) {
        if (error.code === '23505') { // Postgres code for unique violation
            alert("ERROR: This phone number is already assigned to another lead.");
        } else {
            alert("Error: " + error.message);
        }
    } else {
        alert("Lead saved successfully!");
        location.reload();
    }
};

/**
 * DELETE LEAD
 */
window.deleteLead = async (id) => {
    if(confirm("Delete lead?")) {
        await supabase.from('leads').delete().eq('id', id);
        loadLeads();
    }
};

// Initial Load
document.addEventListener('DOMContentLoaded', loadLeads);
