const CONFIG = {
    STORAGE_KEY:'LAB_SCHEDULE_DATA',
    USER_KEY:'LAB_USER'
};

const DataModule = {

    schedules:[
        {
            week:1,
            HS:'Toàn',
            MD:'Thành',
            CTM:'Dũng',
            NT:'Nga',
            PLM1:'V.Anh',
            PLM2:'Hiệp'
        }
    ],

    leaves: []

};

const ConfigModule = {
    biochemistryRanges: null,
    immunologyRanges: null,
    syncBloodCountRanges: false,

    loadBiochemistryRanges() {
        const stored = JSON.parse(localStorage.getItem('biochemistryRanges') || 'null');
        if (stored && typeof stored === 'object') {
            this.biochemistryRanges = stored;
            return stored;
        }
        return this.biochemistryRanges;
    },

    setBiochemistryRanges(ranges) {
        this.biochemistryRanges = ranges;
        localStorage.setItem('biochemistryRanges', JSON.stringify(ranges));
    },

    loadImmunologyRanges() {
        const stored = JSON.parse(localStorage.getItem('immunologyRanges') || 'null');
        if (stored && typeof stored === 'object') {
            this.immunologyRanges = stored;
            return stored;
        }
        return this.immunologyRanges;
    },

    setImmunologyRanges(ranges) {
        this.immunologyRanges = ranges;
        localStorage.setItem('immunologyRanges', JSON.stringify(ranges));
    },

    loadUrinalysisRanges() {
        const stored = JSON.parse(localStorage.getItem('urinalysisRanges') || 'null');
        if (stored && typeof stored === 'object') {
            this.urinalysisRanges = stored;
            return stored;
        }
        return this.urinalysisRanges;
    },

    setUrinalysisRanges(ranges) {
        this.urinalysisRanges = ranges;
        localStorage.setItem('urinalysisRanges', JSON.stringify(ranges));
    }
};

const NotificationModule = {

    success(msg){

        const toast = document.createElement('div');

        toast.className = 'toast-item';

        toast.innerHTML = msg;

        document.getElementById('toastBox').appendChild(toast);

        setTimeout(()=>{
            toast.remove();
        },3000);

    },

    error(msg){

        const toast = document.createElement('div');

        toast.className = 'toast-item';

        toast.style.background = '#dc2626';

        toast.innerHTML = msg;

        document.getElementById('toastBox').appendChild(toast);

        setTimeout(()=>{
            toast.remove();
        },3000);

    }

};

const AuthModule = {

    currentUser:null,

    async login(){

        const email =
            document.getElementById('username').value.trim();

        const password =
            document.getElementById('password').value;

        try{

            const result =
                await firebaseAuth
                    .signInWithEmailAndPassword(
                        email,
                        password
                    );

            const role =
                result.user.email ===
                'admin@gmail.com'
                ? 'admin'
                : 'viewer';

            this.currentUser = {
                email: result.user.email,
                role: role
            };

            // Reload page after successful login to synchronize state
            location.reload();

            document
                .getElementById('loginModal')
                .classList.add('hidden');

            this.updatePermission();

            NotificationModule.success(
                'Đăng nhập thành công'
            );

        }
        catch(err){

            NotificationModule.error(
                'Sai email hoặc mật khẩu'
            );

        }

    },

    updatePermission(){

        const editable =
            this.currentUser?.role === 'admin';

        document
            .querySelectorAll('[contenteditable]')
            .forEach(el=>{

                el.contentEditable = editable;

                if(editable){
                    el.classList.remove('readonly');
                }
                else{
                    el.classList.add('readonly');
                }

            });

        document
            .querySelectorAll('.admin-only')
            .forEach(el=>{

                el.style.display =
                    editable
                    ? ''
                    : 'none';

            });

        UIModule.renderSchedule();
    },

    async logout(){

        await firebaseAuth.signOut();

        location.reload();

    }

};

const StorageModule = {

    async save(){
        if(
   AuthModule.currentUser?.role
   !== 'admin'
){
   NotificationModule.error(
      'Không có quyền chỉnh sửa'
   );
   return;
}
        
        const payload = {
            schedules: DataModule.schedules,
            leaves: DataModule.leaves,
            biochemistryRanges: ConfigModule.biochemistryRanges || null,
            immunologyRanges: ConfigModule.immunologyRanges || null,
            urinalysisRanges: ConfigModule.urinalysisRanges || null,
            bloodCountRanges: JSON.parse(localStorage.getItem('bloodCountRanges') || 'null'),
            bloodCountDiagnosisRules: JSON.parse(localStorage.getItem('bloodCountDiagnosisRules') || '[]')
        };

        if(window.firestoreDB){
            try{
                await window.firestoreDB.collection('lab').doc('data').set(payload);
                NotificationModule.success('Đã lưu dữ liệu (Firebase)');
                SaveStatusModule.markSaved();
                return;
            }catch(e){
                console.warn('Firebase save failed, falling back to localStorage', e);
            }
        }

        // fallback to localStorage
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
        NotificationModule.success('Đã lưu dữ liệu (local)');
        SaveStatusModule.markSaved();

    },

    async load(){

        // try Firestore first
        if(window.firestoreDB){
            try{
                const docRef = window.firestoreDB.collection('lab').doc('data');
                const snap = await docRef.get();
                if(snap.exists){
                    const parsed = snap.data();
                    DataModule.schedules = parsed.schedules || DataModule.schedules;
                    DataModule.leaves = parsed.leaves || [];
                    if(parsed.biochemistryRanges){
                        ConfigModule.setBiochemistryRanges(parsed.biochemistryRanges);
                    }
                    if(parsed.immunologyRanges){
                        ConfigModule.setImmunologyRanges(parsed.immunologyRanges);
                    }
                    if(parsed.urinalysisRanges){
                        ConfigModule.setUrinalysisRanges(parsed.urinalysisRanges);
                    }
                    if(parsed.bloodCountRanges){
                        localStorage.setItem('bloodCountRanges', JSON.stringify(parsed.bloodCountRanges));
                    }
                    if(parsed.bloodCountDiagnosisRules){
                        localStorage.setItem('bloodCountDiagnosisRules', JSON.stringify(parsed.bloodCountDiagnosisRules));
                    }
                    return;
                }
            }catch(e){
                console.warn('Firebase load failed, falling back to localStorage', e);
            }
        }

        // fallback to localStorage
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);

        if(data){
            const parsed = JSON.parse(data);
            if(Array.isArray(parsed)){
                DataModule.schedules = parsed;
            }else{
                DataModule.schedules = parsed.schedules || DataModule.schedules;
                DataModule.leaves = parsed.leaves || [];
                if(parsed.biochemistryRanges){
                    ConfigModule.setBiochemistryRanges(parsed.biochemistryRanges);
                }
                if(parsed.immunologyRanges){
                    ConfigModule.setImmunologyRanges(parsed.immunologyRanges);
                }
                if(parsed.urinalysisRanges){
                    ConfigModule.setUrinalysisRanges(parsed.urinalysisRanges);
                }
                if(parsed.bloodCountRanges){
                    localStorage.setItem('bloodCountRanges', JSON.stringify(parsed.bloodCountRanges));
                }
                if(parsed.bloodCountDiagnosisRules){
                    localStorage.setItem('bloodCountDiagnosisRules', JSON.stringify(parsed.bloodCountDiagnosisRules));
                }
            }
        }

    }

};

const SyncModule = {
    applyingRemote: false,
    unsubscribe: null,
    start(){
        if(!window.firestoreDB) return;
        try{
            this.unsubscribe = window.firestoreDB.collection('lab').doc('data')
                .onSnapshot(doc=>{
                    if(!doc.exists) return;
                    const data = doc.data() || {};
                    try{
                        this.applyingRemote = true;
                        DataModule.schedules = data.schedules || DataModule.schedules;
                        DataModule.leaves = data.leaves || DataModule.leaves;
                        if(data.biochemistryRanges){
                            ConfigModule.setBiochemistryRanges(data.biochemistryRanges);
                        }
                        if(data.immunologyRanges){
                            ConfigModule.setImmunologyRanges(data.immunologyRanges);
                        }
                        if(data.urinalysisRanges){
                            ConfigModule.setUrinalysisRanges(data.urinalysisRanges);
                        }
                        if(data.bloodCountRanges){
                            localStorage.setItem('bloodCountRanges', JSON.stringify(data.bloodCountRanges));
                        }
                        if(data.bloodCountDiagnosisRules){
                            localStorage.setItem('bloodCountDiagnosisRules', JSON.stringify(data.bloodCountDiagnosisRules));
                        }
                        UIModule.renderSchedule();
                        if(window.BiochemistryModule){
                            BiochemistryModule.createParameterRows();
                            BiochemistryModule.loadReferenceSettingsEditor();
                        }
                        if(window.ImmunologyModule){
                            ImmunologyModule.createParameterRows();
                            ImmunologyModule.loadReferenceSettingsEditor();
                        }
                        if(window.CTMAnalysis){
                            CTMAnalysis.createParameterRows();
                        }
                        if(window.UrinalysisModule){
                            UrinalysisModule.createParameterRows();
                            UrinalysisModule.loadReferenceSettingsEditor();
                        }
                        SaveStatusModule.markSaved();
                        NotificationModule.success('Đã đồng bộ dữ liệu (Realtime)');
                    }finally{
                        this.applyingRemote = false;
                    }
                }, err=>{
                    console.warn('Realtime sync error', err);
                });
            console.info('SyncModule started');
        }catch(e){
            console.warn('SyncModule failed to start', e);
        }
    },
    stop(){
        if(this.unsubscribe) this.unsubscribe();
        this.unsubscribe = null;
    }
};

// scheduleSave: debounce wrapper to auto-save after edits
StorageModule.scheduleTimer = null;
StorageModule.scheduleSave = function(){
    // don't auto-save while applying remote update
    if(window.SyncModule && window.SyncModule.applyingRemote) return;
    if(this.scheduleTimer) clearTimeout(this.scheduleTimer);
    this.scheduleTimer = setTimeout(()=>{
        this.save();
    },1500);
};

const SaveStatusModule = {

    dirty: false,

    badge(){
        return document.getElementById('saveStatusBadge');
    },

    updateUI(){
        const badge = this.badge();
        if(!badge) return;
        if(this.dirty){
            badge.innerText = 'Chưa lưu';
            badge.classList.remove('saved');
            badge.classList.add('dirty');
        }else{
            badge.innerText = 'Đã lưu';
            badge.classList.remove('dirty');
            badge.classList.add('saved');
        }
    },

    markDirty(){
        this.dirty = true;
        this.updateUI();
    },

    markSaved(){
        this.dirty = false;
        this.updateUI();
    }

};

const ScheduleModule = {

    addWeek(){

        DataModule.schedules.push({
            week:DataModule.schedules.length + 1,
            HS:'',
            MD:'',
            CTM:'',
            NT:'',
            PLM1:'',
            PLM2:''
        });

        SaveStatusModule.markDirty();
        UIModule.renderSchedule();
        AuthModule.updatePermission();
        StorageModule.scheduleSave();

    },

    deleteWeek(index){

        DataModule.schedules.splice(index,1);

        DataModule.schedules.forEach((item,i)=>{
            item.week = i + 1;
        });

        UIModule.renderSchedule();
        AuthModule.updatePermission();
        SaveStatusModule.markDirty();
        StorageModule.scheduleSave();

    },

    updateCell(index,key,value){

        DataModule.schedules[index][key] = value.trim();
        SaveStatusModule.markDirty();
        StorageModule.scheduleSave();

    }

};

const LeaveModule = {

    currentIndex:null,

    addLeave(){

        const modal = new bootstrap.Modal(
            document.getElementById('leaveModal')
        );

        modal.show();

    },

async confirmLeave(){
        const name = document.getElementById('leaveName').value;
        const day = document.getElementById('leaveDay').value;
        const shift = document.getElementById('leaveShift').value;
        const reason = document.getElementById('leaveReason').value || 'Nghỉ phép';

        DataModule.leaves.push({
            id:Date.now(),
            name,
            day,
            shift,
            reason
        });

        SaveStatusModule.markDirty();

        await StorageModule.save();

        document.getElementById('leaveReason').value = '';

        bootstrap.Modal.getInstance(
            document.getElementById('leaveModal')
        ).hide();

        NotificationModule.success('Đã thêm nghỉ phép');

    },

            async removeLeave(id){

            DataModule.leaves =
            DataModule.leaves.filter(
                item=>item.id !== id
            );

            SaveStatusModule.markDirty();

            await StorageModule.save();

            NotificationModule.success(
                'Đã xóa nghỉ phép'
            );

        },

    renderLeave(){

        return '';

    },

    renderWeeklySummary(){

        const dayNames = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6'];
        const shifts = ['Sáng','Chiều'];

        const matrix = {
            'Sáng': {},
            'Chiều': {}
        };

        dayNames.forEach(day=>{
            matrix['Sáng'][day] = [];
            matrix['Chiều'][day] = [];
        });

        DataModule.leaves.forEach(leave=>{
            if(matrix[leave.shift] && matrix[leave.shift][leave.day]){
                matrix[leave.shift][leave.day].push(leave);
            }
        });

        const summaryBody = document.getElementById('leaveSummaryBody');
        const cardsContainer = document.getElementById('leaveSummaryCards');
        const tableElement = document.querySelector('.leave-summary-table');

        if(DeviceModule.isMobile()){
            if(summaryBody) summaryBody.innerHTML = '';
            if(tableElement) tableElement.classList.add('hidden');
            if(!cardsContainer) return;

            cardsContainer.innerHTML = '';
            cardsContainer.classList.remove('hidden');

            shifts.forEach(shift=>{
                const itemsForShift = dayNames.flatMap(day =>
                    matrix[shift][day].map(item => ({ day, item }))
                );

                const cardItems = dayNames.map(day => {
                    const items = matrix[shift][day];
                    if(items.length){
                        return `
                            <div class="leave-summary-card-day">
                                <strong>${day}</strong>
                                ${items.map(item => {
                                    const deleteBtn = AuthModule.currentUser?.role === 'admin'
                                        ? `<button class="btn btn-sm btn-danger mt-2 admin-only" onclick="LeaveModule.removeLeave(${item.id})">Xóa</button>`
                                        : '';
                                    return `
                                        <div>
                                            <span class="leave-summary-badge">${item.name}</span>
                                            <div><small>${item.reason || 'Nghỉ phép'}</small></div>
                                            ${deleteBtn}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `;
                    }
                    return `
                        <div class="leave-summary-card-day">
                            <strong>${day}</strong>
                            <small class="text-muted">Không có nghỉ phép</small>
                        </div>
                    `;
                }).join('');

                cardsContainer.innerHTML += `
                    <div class="leave-summary-card">
                        <div class="leave-summary-card-header">
                            <b>Buổi ${shift}</b>
                            <span>${itemsForShift.length} lượt nghỉ</span>
                        </div>
                        ${cardItems}
                    </div>
                `;
            });

            return;
        }

        if(cardsContainer){
            cardsContainer.classList.add('hidden');
            cardsContainer.innerHTML = '';
        }
        if(tableElement) tableElement.classList.remove('hidden');

        if(!summaryBody) return;
        summaryBody.innerHTML = '';
        shifts.forEach(shift=>{
            const canEdit = AuthModule.currentUser?.role === 'admin';
            const rowCells = dayNames.map(day=>{
                const items = matrix[shift][day];
                const content = items.length
                    ? items.map(item=>{
                        const deleteBtn = canEdit ? `<button class="btn btn-sm btn-danger mt-2 admin-only" onclick="LeaveModule.removeLeave(${item.id})">Xóa</button>` : '';
                        return `
                        <div class="leave-summary-item">
                            <div><strong>${item.name}</strong></div>
                            <div><small>${item.reason || 'Nghỉ phép'}</small></div>
                            ${deleteBtn}
                        </div>
                        `;
                    }).join('')
                    : '<div class="leave-summary-item text-muted">-</div>';
                return `<td>${content}</td>`;
            }).join('');

            summaryBody.innerHTML += `
                <tr>
                    <th>${shift}</th>
                    ${rowCells}
                </tr>
            `;
        });

    }

};

const UIModule = {

    showPage(id){

        document.querySelectorAll('.main > div[id]').forEach(el=>{
            el.classList.add('hidden');
        });

        document.getElementById(id).classList.remove('hidden');

        if(id === 'devicePage' && window.DeviceTheoryModule){
            DeviceTheoryModule.render();
        }

    },

    renderSchedule(){

        const body = document.getElementById('scheduleBody');
        const tableHead = document.querySelector('#scheduleTable thead tr');
        const editable = AuthModule.currentUser?.role === 'admin';

        if(tableHead){
            tableHead.innerHTML = `
                <th>Tuần</th>
                <th>Hoá sinh + ĐGĐ </th>
                <th>Miễn dịch + Đông Máu</th>
                <th>CTM + Test + HbA1C</th>
                <th>NT + Nhuộm soi + Máu lắng</th>
                <th>PLM1</th>
                <th>PLM2</th>
                ${editable ? '<th class="admin-only">Xóa</th>' : ''}
            `;
        }

        body.innerHTML = '';

        DataModule.schedules.forEach((item,index)=>{

            body.innerHTML += `
                <tr>
                    <td>${item.week}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'HS',this.innerText)">${item.HS}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'MD',this.innerText)">${item.MD}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'CTM',this.innerText)">${item.CTM}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'NT',this.innerText)">${item.NT}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'PLM1',this.innerText)">${item.PLM1}</td>
                    <td contenteditable="${editable ? 'true' : 'false'}" onblur="ScheduleModule.updateCell(${index},'PLM2',this.innerText)">${item.PLM2}</td>
                    ${editable ? `
                        <td class="admin-only">
                            <button class="btn btn-danger btn-sm" onclick="ScheduleModule.deleteWeek(${index})">X</button>
                        </td>
                    ` : ''}
                </tr>
            `;

        });

        DashboardModule.render();
        LeaveModule.renderWeeklySummary();

    }

};

const DeviceTheoryModule = {
    formatRange(range) {
        return `${range.min} - ${range.max}${range.unit ? ' ' + range.unit : ''}`;
    },

    renderTable(tableId, ranges) {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;
        tbody.innerHTML = Object.keys(ranges).map((key) => {
            const range = ranges[key];
            if (!range) return '';
            return `
                <tr>
                    <td>${key}</td>
                    <td>${this.formatRange(range)}</td>
                    <td>Giá trị bình thường: ${this.formatRange(range)}; tăng khi lớn hơn max, giảm khi nhỏ hơn min.</td>
                </tr>
            `;
        }).join('');
    },

    getRanges(module, defaultTable) {
        if (module && typeof module.getSavedRanges === 'function') {
            return module.getSavedRanges();
        }
        return defaultTable || {};
    },

    render() {
        this.renderTable('biochemistry-theory-table', this.getRanges(window.BiochemistryModule));
        this.renderTable('immunology-theory-table', this.getRanges(window.ImmunologyModule));
        this.renderTable('ctm-theory-table', this.getRanges(window.CTMAnalysis));
        this.renderTable('urinalysis-theory-table', this.getRanges(window.UrinalysisModule));
    }
};

const WorkTimeModule = {

    staffs:[
        {
            name:'Toàn',
            start:'2026-04-22'
        },
        {
            name:'Thành',
            start:'2026-04-22'
        },
        {
            name:'Nga',
            start:'2026-04-22'
        },
        {
            name:'Dũng',
            start:'2026-05-11'
        },
        {
            name:'Hiệp',
            start:'2026-05-11'
        },
        {
            name:'V.Anh',
            start:'2026-05-11'
        },
        {
            name:'Lợi',
            start:'2026-05-27'
        },
        {
            name:'Trúc',
            start:'2026-07-03'
        },
        {
            name:'Tâm',
            start:'2026-07-03'
        },
        {
            name:'Long',
            start:'2026-07-07'
        }
    ],

    render(){

        const div = document.getElementById('workTimeList');

        div.innerHTML = '';

        this.staffs.forEach(staff=>{

            const start = new Date(staff.start);
            const now = new Date();

            const diff = now - start;

            const totalDays = Math.floor(diff / (1000*60*60*24));

            const months = Math.floor(totalDays / 30);
            const days = totalDays % 30;

            div.innerHTML += `

            <div class="work-time-card">
                <b>${staff.name}</b>
                <div class="duration">${months} tháng ${days} ngày</div>
                <div class="details">Bắt đầu: ${staff.start}</div>
                <div class="details">Tổng số ngày: ${totalDays.toLocaleString()}</div>
            </div>

            `;

        });

    }

};

const ExportModule = {

    exportExcel(){

        const scheduleHeader = ['Tuần','HS','MD','CTM','NT','PLM1','PLM2'];
        const scheduleData = [scheduleHeader];

        DataModule.schedules.forEach(item => {
            scheduleData.push([
                item.week,
                item.HS,
                item.MD,
                item.CTM,
                item.NT,
                item.PLM1,
                item.PLM2
            ]);
        });

        const leaveHeader = ['Buổi','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6'];
        const leaveData = [leaveHeader];

        const dayNames = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6'];
        const shifts = ['Sáng','Chiều'];
        const matrix = {
            'Sáng': {},
            'Chiều': {}
        };

        dayNames.forEach(day => {
            matrix['Sáng'][day] = [];
            matrix['Chiều'][day] = [];
        });

        DataModule.leaves.forEach(leave => {
            if (matrix[leave.shift] && matrix[leave.shift][leave.day]) {
                matrix[leave.shift][leave.day].push(`${leave.name}${leave.reason ? ' - ' + leave.reason : ''}`);
            }
        });

        shifts.forEach(shift => {
            const row = [shift];
            dayNames.forEach(day => {
                const items = matrix[shift][day];
                row.push(items.length ? items.join('\n') : '');
            });
            leaveData.push(row);
        });

        const workbook = XLSX.utils.book_new();
        const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
        const leaveSheet = XLSX.utils.aoa_to_sheet(leaveData);

        XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Lịch trực');
        XLSX.utils.book_append_sheet(workbook, leaveSheet, 'Lịch nghỉ phép');

        XLSX.writeFile(workbook, 'lab_schedule.xlsx');

    }

};

const DashboardModule = {

    render(){

        const totalStaff = WorkTimeModule.staffs.length;
        const totalWeeks = DataModule.schedules.length;
        const totalLeaves = DataModule.leaves.length;

        document.getElementById('totalStaffCount').innerText = totalStaff;
        document.getElementById('totalWeeksCount').innerText = totalWeeks;
        document.getElementById('totalLeavesCount').innerText = totalLeaves;

    }

};

const DeviceModule = {
    type:'desktop',
    detect(){
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        this.type = mobileRegex.test(ua) ? 'mobile' : 'desktop';
        document.body.classList.add(this.type);
    },
    isMobile(){
        return this.type === 'mobile';
    },
    isDesktop(){
        return this.type === 'desktop';
    }
};

const MobileNavModule = {
    open:false,
    toggle(){
        if(!DeviceModule.isMobile()) return;
        this.open ? this.close() : this.openSidebar();
    },
    openSidebar(){
        document.querySelector('.sidebar').classList.add('open');
        document.getElementById('mobileNavOverlay').classList.remove('hidden');
        this.open = true;
    },
    close(){
        document.querySelector('.sidebar').classList.remove('open');
        document.getElementById('mobileNavOverlay').classList.add('hidden');
        this.open = false;
    },
    update(){
        const button = document.getElementById('mobileMenuToggle');
        if(DeviceModule.isMobile()){
            button.classList.remove('hidden');
        } else {
            button.classList.add('hidden');
            this.close();
        }
    }
};

const RealtimeModule = {

    startClock(){

        setInterval(()=>{

            document.getElementById('clock').innerHTML =
            new Date().toLocaleTimeString('vi-VN');

        },1000);

    }

};

async function initApp(){
    DeviceModule.detect();
    MobileNavModule.update();
    await StorageModule.load();

    UIModule.renderSchedule();

    RealtimeModule.startClock();

    WorkTimeModule.render();

    DashboardModule.render();

    firebaseAuth.onAuthStateChanged(user=>{

    if(user){

        AuthModule.currentUser = {

            email:user.email,

            role:
                user.email ===
                'admin@gmail.com'
                ? 'admin'
                : 'viewer'

        };

        document
            .getElementById('loginModal')
            .classList.add('hidden');

        AuthModule.updatePermission();

    }
    else{

        document
            .getElementById('loginModal')
            .classList.remove('hidden');

    }

});

    SaveStatusModule.markSaved();

    // start realtime sync if Firestore available
    if(window.firestoreDB){
        SyncModule.start();
    }

}

window.addEventListener('load', initApp);

    const firebaseConfig = {
        apiKey: "AIzaSyC-R1iGyb_YkRRTR3J2R2EqTPGLf09_Bqg",
        authDomain: "lab1-fac84.firebaseapp.com",
        projectId: "lab1-fac84",
        storageBucket: "lab1-fac84.firebasestorage.app",
        messagingSenderId: "18384394433",
        appId: "1:18384394433:web:386b8d026cf817f19e5c40",
        measurementId: "G-H3N4YLMZPP"
    };

    try{
        firebase.initializeApp(firebaseConfig);

        window.firestoreDB = firebase.firestore();
        window.firebaseAuth = firebase.auth();
        console.info('Firebase initialized');
    }catch(e){
        console.warn('Firebase init failed', e);
    }
