/* ============================================================
   ANTIGRAVITY HR — Recruitment Pipeline Module
   ============================================================ */

const RecruitmentModule = (() => {
  let currentTab = 'jobs';
  let selectedJob = null;

  function render() {
    const main = document.getElementById('main-content');
    const jobs = Store.getAll('jobPostings');
    const openJobs = jobs.filter(j => j.status === 'open');
    const totalCandidates = Store.getTotalCandidates();
    const hiredCount = jobs.reduce((sum, j) => sum + (j.candidates || []).filter(c => c.stage === 'hired').length, 0);

    main.innerHTML = `
      ${UI.pageHeader('Recruitment', `${openJobs.length} open positions · ${totalCandidates} candidates`,
        `<button class="btn btn-primary" onclick="RecruitmentModule.openPostJobModal()">
          <span>+</span> Post New Job
        </button>`
      )}

      <div class="hiring-stats stagger-children">
        <div class="hiring-stat-card glass">
          <div class="hiring-stat-value" style="color:var(--primary-400)">${openJobs.length}</div>
          <div class="hiring-stat-label">Open Positions</div>
        </div>
        <div class="hiring-stat-card glass">
          <div class="hiring-stat-value" style="color:var(--accent-400)">${totalCandidates}</div>
          <div class="hiring-stat-label">Total Candidates</div>
        </div>
        <div class="hiring-stat-card glass">
          <div class="hiring-stat-value" style="color:var(--success-400)">${hiredCount}</div>
          <div class="hiring-stat-label">Hired</div>
        </div>
        <div class="hiring-stat-card glass">
          <div class="hiring-stat-value" style="color:var(--warning-400)">${jobs.reduce((s,j)=>(j.candidates||[]).filter(c=>c.stage==='interview').length+s,0)}</div>
          <div class="hiring-stat-label">In Interview</div>
        </div>
      </div>

      ${UI.tabs([
        { id: 'jobs', label: '💼 Job Postings' },
        { id: 'pipeline', label: '🔄 Pipeline' },
        { id: 'candidates', label: '👤 All Candidates' }
      ], currentTab, 'RecruitmentModule.switchTab')}

      <div id="recruitment-content"></div>
    `;

    renderTab();
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab').forEach(t => {
      const labels = { jobs: 'Job Postings', pipeline: 'Pipeline', candidates: 'All Candidates' };
      t.classList.toggle('active', t.textContent.includes(labels[tabId]));
    });
    renderTab();
  }

  function renderTab() {
    const container = document.getElementById('recruitment-content');
    if (!container) return;

    switch (currentTab) {
      case 'jobs': renderJobs(container); break;
      case 'pipeline': renderPipeline(container); break;
      case 'candidates': renderCandidates(container); break;
    }
  }

  function renderJobs(container) {
    const jobs = Store.getAll('jobPostings');

    container.innerHTML = `<div class="job-cards stagger-children animate-fade-in-up">
      ${jobs.map((job, idx) => `
        <div class="job-card glass" style="animation-delay:${idx * 60}ms" onclick="RecruitmentModule.showJobDetail('${job.id}')">
          <div class="job-card-header">
            <div>
              <div class="job-card-title">${job.title}</div>
              <div class="job-card-dept">${job.department} · ${job.location || 'Remote'}</div>
            </div>
            ${UI.statusBadge(job.status)}
          </div>
          <p class="text-sm text-secondary" style="margin-bottom:var(--sp-2)">${job.description.slice(0, 100)}...</p>
          <div class="job-card-meta">
            <span>👥 ${(job.candidates || []).length} candidates</span>
            <span>📅 Posted ${job.postedDate}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderPipeline(container) {
    const jobs = Store.getAll('jobPostings').filter(j => j.status === 'open');
    const allCandidates = [];
    jobs.forEach(j => {
      (j.candidates || []).forEach(c => {
        allCandidates.push({ ...c, jobTitle: j.title, jobId: j.id });
      });
    });

    const stages = ['applied', 'screening', 'interview', 'offer', 'hired'];
    const stageLabels = { applied: 'Applied', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired' };
    const stageColors = { applied: 'var(--info-400)', screening: 'var(--primary-400)', interview: 'var(--warning-400)', offer: 'var(--success-400)', hired: 'var(--accent-400)' };

    container.innerHTML = `<div class="kanban-board animate-fade-in-up">
      ${stages.map(stage => {
        const candidates = allCandidates.filter(c => c.stage === stage);
        return `<div class="kanban-column">
          <div class="kanban-column-header">
            <div class="kanban-column-title">
              <span style="color:${stageColors[stage]}">●</span>
              ${stageLabels[stage]}
            </div>
            <span class="kanban-column-count">${candidates.length}</span>
          </div>
          ${candidates.length === 0 ?
            '<p class="text-xs text-tertiary" style="text-align:center;padding:var(--sp-4)">No candidates</p>' :
            candidates.map(c => `
              <div class="kanban-card" onclick="RecruitmentModule.openCandidateModal('${c.jobId}','${c.id}')">
                <div class="kanban-card-name">${c.name}</div>
                <div class="kanban-card-meta">${c.jobTitle}</div>
                <div class="kanban-card-meta">${c.email}</div>
              </div>
            `).join('')
          }
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderCandidates(container) {
    const jobs = Store.getAll('jobPostings');
    const allCandidates = [];
    jobs.forEach(j => {
      (j.candidates || []).forEach(c => {
        allCandidates.push({ ...c, jobTitle: j.title, jobId: j.id, department: j.department });
      });
    });

    const columns = [
      { label: 'Name', key: 'name', render: (row) => `<div class="employee-cell">
        ${UI.avatar(row.name, Store.AVATAR_COLORS[parseInt(row.id.slice(1)) % Store.AVATAR_COLORS.length], 'sm')}
        <div><div class="name">${row.name}</div><div class="email">${row.email}</div></div>
      </div>` },
      { label: 'Position', key: 'jobTitle' },
      { label: 'Department', key: 'department' },
      { label: 'Applied', key: 'appliedDate' },
      { label: 'Stage', key: 'stage', render: (row) => UI.statusBadge(row.stage) },
      {
        label: 'Actions', key: 'actions',
        render: (row) => `<div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" onclick="RecruitmentModule.openCandidateModal('${row.jobId}','${row.id}')">View</button>
          ${row.stage !== 'hired' && row.stage !== 'rejected' ?
            `<button class="btn btn-primary btn-sm" onclick="RecruitmentModule.advanceCandidate('${row.jobId}','${row.id}')">Advance →</button>` : ''
          }
        </div>`
      }
    ];

    container.innerHTML = `<div class="animate-fade-in-up">
      ${UI.dataTable(columns, allCandidates, { id: 'candidates-table', page: 1, perPage: 10 })}
    </div>`;
  }

  // ---- Actions ----
  function showJobDetail(jobId) {
    const job = Store.getById('jobPostings', jobId);
    if (!job) return;

    const body = `
      <div style="margin-bottom:var(--sp-4)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--sp-3)">
          <div>
            <h3 style="font-weight:600;font-size:var(--text-lg)">${job.title}</h3>
            <p class="text-sm text-secondary">${job.department} · ${job.location || 'Remote'}</p>
          </div>
          ${UI.statusBadge(job.status)}
        </div>
        <p class="text-sm" style="color:var(--text-secondary);margin-bottom:var(--sp-4)">${job.description}</p>
        <h4 class="font-semibold text-sm" style="margin-bottom:var(--sp-2)">Requirements</h4>
        <ul style="list-style:disc;padding-left:var(--sp-5);margin-bottom:var(--sp-4)">
          ${job.requirements.map(r => `<li class="text-sm text-secondary" style="margin-bottom:var(--sp-1)">${r}</li>`).join('')}
        </ul>
        <h4 class="font-semibold text-sm" style="margin-bottom:var(--sp-2)">Candidates (${(job.candidates||[]).length})</h4>
        ${(job.candidates || []).map(c => `
          <div class="flex items-center gap-3" style="padding:var(--sp-2) 0;border-bottom:1px solid var(--glass-border)">
            ${UI.avatar(c.name, Store.AVATAR_COLORS[parseInt(c.id.slice(1)) % Store.AVATAR_COLORS.length], 'sm')}
            <div class="flex-1">
              <div class="text-sm font-medium">${c.name}</div>
              <div class="text-xs text-tertiary">${c.email}</div>
            </div>
            ${UI.statusBadge(c.stage)}
          </div>
        `).join('')}
      </div>
    `;

    UI.openModal('Job Details', body,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
  }

  function openPostJobModal() {
    const n8n = Store.getN8nSettings();
    const isN8nActive = n8n && n8n.enabled && n8n.webhookUrl;

    const body = `
      <div class="form-group">
        <label class="form-label">Job Title</label>
        <input class="form-input" id="job-title" placeholder="e.g. Senior React Developer">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Department</label>
          <select class="form-select" id="job-dept">
            <option value="">Select</option>
            ${['Engineering','Design','HR','Marketing','Sales','Finance'].map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <input class="form-input" id="job-location" placeholder="e.g. Bangalore">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" id="job-desc" placeholder="Describe the role and responsibilities"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Requirements (one per line)</label>
        <textarea class="form-textarea" id="job-reqs" placeholder="5+ years experience&#10;TypeScript proficiency&#10;..."></textarea>
      </div>

      <!-- n8n Job Board Distribution Section -->
      <div class="form-group" style="margin-top:var(--sp-4);padding-top:var(--sp-4);border-top:1px solid var(--glass-border)">
        <label class="form-label" style="font-weight:600;display:flex;align-items:center;gap:var(--sp-1.5)">
          <span>🔌 n8n Job Board Distribution</span>
          ${isN8nActive ? `<span class="badge badge-success text-xs">Active</span>` : `<span class="badge badge-neutral text-xs">Disabled</span>`}
        </label>
        
        ${isN8nActive ? `
          <p class="text-xs text-secondary" style="margin-bottom:var(--sp-2)">Select the external channels to publish this job listing to via n8n:</p>
          <div class="flex flex-col gap-2" style="margin-top:var(--sp-2)">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" id="sync-linkedin" checked style="cursor:pointer">
              <span>🔗 LinkedIn</span>
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" id="sync-indeed" checked style="cursor:pointer">
              <span>💼 Indeed</span>
            </label>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" id="sync-naukri" checked style="cursor:pointer">
              <span>📰 Naukri</span>
            </label>
          </div>
        ` : `
          <p class="text-xs text-tertiary">Job board distribution is currently disabled. You can configure and enable your n8n workflows, webhook URLs, and API keys under the Admin Settings tab.</p>
        `}
      </div>
    `;

    UI.openModal('Post New Job', body,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="RecruitmentModule.submitJob()">Post Job</button>`
    );
  }

  function submitJob() {
    const title = document.getElementById('job-title').value.trim();
    const department = document.getElementById('job-dept').value;
    const location = document.getElementById('job-location').value.trim();
    const description = document.getElementById('job-desc').value.trim();
    const requirements = document.getElementById('job-reqs').value.trim().split('\n').filter(r => r.trim());

    if (!title || !department || !description) {
      UI.toast('Please fill all required fields', 'error');
      return;
    }

    const jobId = Store.generateId('J');
    
    // Add job to local store
    Store.add('jobPostings', {
      id: jobId,
      title, department, description, requirements, location,
      status: 'open',
      postedDate: new Date().toISOString().slice(0, 10),
      candidates: []
    });

    // Check n8n sync settings and channels
    const n8n = Store.getN8nSettings();
    const isN8nActive = n8n && n8n.enabled && n8n.webhookUrl;
    const platforms = [];

    if (isN8nActive) {
      if (document.getElementById('sync-linkedin').checked) platforms.push('linkedin');
      if (document.getElementById('sync-indeed').checked) platforms.push('indeed');
      if (document.getElementById('sync-naukri').checked) platforms.push('naukri');
    }

    UI.closeModal();
    Store.logActivity('job_posted', 'recruitment', { title, department });
    UI.toast('Job posted successfully!', 'success');
    render();

    // Trigger n8n distribution if active and channels are selected
    if (isN8nActive && platforms.length > 0) {
      UI.toast('Syncing job posting to n8n...', 'info');
      fetch(n8n.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId,
          title: title,
          department: department,
          location: location,
          description: description,
          requirements: requirements,
          platforms: platforms,
          apiKeys: {
            linkedin: n8n.linkedinKey || null,
            indeed: n8n.indeedKey || null,
            naukri: n8n.naukriKey || null
          }
        })
      })
      .then(response => {
        if (response.ok) {
          Store.logActivity('n8n_sync_success', 'recruitment', { jobId, title, platforms: platforms.join(', ') });
          UI.toast(`Job successfully pushed to n8n for distribution: ${platforms.join(', ')}!`, 'success');
        } else {
          Store.logActivity('n8n_sync_failed', 'recruitment', { jobId, statusCode: response.status });
          UI.toast(`n8n responded with status: ${response.status}`, 'warning');
        }
      })
      .catch(error => {
        Store.logActivity('n8n_sync_error', 'recruitment', { jobId, error: error.message });
        UI.toast(`Error syncing with n8n: ${error.message}`, 'error');
      });
    }
  }

  function openCandidateModal(jobId, candidateId) {
    const job = Store.getById('jobPostings', jobId);
    if (!job) return;
    const candidate = (job.candidates || []).find(c => c.id === candidateId);
    if (!candidate) return;

    const stages = ['applied', 'screening', 'interview', 'offer', 'hired'];
    const currentIdx = stages.indexOf(candidate.stage);

    const body = `
      <div style="text-align:center;margin-bottom:var(--sp-5)">
        ${UI.avatar(candidate.name, Store.AVATAR_COLORS[parseInt(candidate.id.slice(1)) % Store.AVATAR_COLORS.length], 'lg')}
        <h3 class="font-semibold" style="margin-top:var(--sp-3)">${candidate.name}</h3>
        <p class="text-sm text-secondary">${candidate.email}</p>
        <p class="text-xs text-tertiary" style="margin-top:var(--sp-1)">${candidate.phone || ''}</p>
        <div style="margin-top:var(--sp-3)">${UI.statusBadge(candidate.stage)}</div>
      </div>

      <div style="margin-bottom:var(--sp-4)">
        <h4 class="text-sm font-semibold" style="margin-bottom:var(--sp-2)">Applied for: ${job.title}</h4>
        <p class="text-xs text-tertiary">Applied on ${candidate.appliedDate}</p>
      </div>

      <!-- Progress -->
      <div style="margin-bottom:var(--sp-4)">
        <h4 class="text-sm font-semibold" style="margin-bottom:var(--sp-3)">Hiring Pipeline</h4>
        <div class="flex items-center gap-2">
          ${stages.map((s, i) => `
            <div class="flex items-center gap-2">
              <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);font-weight:700;
                ${i <= currentIdx ?
                  'background:var(--primary-gradient);color:#fff' :
                  'background:rgba(255,255,255,0.08);color:var(--text-tertiary)'
                }">
                ${i < currentIdx ? '✓' : i + 1}
              </div>
              ${i < stages.length - 1 ? `<div style="width:20px;height:2px;background:${i < currentIdx ? 'var(--primary-500)' : 'rgba(255,255,255,0.08)'}"></div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="flex justify-between" style="margin-top:var(--sp-1)">
          ${stages.map(s => `<span class="text-xs text-tertiary" style="text-transform:capitalize">${s}</span>`).join('')}
        </div>
      </div>
    `;

    const footer = candidate.stage !== 'hired' && candidate.stage !== 'rejected' ?
      `<button class="btn btn-danger btn-sm" onclick="RecruitmentModule.rejectCandidate('${jobId}','${candidateId}')">Reject</button>
       <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
       <button class="btn btn-primary" onclick="RecruitmentModule.advanceCandidate('${jobId}','${candidateId}')">Advance to Next Stage →</button>` :
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`;

    UI.openModal('Candidate Profile', body, footer);
  }

  function advanceCandidate(jobId, candidateId) {
    const jobs = Store.getAll('jobPostings');
    const jobIdx = jobs.findIndex(j => j.id === jobId);
    if (jobIdx === -1) return;

    const candIdx = jobs[jobIdx].candidates.findIndex(c => c.id === candidateId);
    if (candIdx === -1) return;

    const stages = ['applied', 'screening', 'interview', 'offer', 'hired'];
    const currentStage = jobs[jobIdx].candidates[candIdx].stage;
    const nextIdx = stages.indexOf(currentStage) + 1;

    if (nextIdx >= stages.length) return;

    const data = JSON.parse(localStorage.getItem('antigravity_hr_v2'));
    data.jobPostings[jobIdx].candidates[candIdx].stage = stages[nextIdx];
    localStorage.setItem('antigravity_hr_v2', JSON.stringify(data));

    const candidateName = jobs[jobIdx].candidates[candIdx].name;
    Store.logActivity('candidate_status_changed', 'recruitment', { candidateName, stage: stages[nextIdx], jobTitle: jobs[jobIdx].title });

    UI.closeModal();
    UI.toast(`${candidateName} moved to ${stages[nextIdx]}`, 'success');
    renderTab();
  }

  function rejectCandidate(jobId, candidateId) {
    UI.confirm('Are you sure you want to reject this candidate?', () => {
      const data = JSON.parse(localStorage.getItem('antigravity_hr_v2'));
      const jobIdx = data.jobPostings.findIndex(j => j.id === jobId);
      const candIdx = data.jobPostings[jobIdx].candidates.findIndex(c => c.id === candidateId);
      const candidateName = data.jobPostings[jobIdx].candidates[candIdx].name;
      data.jobPostings[jobIdx].candidates[candIdx].stage = 'rejected';
      localStorage.setItem('antigravity_hr_v2', JSON.stringify(data));

      Store.logActivity('candidate_status_changed', 'recruitment', { candidateName, stage: 'rejected', jobTitle: data.jobPostings[jobIdx].title });

      UI.closeModal();
      UI.toast('Candidate rejected', 'warning');
      renderTab();
    });
  }

  return { render, switchTab, showJobDetail, openPostJobModal, submitJob, openCandidateModal, advanceCandidate, rejectCandidate };
})();
