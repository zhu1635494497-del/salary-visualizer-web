// Salary Visualization Web App - Support dual-mode payday calculation
let app = null;

// Global functions that will be attached to the window object
window.toggleClockIn = function() {
    if (app && app.toggleClockIn) {
        app.toggleClockIn();
    } else {
        console.log('App not initialized yet');
    }
};

window.updateExtraIncome = function(value) {
    if (app && app.updateExtraIncome) {
        app.updateExtraIncome(value);
    }
};

window.openSettings = function() {
    if (app && app.openSettings) {
        app.openSettings();
    }
};

window.closeSettings = function() {
    if (app && app.closeSettings) {
        app.closeSettings();
    }
};

window.saveSettings = function() {
    if (app && app.saveSettings) {
        app.saveSettings();
    }
};

window.exportData = function() {
    if (app && app.exportData) {
        app.exportData();
    }
};

window.exportAttendance = function() {
    if (app && app.exportAttendance) {
        app.exportAttendance();
    }
};

window.clearData = function() {
    if (app && app.clearData) {
        app.clearData();
    }
};

window.loadAttendanceRecords = function() {
    if (app && app.loadAttendanceRecords) {
        app.loadAttendanceRecords();
    }
};

window.deleteAttendanceRecord = function(id) {
    if (app && app.deleteAttendanceRecord) {
        app.deleteAttendanceRecord(id);
    }
};

// HTML中的辅助函数
window.togglePaydayMode = function() {
    const mode = document.getElementById('paydayMode').value;
    const dateGroup = document.getElementById('paydayDateGroup');
    const ruleGroup = document.getElementById('paydayRuleGroup');
    
    if (mode === 'date') {
        dateGroup.style.display = 'block';
        ruleGroup.style.display = 'none';
    } else {
        dateGroup.style.display = 'none';
        ruleGroup.style.display = 'block';
    }
};

class SalaryVisualizer {
    constructor() {
        this.config = this.loadConfig();
        this.state = this.loadState();
        this.attendanceRecords = [];
        this.interval = null;
        
        // Initialize immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // ========== Initialization Methods ==========

    init() {
        console.log('SalaryVisualizer initialized');
        this.updateDisplay();
        this.startTimer();
        this.loadAttendanceRecords();
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('beforeunload', () => {
            this.saveAllData();
        });
    }

    // ========== Data Storage Methods ==========

    saveAllData() {
        this.saveConfig();
        this.saveState();
        this.saveAttendanceRecords();
    }

    saveConfig() {
        localStorage.setItem('salary_config', JSON.stringify(this.config));
    }

    loadConfig() {
        const saved = localStorage.getItem('salary_config');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            daily_salary: 500.0,
            work_start_time: "08:00",
            work_end_time: "17:00",
            payday_mode: "date",
            payday_date: 5,
            payday_rule: "last_day",
            rest_days: [5, 6]
        };
    }

    saveState() {
        localStorage.setItem('salary_state', JSON.stringify(this.state));
    }

    loadState() {
        const saved = localStorage.getItem('salary_state');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            is_clocked_in: false,
            clock_in_time: null,
            work_days_this_month: 0,
            additional_income_today: 0.0
        };
    }

    saveAttendanceRecords() {
        localStorage.setItem('attendance_records', JSON.stringify(this.attendanceRecords || []));
    }

    loadAttendanceRecords() {
        const saved = localStorage.getItem('attendance_records');
        this.attendanceRecords = saved ? JSON.parse(saved) : [];
        this.updateAttendanceTable();
        this.updateMonthlyStats();
        return this.attendanceRecords;
    }

    addAttendanceRecord(record) {
        const today = new Date().toISOString().slice(0, 10);
        const existingIndex = this.attendanceRecords.findIndex(
            r => r.date === today
        );

        if (existingIndex !== -1) {
            this.attendanceRecords[existingIndex] = {
                ...this.attendanceRecords[existingIndex],
                ...record
            };
        } else {
            this.attendanceRecords.unshift({
                id: Date.now(),
                ...record
            });
        }

        this.saveAttendanceRecords();
        this.updateAttendanceTable();
        this.updateMonthlyStats();
    }

    // ========== Core Calculation Methods ==========

    calculateEarned() {
        try {
            const daily = this.config.daily_salary || 500.0;
            const startTimeStr = this.config.work_start_time || "08:00";
            const endTimeStr = this.config.work_end_time || "17:00";

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const [startH, startM] = startTimeStr.split(':').map(Number);
            const [endH, endM] = endTimeStr.split(':').map(Number);

            const startTime = new Date(today);
            startTime.setHours(startH, startM, 0, 0);

            const endTime = new Date(today);
            endTime.setHours(endH, endM, 0, 0);

            if (endTime <= startTime) {
                return 0.0;
            }

            const totalHours = (endTime - startTime) / (1000 * 60 * 60);
            const hourlyRate = daily / totalHours;

            if (now < startTime) {
                return 0.0;
            } else if (now > endTime) {
                return daily;
            } else {
                const elapsedHours = (now - startTime) / (1000 * 60 * 60);
                return elapsedHours * hourlyRate;
            }
        } catch (error) {
            console.error('计算工资出错:', error);
            return 0.0;
        }
    }

    // ========== Display Update Methods ==========

    updateDisplay() {
        this.updateCurrentTime();
        
        const current = this.calculateEarned();
        const daily = this.config.daily_salary || 500.0;
        const total = Math.round((current + this.state.additional_income_today) * 1000) / 1000;

        document.getElementById('earnedAmount').textContent = `当前赚取: ¥${total.toFixed(3)}`;
        document.getElementById('progressBar').style.width = `${Math.min(current / daily * 100, 100)}%`;

        const hours = new Date().getHours().toString().padStart(2, '0');
        const minutes = new Date().getMinutes().toString().padStart(2, '0');
        document.getElementById('currentWorkTime').textContent = `${hours}:${minutes}`;

        document.getElementById('startTime').textContent = this.config.work_start_time;
        document.getElementById('endTime').textContent = this.config.work_end_time;

        this.updateCountdowns();
        this.updateMessage(current);
        this.updateConfigDisplay();
    }

    updateCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        document.getElementById('currentTime').textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateCountdowns() {
        const today = new Date();
        const mode = this.config.payday_mode || "date";
        let nextPayday;
        
        if (mode === "date") {
            const payday = this.config.payday_date || 5;
            if (today.getDate() < payday) {
                nextPayday = new Date(today.getFullYear(), today.getMonth(), payday);
            } else {
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
                const nextPaydayDate = Math.min(payday, lastDay);
                nextPayday = new Date(today.getFullYear(), today.getMonth() + 1, nextPaydayDate);
            }
        } else {
            nextPayday = this.calculateRuleBasedPayday(today);
        }
        
        const payDiff = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
        document.getElementById('paydayCount').textContent = `${payDiff}天`;
        document.getElementById('paydayModeLabel').textContent = this.getPaydayDescription();

        // Rest day countdown
        const restDays = this.config.rest_days || [5, 6];
        const todayWeekday = today.getDay();
        const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        
        let minDays = 7;
        
        for (const targetDay of restDays) {
            const targetDayAdjusted = targetDay % 7;
            let days;
            if (targetDayAdjusted > todayWeekday) {
                days = targetDayAdjusted - todayWeekday;
            } else {
                days = 7 - todayWeekday + targetDayAdjusted;
            }
            
            if (days < minDays) {
                minDays = days;
            }
        }
        
        document.getElementById('restdayCount').textContent = `${minDays}天`;
    }

    calculateRuleBasedPayday(today) {
        const rule = this.config.payday_rule || "last_day";
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        switch (rule) {
            case "first_day":
                return new Date(currentYear, currentMonth + 1, 1);
                
            case "last_day":
                return new Date(currentYear, currentMonth + 1, 0);
                
            case "15th_or_last":
                const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
                const paydayDay = (currentMonth === 1) ? lastDay : Math.min(15, lastDay);
                let payday = new Date(currentYear, currentMonth, paydayDay);
                
                if (today.getDate() > paydayDay ||
                    (today.getDate() === paydayDay && today.getHours() >= 12)) {
                    const nextMonth = currentMonth + 1;
                    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
                    const nextMonthAdj = nextMonth % 12;
                    const nextLastDay = new Date(nextYear, nextMonthAdj + 1, 0).getDate();
                    const nextPaydayDay = (nextMonthAdj === 1) ? nextLastDay : Math.min(15, nextLastDay);
                    payday = new Date(nextYear, nextMonthAdj, nextPaydayDay);
                }
                return payday;
                
            case "last_weekday":
                const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
                let lastWorkday = new Date(lastDayOfMonth);
                
                while (lastWorkday.getDay() === 0 || lastWorkday.getDay() === 6) {
                    lastWorkday.setDate(lastWorkday.getDate() - 1);
                }
                
                let paydayWorkday = new Date(lastWorkday);
                
                if (today > lastWorkday || 
                    (today.toDateString() === lastWorkday.toDateString() && today.getHours() >= 12)) {
                    const nextMonth = currentMonth + 1;
                    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
                    const nextMonthAdj = nextMonth % 12;
                    const nextLastDay = new Date(nextYear, nextMonthAdj + 1, 0);
                    let nextLastWorkday = new Date(nextLastDay);
                    
                    while (nextLastWorkday.getDay() === 0 || nextLastWorkday.getDay() === 6) {
                        nextLastWorkday.setDate(nextLastWorkday.getDate() - 1);
                    }
                    
                    paydayWorkday = new Date(nextLastWorkday);
                }
                return paydayWorkday;
                
            default:
                return new Date(currentYear, currentMonth + 1, 0);
        }
    }

    getPaydayDescription() {
        const mode = this.config.payday_mode || "date";
        
        if (mode === "date") {
            const day = this.config.payday_date || 5;
            return `每月${day}日`;
        } else {
            const rule = this.config.payday_rule || "last_day";
            const ruleNames = {
                "first_day": "每月第一天",
                "last_day": "每月最后一天",
                "15th_or_last": "15日或最后一天",
                "last_weekday": "当月最后一个工作日"
            };
            return ruleNames[rule] || rule;
        }
    }

    updateMessage(earned) {
        const daily = this.config.daily_salary || 500.0;
        let message = document.getElementById('messageBox');

        if (earned <= 0) {
            message.textContent = "😊 还没有开始赚钱哦~";
        } else if (earned < daily * 0.3) {
            message.textContent = "😊 开始赚钱啦！加油！";
        } else if (earned < daily * 0.6) {
            message.textContent = "😊 赚了一些了，不错不错！";
        } else if (earned < daily * 0.9) {
            message.textContent = "😊 已经赚了不少啦！坚持！";
        } else if (earned >= daily) {
            message.textContent = "🎉 今天的工作完成啦！";
        } else {
            message.textContent = "😊 快完成今天的工作啦！";
        }
    }

    updateConfigDisplay() {
        document.getElementById('dailySalary').textContent = `¥${this.config.daily_salary.toFixed(2)}`;
        document.getElementById('workTime').textContent = `${this.config.work_start_time}-${this.config.work_end_time}`;
        document.getElementById('paydayDisplay').textContent = `发薪: ${this.getPaydayDescription()}`;
        
        const restDays = (this.config.rest_days || [5, 6]).sort((a, b) => a - b);
        const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        const restDayNames = restDays.map(day => dayNames[day]);
        document.getElementById('restDaysDisplay').textContent = restDayNames.join(' ');
    }

    updateMonthlyStats() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        const monthlyRecords = this.attendanceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getFullYear() === currentYear && 
                   recordDate.getMonth() === currentMonth;
        });

        let monthIncome = 0;
        let extraTotal = 0;

        monthlyRecords.forEach(record => {
            monthIncome += record.income || 0;
            extraTotal += record.extra_income || 0;
        });

        document.getElementById('monthIncome').textContent = `¥${monthIncome.toFixed(2)}`;
        document.getElementById('extraTotal').textContent = `¥${extraTotal.toFixed(2)}`;
        document.getElementById('totalIncome').textContent = `¥${(monthIncome + extraTotal).toFixed(2)}`;
    }

    // ========== User Interaction Methods ==========

    toggleClockIn() {
        console.log('toggleClockIn called');
        if (!this.state.is_clocked_in) {
            this.state.is_clocked_in = true;
            this.state.clock_in_time = new Date().toISOString();
            this.state.work_days_this_month += 1;
            
            document.getElementById('clockStatus').textContent = "✅ 已打卡";
            const clockBtn = document.querySelector('.clock-status button');
            if (clockBtn) {
                clockBtn.textContent = "取消打卡";
                clockBtn.className = "btn btn-warning";
            }
            
            document.getElementById('workDays').textContent = `📅 本月上班: ${this.state.work_days_this_month}天`;
            document.getElementById('messageBox').textContent = "✅ 打卡成功！开始赚钱！";
            
            const record = {
                date: new Date().toISOString().slice(0, 10),
                clock_in_time: this.state.clock_in_time,
                clock_status: 'in'
            };
            this.addAttendanceRecord(record);
            
        } else {
            this.state.is_clocked_in = false;
            this.state.clock_in_time = null;
            this.state.work_days_this_month = Math.max(0, this.state.work_days_this_month - 1);
            
            document.getElementById('clockStatus').textContent = "🚪 等待打卡";
            const clockBtn = document.querySelector('.clock-status button');
            if (clockBtn) {
                clockBtn.textContent = "打卡";
                clockBtn.className = "btn btn-success";
            }
            
            document.getElementById('workDays').textContent = `📅 本月上班: ${this.state.work_days_this_month}天`;
            document.getElementById('messageBox').textContent = "❌ 打卡已取消";
            
            const record = {
                date: new Date().toISOString().slice(0, 10),
                clock_status: 'out'
            };
            this.addAttendanceRecord(record);
        }
        
        this.saveState();
        
        setTimeout(() => {
            this.updateDisplay();
        }, 3000);
    }

    updateExtraIncome(value) {
        try {
            const cleaned = value.replace('¥', '').replace(',', '').trim();
            this.state.additional_income_today = cleaned ? parseFloat(cleaned) : 0.0;
            this.saveState();
        } catch (error) {
            this.state.additional_income_today = 0.0;
        }
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) return;
        
        document.getElementById('dailySalaryInput').value = this.config.daily_salary;
        document.getElementById('startTimeInput').value = this.config.work_start_time;
        document.getElementById('endTimeInput').value = this.config.work_end_time;
        
        const mode = this.config.payday_mode || "date";
        document.getElementById('paydayMode').value = mode;
        document.getElementById('paydayInput').value = this.config.payday_date || 5;
        document.getElementById('paydayRuleInput').value = this.config.payday_rule || "last_day";
        
        if (mode === "date") {
            document.getElementById('paydayDateGroup').style.display = 'block';
            document.getElementById('paydayRuleGroup').style.display = 'none';
        } else {
            document.getElementById('paydayDateGroup').style.display = 'none';
            document.getElementById('paydayRuleGroup').style.display = 'block';
        }
        
        const restDays = this.config.rest_days || [5, 6];
        document.querySelectorAll('#restDaysGroup input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = restDays.includes(parseInt(checkbox.value));
        });
        
        modal.style.display = 'flex';
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    saveSettings() {
        this.config.daily_salary = parseFloat(document.getElementById('dailySalaryInput').value) || 500.0;
        this.config.work_start_time = document.getElementById('startTimeInput').value || "08:00";
        this.config.work_end_time = document.getElementById('endTimeInput').value || "17:00";
        
        this.config.payday_mode = document.getElementById('paydayMode').value;
        this.config.payday_date = parseInt(document.getElementById('paydayInput').value) || 5;
        this.config.payday_rule = document.getElementById('paydayRuleInput').value;
        
        const restDays = [];
        document.querySelectorAll('#restDaysGroup input[type="checkbox"]:checked').forEach(checkbox => {
            restDays.push(parseInt(checkbox.value));
        });
        this.config.rest_days = restDays.length > 0 ? restDays : [5, 6];
        
        this.saveConfig();
        this.closeSettings();
        this.updateDisplay();
        
        document.getElementById('messageBox').textContent = "✅ 设置已保存";
        
        setTimeout(() => {
            this.updateDisplay();
        }, 3000);
    }

    exportData() {
        const data = {
            config: this.config,
            state: this.state,
            attendanceRecords: this.attendanceRecords,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportAttendance() {
        const data = {
            attendanceRecords: this.attendanceRecords,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_records_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearData() {
        this.state = {
            is_clocked_in: false,
            clock_in_time: null,
            work_days_this_month: 0,
            additional_income_today: 0.0
        };
        this.attendanceRecords = [];
        
        this.saveState();
        this.saveAttendanceRecords();
        this.updateDisplay();
        
        document.getElementById('messageBox').textContent = "🗑️ 所有数据已清空";
    }

    deleteAttendanceRecord(recordId) {
        if (confirm('确定要删除这条打卡记录吗？')) {
            this.attendanceRecords = this.attendanceRecords.filter(
                record => record.id !== recordId && record.id !== parseInt(recordId)
            );
            this.saveAttendanceRecords();
            this.updateMonthlyStats();
        }
    }

    // ========== Timer Control ==========

    startTimer() {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 100);
    }

    stopTimer() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    // ========== Table Update Methods ==========

    updateAttendanceTable() {
        const tableBody = document.querySelector('#attendanceTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        this.attendanceRecords.slice(0, 20).forEach(record => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = record.date || '';
            
            const timeCell = document.createElement('td');
            timeCell.textContent = record.clock_in_time ? 
                new Date(record.clock_in_time).toLocaleTimeString() : '';
            
            const hoursCell = document.createElement('td');
            hoursCell.textContent = record.work_hours || '--';
            
            const incomeCell = document.createElement('td');
            incomeCell.textContent = record.income ? `¥${record.income.toFixed(2)}` : '¥0.00';
            
            const extraCell = document.createElement('td');
            extraCell.textContent = record.extra_income ? `¥${record.extra_income.toFixed(2)}` : '¥0.00';
            
            const actionCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.className = 'btn btn-danger btn-sm';
            deleteBtn.onclick = () => this.deleteAttendanceRecord(record.id);
            actionCell.appendChild(deleteBtn);
            
            row.appendChild(dateCell);
            row.appendChild(timeCell);
            row.appendChild(hoursCell);
            row.appendChild(incomeCell);
            row.appendChild(extraCell);
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
    }
}

// Initialize app on page load
window.addEventListener('DOMContentLoaded', () => {
    app = new SalaryVisualizer();
    console.log('App initialized:', app);
});

// Adjust timer when page visibility changes
document.addEventListener('visibilitychange', () => {
    if (app) {
        if (document.hidden) {
            app.stopTimer();
        } else {
            app.startTimer();
        }
    }
});