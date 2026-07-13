document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const successRateVal = document.getElementById('success-rate-val');
  const successRateFill = document.getElementById('success-rate-fill');
  const replicasVal = document.getElementById('replicas-val');
  const networkVal = document.getElementById('network-val');
  const uptimeVal = document.getElementById('uptime-val');
  const totalBuildsVal = document.getElementById('total-builds-val');
  const btnTrigger = document.getElementById('btn-trigger');
  const branchSelect = document.getElementById('branch-select');
  const consoleLogs = document.getElementById('console-logs');
  const consoleStatus = document.getElementById('console-status');
  const historyTableBody = document.getElementById('history-table-body');

  // Chart setup
  let resourceChart = null;
  const canvasEl = document.getElementById('resourceChart');
  if (canvasEl && typeof Chart !== 'undefined') {
    const ctx = canvasEl.getContext('2d');
    const maxDataPoints = 15;
    const labels = Array(maxDataPoints).fill('');
    const cpuData = Array(maxDataPoints).fill(0);
    const memData = Array(maxDataPoints).fill(0);

    resourceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'CPU Usage (%)',
            data: cpuData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: 'Memory Usage (%)',
            data: memData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#9ca3af', font: { family: 'Inter', size: 10 } }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 9 } }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } else {
    console.warn("Chart.js is not loaded or canvas element is missing. Resource monitor chart will be disabled.");
  }

  // Track active build status
  let activeBuildId = null;

  // Format date helper
  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Update resource metrics on chart
  function updateChart(cpu, memory) {
    if (!resourceChart) return;
    resourceChart.data.datasets[0].data.shift();
    resourceChart.data.datasets[0].data.push(cpu);
    resourceChart.data.datasets[1].data.shift();
    resourceChart.data.datasets[1].data.push(memory);
    resourceChart.update();
  }

  // Fetch current live metrics
  async function fetchMetrics() {
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();

      // Update UI Widgets
      successRateVal.innerText = `${data.successRate}%`;
      successRateFill.style.width = `${data.successRate}%`;
      replicasVal.innerText = data.replicas;
      networkVal.innerText = `${data.network} Mbps`;
      
      // Format uptime
      const hrs = Math.floor(data.uptime / 3600);
      const mins = Math.floor((data.uptime % 3600) / 60);
      const secs = data.uptime % 60;
      uptimeVal.innerText = `Uptime: ${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`;
      
      totalBuildsVal.innerText = data.totalBuilds;

      updateChart(data.cpu, data.memory);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }

  // Fetch Build History
  async function fetchHistory() {
    try {
      const res = await fetch('/api/builds');
      const builds = await res.json();

      historyTableBody.innerHTML = '';
      builds.forEach(build => {
        const tr = document.createElement('tr');
        
        let statusClass = 'status-pill-success';
        let statusIcon = 'fa-circle-check';
        if (build.status === 'Failed') {
          statusClass = 'status-pill-failed';
          statusIcon = 'fa-circle-xmark';
        } else if (build.status === 'Running') {
          statusClass = 'status-pill-running';
          statusIcon = 'fa-spinner fa-spin';
        }

        tr.innerHTML = `
          <td>#${build.id}</td>
          <td><span class="badge" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;"><i class="fa-solid fa-code-branch"></i> ${build.branch}</span></td>
          <td>${build.commit}</td>
          <td>
            <span class="status-pill ${statusClass}">
              <i class="fa-solid ${statusIcon}"></i> ${build.status}
            </span>
          </td>
          <td>${build.duration ? build.duration + 's' : '--'}</td>
          <td>${formatDate(build.timestamp)}</td>
          <td>
            <button class="btn-sm btn-view-logs" data-id="${build.id}">
              <i class="fa-solid fa-eye"></i> View Logs
            </button>
          </td>
        `;

        historyTableBody.appendChild(tr);
      });

      // Bind View Log buttons
      document.querySelectorAll('.btn-view-logs').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const buildId = parseInt(e.currentTarget.getAttribute('data-id'));
          const selectedBuild = builds.find(b => b.id === buildId);
          if (selectedBuild) {
            displayLogs(selectedBuild);
          }
        });
      });

      // Update active build logs in real-time
      if (activeBuildId) {
        const activeBuild = builds.find(b => b.id === activeBuildId);
        if (activeBuild) {
          displayLogs(activeBuild);
          if (activeBuild.status !== 'Running') {
            activeBuildId = null;
            btnTrigger.removeAttribute('disabled');
            consoleStatus.innerHTML = `<span class="pulse-dot" style="background-color: var(--success-color)"></span> Listening`;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching build history:', err);
    }
  }

  // Display logs in Console Log Box
  function displayLogs(build) {
    consoleLogs.innerHTML = '';
    
    // Header log
    const headerLine = document.createElement('div');
    headerLine.className = 'console-line system-msg';
    headerLine.innerText = `[SYSTEM] Viewing logs for Build #${build.id} [Commit: ${build.commit}] (Status: ${build.status})`;
    consoleLogs.appendChild(headerLine);

    build.logs.forEach(log => {
      const line = document.createElement('div');
      
      if (log.includes('[FAIL]') || log.includes('[ERROR]')) {
        line.className = 'console-line err-msg';
      } else if (log.includes('[PASS]')) {
        line.className = 'console-line pass-msg';
      } else {
        line.className = 'console-line info-msg';
      }
      
      line.innerText = log;
      consoleLogs.appendChild(line);
    });

    // Auto-scroll to bottom of console
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
  }

  // Trigger Build Pipeline
  async function triggerBuild() {
    btnTrigger.setAttribute('disabled', 'true');
    consoleStatus.innerHTML = `<span class="pulse-dot" style="background-color: var(--primary-color)"></span> Pipelines Active`;
    
    consoleLogs.innerHTML = '<div class="console-line system-msg">[SYSTEM] Contacting webhook service to spin up container runtime...</div>';

    try {
      const res = await fetch('/api/trigger-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchSelect.value })
      });
      const data = await res.json();
      
      activeBuildId = data.buildId;
      
      // Fetch immediately to capture "Running" status
      await fetchHistory();
    } catch (err) {
      console.error('Error triggering build:', err);
      btnTrigger.removeAttribute('disabled');
      consoleStatus.innerHTML = `<span class="pulse-dot" style="background-color: var(--success-color)"></span> Listening`;
    }
  }

  // Event Listeners
  btnTrigger.addEventListener('click', triggerBuild);

  // Initialize
  fetchMetrics();
  fetchHistory();

  // Regular Polling intervals
  setInterval(fetchMetrics, 3000);
  setInterval(fetchHistory, 2000);
});
