// app.js - CRM Logic Engine
import { supabase } from './config.js';

/**
 * STARTUP LOAD
 */
document.addEventListener('DOMContentLoaded', () => {
    loadLeads();
});

/**
 * FETCH AND DISPLAY LEADS
 */
async function loadLeads() {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (error) return console.error(error);

    const tbody = document.getElementById('leadsTableBody');
    tbody.innerHTML = data.map(lead => `
        <tr class="border-b hover:bg-slate-50 transition">
            <td class="p-4 font-bold text-slate-800 cursor-pointer hover:text-blue-600" onclick="viewLeadDetails('${lead.id}')">
                ${lead.name}
            </td>
            <td class="p-4">
                ${(lead.tags || []).map(tag => `<span class="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full mr-1 uppercase font-bold">${tag}</span>`).join('')}
            </td>
            <td class="p-4 font-medium text-sm text-slate-600">${lead.status}</td>
            <td class="p-4 text-center flex justify-center gap-3">
                <button onclick="viewLeadDetails('${lead.id}')" class="text-slate-400 hover:text-blue-600"><i class="fa fa-eye"></i></button>
                <button onclick="deleteLead('${lead.id}')" class="text-slate-400 hover:text-red-600"><i class="fa fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * SINGLE VIEW: EDIT LEAD
 */
window.viewLeadDetails = async (id) => {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single();
    if (lead) {
        document.getElementById('editLeadId').value = lead.id;
        document.getElementById('editLeadName').value = lead.name;
        document.getElementById('editLeadTags').value = lead.tags ? lead.tags.join(', ') : '';
        document.getElementById('editLeadStatus').value = lead.status;
        document.getElementById('editLeadModal').classList.remove('hidden');
    }
};

document.getElementById('updateLeadBtn').onclick = async () => {
    const id = document.getElementById('editLeadId').value;
    const name = document.getElementById('editLeadName').value;
    const tags = document.getElementById('editLeadTags').value.split(',').map(t => t.trim());
    const status = document.getElementById('editLeadStatus').value;

    const { error } = await supabase.from('leads').update({ name, tags, status }).eq('id', id);
    
    if (error) alert(error.message);
    else {
        document.getElementById('editLeadModal').classList.add('hidden');
        loadLeads();
    }
};

/**
 * BULK IMPORT (CSV)
 */
document.getElementById('csvFileInput').onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async function(event) {
        const text = event.target.result;
        const rows = text.split('\n').slice(1); // Skip CSV header
        
        const leads = rows.filter(row => row.trim() !== '').map(row => {
            const cols = row.split(',');
            return { name: cols[0], address: cols[1], status: 'New' };
        });

        const { error } = await supabase.from('leads').insert(leads);
        if (error) alert("Import Error: " + error.message);
        else { alert("Import Successful!"); loadLeads(); }
    };
    reader.readAsText(file);
};

/**
 * DELETE LOGIC
 */
window.deleteLead = async (id) => {
    if(confirm('Delete lead?')) {
        await supabase.from('leads').delete().eq('id', id);
        loadLeads();
    }
};

/**
 * CREATE NEW LEAD
 */
document.getElementById('saveLeadBtn').onclick = async () => {
    const name = document.getElementById('leadName').value;
    const address = document.getElementById('leadAddress').value;
    const status = document.getElementById('leadStatus').value;

    const { error } = await supabase.from('leads').insert([{ name, address, status }]);
    if (error) alert(error.message);
    else {
        document.getElementById('leadModal').classList.add('hidden');
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