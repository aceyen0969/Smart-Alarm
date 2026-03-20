class AlarmApp {
  constructor() {
    this.alarms = [];
    this.currentFilter = "all";
    this.selectedAlarmId = null; // ADD THIS
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadAlarms();
    this.startAlarmChecker();
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  bindEvents() {
    document.getElementById("alarmForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addAlarm();
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setFilter(e.target.dataset.filter, e.target); // FIX: pass event.target
      });
    });

    document.getElementById("cancelDelete").addEventListener("click", () => {
      this.closeModal();
    });

    document.getElementById("confirmDelete").addEventListener("click", () => {
      this.deleteAlarm();
    });
  }

  async addAlarm() {
    const title = document.getElementById("alarmTitle").value;
    const date = document.getElementById("alarmDate").value;
    const time = document.getElementById("alarmTime").value;
    const notifyBefore = document.getElementById("notificationBefore").value;

    const alarmDateTime = new Date(`${date}T${time}`);
    const alarmData = {
      id: Date.now().toString(),
      title,
      dateTime: alarmDateTime.toISOString(),
      notifyBefore: parseInt(notifyBefore),
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/alarms.js", {
        // Vercel: .js endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alarmData),
      });

      if (response.ok) {
        this.showNotification("Alarm created successfully!", "success");
        document.getElementById("alarmForm").reset();
        this.loadAlarms();
      } else {
        throw new Error("Failed to create alarm");
      }
    } catch (error) {
      this.showNotification("Error creating alarm. Please try again.", "error");
      console.error(error);
    }
  }

  async loadAlarms() {
    try {
      const response = await fetch("/api/alarms.js"); // Vercel: .js endpoint
      this.alarms = await response.json();
      this.renderAlarms();
      this.updateAlarmCount();
    } catch (error) {
      console.error("Error loading alarms:", error);
      this.alarms = [];
      this.renderAlarms();
    }
  }

  renderAlarms() {
    const container = document.getElementById("alarmsList");
    const filteredAlarms = this.filterAlarms();

    if (filteredAlarms.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h3>No alarms ${this.currentFilter === "all" ? "" : `in ${this.currentFilter}`} category</h3>
                    <p>Add your first alarm to get started!</p>
                </div>
            `;
      return;
    }

    container.innerHTML = filteredAlarms
      .map((alarm) => this.createAlarmHTML(alarm))
      .join("");

    // Bind delete events AFTER render
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.selectedAlarmId = e.target.dataset.id;
        this.showModal();
      });
    });
  }

  createAlarmHTML(alarm) {
    const dateTime = new Date(alarm.dateTime);
    const now = new Date();
    const diffMs = dateTime - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    let statusClass = "past";
    let statusText = "Past";
    let icon = "fa-clock";

    if (diffMs > 0) {
      if (diffMinutes <= 60) {
        statusClass = "soon";
        statusText = `${diffMinutes}m left`;
        icon = "fa-exclamation-triangle";
      } else if (dateTime.toDateString() === now.toDateString()) {
        statusClass = "today";
        statusText = "Today";
      } else {
        statusClass = "upcoming";
        statusText = dateTime.toLocaleDateString();
      }
    }

    return `
            <div class="alarm-item ${statusClass}" data-status="${statusClass}">
                <div class="alarm-header">
                    <div>
                        <div class="alarm-title">${alarm.title}</div>
                        <div class="alarm-date">${dateTime.toLocaleDateString()} at ${dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div class="alarm-time">
                        <i class="fas ${icon}"></i>
                        <span class="alarm-status status-${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="alarm-actions">
                    <button class="btn-small btn-primary" onclick="navigator.clipboard.writeText('${alarm.dateTime}')">
                        <i class="fas fa-copy"></i> Copy Time
                    </button>
                    <button class="btn-small btn-danger delete-btn" data-id="${alarm.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
  }

  filterAlarms() {
    return this.alarms.filter((alarm) => {
      const dateTime = new Date(alarm.dateTime);
      const now = new Date();

      switch (this.currentFilter) {
        case "today":
          return dateTime.toDateString() === now.toDateString();
        case "upcoming":
          return dateTime > now;
        case "past":
          return dateTime < now;
        default:
          return true;
      }
    });
  }

  setFilter(filter, targetBtn) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    targetBtn.classList.add("active"); // FIX: use passed target
    this.renderAlarms();
  }

  updateAlarmCount() {
    document.getElementById("alarmCount").textContent = this.alarms.length;
  }

  async deleteAlarm() {
    try {
      const response = await fetch(
        `/api/alarms.js?id=${this.selectedAlarmId}`,
        {
          // Vercel: query param
          method: "DELETE",
        },
      );

      if (response.ok) {
        this.showNotification("Alarm deleted successfully!", "success");
        this.closeModal();
        this.loadAlarms();
      }
    } catch (error) {
      this.showNotification("Error deleting alarm.", "error");
      console.error(error);
    }
  }

  showModal() {
    document.getElementById("deleteModal").style.display = "block";
  }

  closeModal() {
    document.getElementById("deleteModal").style.display = "none";
    this.selectedAlarmId = null;
  }

  showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <i class="fas ${type === "success" ? "fa-check-circle" : type === "soon" ? "fa-clock" : "fa-exclamation-circle"}"></i>
            ${message}
        `;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add("show"), 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => container.removeChild(notification), 300);
    }, 4000);
  }

  startAlarmChecker() {
    setInterval(() => this.checkAlarms(), 30000);
  }

  checkAlarms() {
    this.alarms.forEach((alarm) => {
      const alarmTime = new Date(alarm.dateTime);
      const now = new Date();
      const diffMs = alarmTime - now;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes === 0) {
        if (Notification.permission === "granted") {
          new Notification("🔔 ALARM!", {
            body: `${alarm.title} - Time's up!`,
          });
        }
        this.showNotification(`🔔 ${alarm.title} - Time's up!`, "success");
      } else if (diffMinutes === alarm.notifyBefore) {
        this.showNotification(
          `⏰ ${alarm.title} in ${alarm.notifyBefore} minutes!`,
          "soon",
        );
      }
    });
  }

  updateClock() {
    const now = new Date();
    document.title = `Smart Alarm - ${now.toLocaleTimeString()}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
  new AlarmApp();
});
