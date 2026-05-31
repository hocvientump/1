const CTMAnalysis = (() => {
        const normalRanges = {
          "WBC": { "min": 3.50, "max": 9.50, "unit": "10^9/L" },
          "Neu#": { "min": 1.80, "max": 6.30, "unit": "10^9/L" },
          "Lym#": { "min": 1.10, "max": 3.20, "unit": "10^9/L" },
          "Mon#": { "min": 0.10, "max": 0.60, "unit": "10^9/L" },
          "Eos#": { "min": 0.02, "max": 0.52, "unit": "10^9/L" },
          "Bas#": { "min": 0.00, "max": 0.06, "unit": "10^9/L" },
          "Neu%": { "min": 40.0, "max": 75.0, "unit": "%" },
          "Lym%": { "min": 20.0, "max": 50.0, "unit": "%" },
          "Mon%": { "min": 3.0, "max": 10.0, "unit": "%" },
          "Eos%": { "min": 0.4, "max": 8.0, "unit": "%" },
          "Bas%": { "min": 0.0, "max": 1.0, "unit": "%" },
          "RBC": { "min": 3.80, "max": 5.80, "unit": "10^12/L" },
          "HGB": { "min": 115, "max": 175, "unit": "g/L" },
          "HCT": { "min": 35.0, "max": 50.0, "unit": "%" },
          "MCV": { "min": 82.0, "max": 100.0, "unit": "fL" },
          "MCH": { "min": 27.0, "max": 34.0, "unit": "pg" },
          "MCHC": { "min": 316, "max": 354, "unit": "g/L" },
          "RDW-CV": { "min": 11.0, "max": 16.0, "unit": "%" },
          "RDW-SD": { "min": 35.0, "max": 56.0, "unit": "fL" },
          "PLT": { "min": 125, "max": 350, "unit": "10^9/L" },
          "MPV": { "min": 6.5, "max": 12.0, "unit": "fL" },
          "PDW": { "min": 9.0, "max": 17.0, "unit": "fL" },
          "PCT": { "min": 0.108, "max": 0.282, "unit": "%" },
          "PLCR": { "min": 11.0, "max": 45.0, "unit": "%" },
          "PLCC": { "min": 30, "max": 90, "unit": "10^9/L" }
        };

        const groups = {
          WBC: ["WBC", "Neu#", "Lym#", "Mon#", "Eos#", "Bas#", "Neu%", "Lym%", "Mon%", "Eos%", "Bas%"],
          RBC: ["RBC", "HGB", "HCT", "MCV", "MCH", "MCHC", "RDW-CV", "RDW-SD"],
          PLT: ["PLT", "MPV", "PDW", "PCT", "PLCR", "PLCC"]
        };

        function createParameterRows() {
          const tbody = document.querySelector('#ctm-parameter-table');
          tbody.innerHTML = '';
          const displayRanges = getAdjustedRanges();
          Object.keys(displayRanges).forEach((key) => {
            const range = displayRanges[key];
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${key}</td>
              <td><input type="number" step="any" id="ctm-input-${key}" placeholder="Nhập giá trị" /></td>
              <td>${range.min} - ${range.max} ${range.unit}</td>
              <td id="ctm-status-${key}" class="status-missing">Chưa nhập</td>
            `;
            tbody.appendChild(row);
          });
        }

        function parseValue(id) {
          const input = document.getElementById(id);
          if (!input) return null;
          const raw = input.value.trim();
          if (raw === '') return null;
          const value = parseFloat(raw.replace(',', '.'));
          return Number.isFinite(value) ? value : null;
        }

        function getInputValues() {
          const values = {
            sex: document.getElementById('ctm-sex').value,
            age: parseValue('ctm-age'),
            diagnosis: document.getElementById('ctm-diagnosis').value
          };
          Object.keys(normalRanges).forEach((key) => {
            values[key] = parseValue(`ctm-input-${key}`);
          });
          return values;
        }

        function compareValue(key, value, range) {
          if (!range) return { state: 'missing', label: 'Không có tham chiếu' };
          if (value == null) return { state: 'missing', label: 'Chưa nhập' };
          if (value < range.min) return { state: 'low', label: 'Thấp' };
          if (value > range.max) return { state: 'high', label: 'Cao' };
          return { state: 'normal', label: 'Bình thường' };
        }

        function percentDiff(value, range) {
          if (value == null) return null;
          const mid = (range.min + range.max) / 2;
          if (mid === 0) return 0;
          return ((value - mid) / mid) * 100;
        }

        function formatStatus({ state, label }, value, range) {
          const diff = percentDiff(value, range);
          const diffText = diff == null ? '' : ` 
(${value} ${range ? range.unit : ''}${diff ? `, ${diff.toFixed(1)}%` : ''})`;
          return `<span class="status-${state}">${label}${diffText}</span>`;
        }

        function getAdjustedRanges(values) {
          const stored = JSON.parse(localStorage.getItem('bloodCountRanges') || 'null');
          const base = stored || normalRanges;
          const adjusted = JSON.parse(JSON.stringify(base));
          const sex = values && values.sex ? values.sex : (document.getElementById('ctm-sex') ? document.getElementById('ctm-sex').value : '');
          const age = values && typeof values.age === 'number' ? values.age : parseValue('ctm-age');

          if (sex === 'Nam') {
            if (adjusted.HGB) { adjusted.HGB.min = 130; adjusted.HGB.max = 170; }
            if (adjusted.RBC) { adjusted.RBC.min = 4.50; adjusted.RBC.max = 5.90; }
            if (adjusted.HCT) { adjusted.HCT.min = 40.0; adjusted.HCT.max = 54.0; }
          } else if (sex === 'Nữ') {
            if (adjusted.HGB) { adjusted.HGB.min = 120; adjusted.HGB.max = 155; }
            if (adjusted.RBC) { adjusted.RBC.min = 4.00; adjusted.RBC.max = 5.20; }
            if (adjusted.HCT) { adjusted.HCT.min = 36.0; adjusted.HCT.max = 48.0; }
          }

          if (typeof age === 'number' && age < 18) {
            if (adjusted.HGB) { adjusted.HGB.min = Math.max(100, adjusted.HGB.min - 10); }
          }

          return adjusted;
        }

        function getSavedRanges() {
          const stored = JSON.parse(localStorage.getItem('bloodCountRanges') || 'null');
          return (stored && typeof stored === 'object') ? stored : normalRanges;
        }

        function updateStatusCells(values) {
          const ranges = getAdjustedRanges(values);
          Object.keys(ranges).forEach((key) => {
            const statusCell = document.getElementById(`ctm-status-${key}`);
            const range = ranges[key];
            if (statusCell) {
              statusCell.innerHTML = formatStatus(compareValue(key, values[key], range), values[key], range);
            }
          });
        }

        function analyzeGroup(keys, values) {
          const ranges = getAdjustedRanges(values);
          const issues = [];
          keys.forEach((key) => {
            const result = compareValue(key, values[key], ranges[key]);
            if (result.state === 'low') issues.push(`${key} thấp`);
            else if (result.state === 'high') issues.push(`${key} cao`);
          });
          return issues;
        }

        function buildConclusions(values) {
          const wbcIssues = analyzeGroup(groups.WBC, values);
          const rbcIssues = analyzeGroup(groups.RBC, values);
          const pltIssues = analyzeGroup(groups.PLT, values);

          const conclusions = [];
          if (wbcIssues.length === 0) conclusions.push('Nhóm bạch cầu: bình thường.');
          else conclusions.push(`Nhóm bạch cầu: ${wbcIssues.join(', ')}.`);

          if (rbcIssues.length === 0) conclusions.push('Nhóm hồng cầu: bình thường.');
          else conclusions.push(`Nhóm hồng cầu: ${rbcIssues.join(', ')}.`);

          if (pltIssues.length === 0) conclusions.push('Nhóm tiểu cầu: bình thường.');
          else conclusions.push(`Nhóm tiểu cầu: ${pltIssues.join(', ')}.`);

          const detailed = [];
          const { WBC, HGB, MCV, MCHC, PLT, MPV, PLCR } = values;
          const neuPercent = values['Neu%'];
          const lymPercent = values['Lym%'];
          const monPercent = values['Mon%'];
          const eosPercent = values['Eos%'];
          const basPercent = values['Bas%'];
          const rdw = values['RDW-CV'];
          const adjRanges = getAdjustedRanges(values);

          function severityLabel(value, range) {
            if (value == null || range == null) return '';
            let pct = 0;
            if (value > range.max) pct = ((value - range.max) / range.max) * 100;
            else if (value < range.min) pct = ((range.min - value) / range.min) * 100;
            if (pct < 20) return 'nhẹ';
            if (pct < 50) return 'vừa';
            return 'nặng';
          }

          if (WBC != null) {
            if (WBC > adjRanges.WBC.max) {
              const sev = severityLabel(WBC, adjRanges.WBC);
              detailed.push(`WBC tăng (${sev}): có thể do nhiễm khuẩn hoặc viêm.`);
            }
            if (WBC < adjRanges.WBC.min) {
              const sev = severityLabel(WBC, adjRanges.WBC);
              detailed.push(`WBC giảm (${sev}): cân nhắc suy giảm miễn dịch, nhiễm virus hoặc thuốc.`);
            }
          }

          if (HGB != null && HGB < adjRanges.HGB.min) {
            if (MCV != null && MCV < adjRanges.MCV.min) detailed.push('Thiếu máu microcytic: nghi thiếu sắt hoặc mất máu mạn.');
            else if (MCV != null && MCV > adjRanges.MCV.max) detailed.push('Thiếu máu macrocytic: nghi thiếu B12/folate hoặc rối loạn gan/métabol.');
            else detailed.push('Thiếu máu normocytic: cân nhắc mất máu cấp, viêm mạn hoặc suy tủy.');
            if (rdw != null && rdw > adjRanges['RDW-CV'].max) detailed.push('RDW tăng: gợi ý thiếu sắt hoặc hỗn hợp thiếu máu.');
          }

          if (PLT != null) {
            if (PLT < adjRanges.PLT.min) detailed.push('Giảm tiểu cầu: cần đánh giá xuất huyết, thuốc hoặc rối loạn tủy.');
            if (PLT > adjRanges.PLT.max) detailed.push('Tăng tiểu cầu: có thể do viêm mạn, nhiễm trùng hoặc rối loạn tủy.');
          }
          if (PLCR != null && PLCR > adjRanges.PLCR.max) detailed.push('PLCR cao: có tiểu cầu non, cân nhắc đánh giá chức năng tiểu cầu.');

          if (neuPercent != null && neuPercent > adjRanges['Neu%'].max) detailed.push('Tỷ lệ neutrophil tăng: phù hợp nhiễm khuẩn cấp.');
          if (lymPercent != null && lymPercent > adjRanges['Lym%'].max) detailed.push('Tỷ lệ lymphocyte tăng: phù hợp nhiễm virus hoặc viêm mạn.');
          if (monPercent != null && monPercent > adjRanges['Mon%'].max) detailed.push('Tỷ lệ mono tăng: cân nhắc nhiễm trùng mạn, viêm hoặc phục hồi sau nhiễm.');

          const inconsistencies = [];
          if (WBC != null && neuPercent != null && values['Neu#'] != null) {
            const expectedNeuAbs = WBC * (neuPercent / 100);
            const absNeu = values['Neu#'];
            const rel = Math.abs(expectedNeuAbs - absNeu) / Math.max(expectedNeuAbs, 0.1);
            if (rel > 0.35) inconsistencies.push('Sai lệch giữa `Neu#` và `Neu%`: kiểm tra lại giá trị nhập.');
          }

          const recommendation = [];
          if (HGB != null && HGB < adjRanges.HGB.min) {
            if (MCV != null && MCV < adjRanges.MCV.min) recommendation.push('Xét nghiệm sắt, ferritin, TIBC.');
            if (MCV != null && MCV > adjRanges.MCV.max) recommendation.push('Xét nghiệm vitamin B12, folate, chức năng gan.');
            if (MCV != null && MCV >= adjRanges.MCV.min && MCV <= adjRanges.MCV.max) recommendation.push('Xét nghiệm chức năng thận, định lượng EPO, tìm nguồn chảy máu.');
          }
          if (WBC != null) {
            if (WBC > adjRanges.WBC.max) recommendation.push('CRP, procalcitonin, cấy máu/đàm nếu nghi nhiễm khuẩn.');
            if (WBC < adjRanges.WBC.min) recommendation.push('Xét nghiệm miễn dịch, kiểm tra thuốc, sàng lọc virus (HIV, HBV, HCV) nếu cần).');
          }
          if (PLT != null) {
            if (PLT < adjRanges.PLT.min) recommendation.push('Đánh giá đông máu (PT/INR, aPTT), D-dimer, hội chứng giảm tiểu cầu.');
            if (PLT > adjRanges.PLT.max) recommendation.push('Đánh giá chức năng tiểu cầu, fibrinogen, và xét nghiệm tủy xương nếu cần.');
          }
          if (MPV != null && MPV > adjRanges.MPV.max) recommendation.push('MPV cao: đánh giá tiểu cầu non và chức năng tiểu cầu.');
          if (MCV != null && MCV > adjRanges.MCV.max) recommendation.push('MCV cao: đánh giá thiếu B12/folate, nghiện rượu, bệnh gan.');

          const finalRecommendations = [...new Set(recommendation.concat(Object.values(inconsistencies)))].slice(0, 12);

          const diagnoses = [];
          if (WBC != null && (WBC >= 15 || (WBC > adjRanges.WBC.max && neuPercent != null && neuPercent > adjRanges['Neu%'].max))) diagnoses.push('Nhiễm khuẩn cấp (nghi)');
          if (lymPercent != null && lymPercent > adjRanges['Lym%'].max && (WBC == null || WBC <= adjRanges.WBC.max)) diagnoses.push('Nhiễm virus (nghi)');

          if (HGB != null && HGB < adjRanges.HGB.min) {
            if (MCV != null && MCV < adjRanges.MCV.min) diagnoses.push('Thiếu máu do thiếu sắt (nghi)');
            else if (MCV != null && MCV > adjRanges.MCV.max) diagnoses.push('Thiếu máu do thiếu B12/folate (nghi)');
            else diagnoses.push('Thiếu máu (nghi): cân nhắc mất máu cấp/mạn hoặc bệnh mạn.');
            if (rdw != null && rdw > adjRanges['RDW-CV'].max) diagnoses.push('Thiếu sắt nghi do RDW tăng.');
          }

          if (PLT != null && PLT < adjRanges.PLT.min) {
            const wbcStat = compareValue('WBC', WBC, adjRanges).state;
            const hgbStat = compareValue('HGB', HGB, adjRanges).state;
            if (wbcStat === 'normal' && hgbStat === 'normal' && PLT < 100) diagnoses.push('ITP (giảm tiểu cầu tự miễn) (nghi)');
            diagnoses.push('Giảm tiểu cầu (nghi): ITP, thuốc, rối loạn tủy.');
          }
          if (PLT != null && PLT > adjRanges.PLT.max) {
            diagnoses.push('Tăng tiểu cầu (nghi): phản ứng viêm, thiếu sắt hoặc bệnh tủy.');
            if (PLT > 600) diagnoses.push('Nghi rối loạn tăng sản tủy (MPN) (nghi)');
          }

          const lowCounts = [compareValue('WBC', WBC, adjRanges).state === 'low', compareValue('HGB', HGB, adjRanges).state === 'low', compareValue('PLT', PLT, adjRanges).state === 'low'].filter(Boolean).length;
          if (lowCounts >= 3) diagnoses.push('Pancytopenia: cân nhắc suy tủy hoặc rối loạn tủy xương (nghi)');
          else if (lowCounts >= 2) diagnoses.push('Nhiều dòng tế bào giảm: cân nhắc SLE, suy tủy hoặc rối loạn miễn dịch (nghi)');

          if ((WBC != null && WBC >= 20) || (WBC != null && WBC < adjRanges.WBC.min && neuPercent != null && neuPercent > adjRanges['Neu%'].max)) {
            diagnoses.push('Nhiễm khuẩn nặng / Sepsis (nghi)');
          }

          if ((HGB != null && HGB > adjRanges.HGB.max) || (values.HCT != null && values.HCT > adjRanges.HCT.max)) diagnoses.push('Nghi tăng sinh tủy (polycythemia/MPN) (nghi)');

          if (inconsistencies.length > 0) diagnoses.push('Có sai lệch dữ liệu (kiểm tra lại Neu#/Neu%).');

          try {
            const rules = JSON.parse(localStorage.getItem('bloodCountDiagnosisRules') || '[]');
            rules.forEach((rule) => {
              if (!rule.conditions || !Array.isArray(rule.conditions)) return;
              if (evaluateRuleNode(rule, values)) diagnoses.push(rule.name || 'Quy tắc chưa đặt tên');
            });
          } catch (e) {
          }
          return {
            groupSummaries: [
              { title: 'Bạch cầu', summary: wbcIssues.length === 0 ? 'Bình thường.' : wbcIssues.join(', ') + '.' },
              { title: 'Hồng cầu', summary: rbcIssues.length === 0 ? 'Bình thường.' : rbcIssues.join(', ') + '.' },
              { title: 'Tiểu cầu', summary: pltIssues.length === 0 ? 'Bình thường.' : pltIssues.join(', ') + '.' }
            ],
            finalText: [
              `Bệnh nhân: ${values.sex || 'Chưa chọn giới tính'}, tuổi ${values.age != null ? values.age : 'chưa nhập'}.`,
              values.diagnosis ? `Chẩn đoán / ghi chú: ${values.diagnosis}.` : 'Không có chẩn đoán bổ sung.',
              ...detailed
            ].join(' '),
            recommendations: finalRecommendations,
            diagnoses,
            extra: (detailed.length === 0 && inconsistencies.length === 0) ? 'Không có dấu hiệu bất thường rõ ràng. Kết hợp lâm sàng để đưa ra chẩn đoán chính xác.' : (detailed.concat(inconsistencies).join(' '))
          };
        }

        function analyzeResults() {
          const values = getInputValues();
          updateStatusCells(values);
          const resultSection = document.getElementById('ctm-results');
          const finalSummary = document.getElementById('ctm-final-summary');
          const groupContainer = document.getElementById('ctm-group-summaries');
          const recommendationList = document.getElementById('ctm-recommendations');
          const extraComments = document.getElementById('ctm-extra-comments');
          const diagnosesDiv = document.getElementById('ctm-diagnoses');

          const analysis = buildConclusions(values);
          finalSummary.textContent = analysis.finalText;
          groupContainer.innerHTML = analysis.groupSummaries.map((item) => `
            <div class="summary-item">
              <div class="summary-label">${item.title}</div>
              <div>${item.summary}</div>
            </div>
          `).join('');
          recommendationList.innerHTML = analysis.recommendations.length > 0
            ? analysis.recommendations.map((r) => `<li>${r}</li>`).join('')
            : '<li>Không có đề nghị xét nghiệm bổ sung rõ ràng.</li>';
          extraComments.textContent = analysis.extra;
          diagnosesDiv.innerHTML = analysis.diagnoses && analysis.diagnoses.length > 0
            ? `<ul>${analysis.diagnoses.map(d => `<li><strong>${d}</strong></li>`).join('')}</ul>`
            : '<div>Không có chẩn đoán gợi ý rõ ràng.</div>';
          resultSection.style.display = 'block';
        }

        function saveCurrentRecord() {
          const values = getInputValues();
          const analysis = buildConclusions(values);
          const savedRecords = JSON.parse(localStorage.getItem('bloodCountRecords') || '[]');
          savedRecords.unshift({
            id: Date.now(),
            timestamp: new Date().toLocaleString('vi-VN'),
            sex: values.sex,
            age: values.age,
            diagnosis: values.diagnosis,
            values: Object.fromEntries(Object.entries(values).filter(([k]) => k in getAdjustedRanges(values))),
            summary: analysis.finalText,
            groups: analysis.groupSummaries
          });
          localStorage.setItem('bloodCountRecords', JSON.stringify(savedRecords));
          loadSavedRecords();
          alert('Đã lưu bản ghi vào kho dữ liệu.');
        }

        function loadSavedRecords() {
          const savedRecords = JSON.parse(localStorage.getItem('bloodCountRecords') || '[]');
          const list = document.getElementById('ctm-saved-records');
          list.innerHTML = savedRecords.length === 0
            ? '<li>Chưa có bản ghi nào.</li>'
            : savedRecords.map((record) => `
              <li>
                <div class="summary-item">
                  <span><strong>${record.timestamp}</strong></span>
                  <span>${record.sex || 'Giới tính chưa chọn'}, tuổi ${record.age != null ? record.age : 'chưa nhập'}</span>
                </div>
                <p><strong>Ghi chú:</strong> ${record.diagnosis || 'Không có'}</p>
                <p><strong>Tóm tắt:</strong> ${record.summary}</p>
              </li>
            `).join('');
        }

        function clearSavedRecords() {
          if (!confirm('Xác nhận xóa toàn bộ kho dữ liệu?')) return;
          localStorage.removeItem('bloodCountRecords');
          loadSavedRecords();
        }

        function clearForm() {
          document.getElementById('ctm-sex').value = '';
          document.getElementById('ctm-age').value = '';
          document.getElementById('ctm-diagnosis').value = '';
          Object.keys(normalRanges).forEach((key) => {
            const el = document.getElementById(`ctm-input-${key}`);
            if (el) el.value = '';
            const st = document.getElementById(`ctm-status-${key}`);
            if (st) st.innerHTML = '<span class="status-missing">Chưa nhập</span>';
          });
          document.getElementById('ctm-results').style.display = 'none';
        }

        function exportRecords() {
          const savedRecords = localStorage.getItem('bloodCountRecords');
          if (!savedRecords) {
            alert('Kho dữ liệu trống.');
            return;
          }
          const blob = new Blob([savedRecords], { type: 'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'blood-count-records.json';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }

        function loadSettingsEditor() {
          const storedRanges = localStorage.getItem('bloodCountRanges');
          document.getElementById('ctm-ranges-json').value = storedRanges || JSON.stringify(normalRanges, null, 2);
          const storedDiag = localStorage.getItem('bloodCountDiagnosisRules');
          document.getElementById('ctm-diag-json').value = storedDiag || JSON.stringify([
            {
              "name": "Nhiễm khuẩn cấp (nghi)",
              "logic": "AND",
              "conditions": [
                {"key":"WBC","op":">","value":10},
                {"key":"Neu%","op":">","value":70}
              ]
            },
            {
              "name": "Nhiễm virus (nghi)",
              "logic": "AND",
              "conditions": [
                {"key":"Lym%","op":">","value":50},
                {"key":"WBC","op":"<=","value":10}
              ]
            }
          ], null, 2);
          const storedUrl = localStorage.getItem('bloodCountSyncUrl') || '';
          const storedToken = localStorage.getItem('bloodCountSyncToken') || '';
          const su = document.getElementById('ctm-sync-url');
          const st = document.getElementById('ctm-sync-token');
          if (su) su.value = storedUrl;
          if (st) st.value = storedToken;
        }

        async function applyRangesFromEditor() {
          try {
            const parsed = JSON.parse(document.getElementById('ctm-ranges-json').value);
            localStorage.setItem('bloodCountRanges', JSON.stringify(parsed));
            createParameterRows();
            if (window.StorageModule) await StorageModule.save();
            alert('Đã áp dụng dải tham chiếu mới và đồng bộ.');
          } catch (e) {
            alert('JSON không hợp lệ: ' + e.message);
          }
        }

        async function resetRanges() {
          localStorage.removeItem('bloodCountRanges');
          document.getElementById('ctm-ranges-json').value = JSON.stringify(normalRanges, null, 2);
          createParameterRows();
          if (window.StorageModule) await StorageModule.save();
          alert('Đã tải lại dải tham chiếu mặc định và đồng bộ.');
        }

        function evaluateRuleNode(node, values) {
          if (!node) return false;
          if (Array.isArray(node.conditions)) {
            const logic = (node.logic || 'AND').toUpperCase();
            const results = node.conditions.map((child) => evaluateRuleNode(child, values));
            const ok = logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
            return node.not ? !ok : ok;
          }
          const key = node.key;
          const op = node.op;
          const value = node.hasOwnProperty('value') ? node.value : null;
          const not = !!node.not;
          const compareTo = node.valueKey ? values[node.valueKey] : value;
          const left = values[key];
          if (left == null || compareTo == null) return false;
          let res = false;
          switch (op) {
            case '<': res = left < compareTo; break;
            case '<=': res = left <= compareTo; break;
            case '>': res = left > compareTo; break;
            case '>=': res = left >= compareTo; break;
            case '==': res = left == compareTo; break;
            case '!=': res = left != compareTo; break;
            default: res = false;
          }
          return not ? !res : res;
        }

        async function applyDiagRulesFromEditor() {
          try {
            const parsed = JSON.parse(document.getElementById('ctm-diag-json').value);
            localStorage.setItem('bloodCountDiagnosisRules', JSON.stringify(parsed));
            if (window.StorageModule) await StorageModule.save();
            alert('Đã áp dụng quy tắc chẩn đoán mới và đồng bộ.');
          } catch (e) {
            alert('JSON không hợp lệ: ' + e.message);
          }
        }

        async function resetDiagRules() {
          localStorage.removeItem('bloodCountDiagnosisRules');
          loadSettingsEditor();
          if (window.StorageModule) await StorageModule.save();
          alert('Đã tải lại quy tắc chẩn đoán mặc định và đồng bộ.');
        }

        function syncToServer() {
          const url = document.getElementById('ctm-sync-url').value.trim();
          const token = document.getElementById('ctm-sync-token').value.trim();
          if (!url) { alert('Vui lòng nhập URL API để đồng bộ.'); return; }
          const payload = {
            ranges: JSON.parse(localStorage.getItem('bloodCountRanges') || JSON.stringify(normalRanges)),
            diagRules: JSON.parse(localStorage.getItem('bloodCountDiagnosisRules') || '[]')
          };
          fetch(url, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': `Bearer ${token}` } : {}),
            body: JSON.stringify(payload)
          }).then(res => {
            if (!res.ok) throw new Error(`Server trả về ${res.status}`);
            alert('Đồng bộ thành công.');
          }).catch(e => alert('Đồng bộ thất bại: ' + e.message));
        }

        function pullFromServer() {
          const url = document.getElementById('ctm-sync-url').value.trim();
          const token = document.getElementById('ctm-sync-token').value.trim();
          if (!url) { alert('Vui lòng nhập URL API để lấy quy tắc.'); return; }
          fetch(url, {
            method: 'GET',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }).then(res => {
            if (!res.ok) throw new Error(`Server trả về ${res.status}`);
            return res.json();
          }).then(data => {
            if (data.ranges) localStorage.setItem('bloodCountRanges', JSON.stringify(data.ranges));
            if (data.diagRules) localStorage.setItem('bloodCountDiagnosisRules', JSON.stringify(data.diagRules));
            loadSettingsEditor();
            createParameterRows();
            alert('Lấy quy tắc từ server thành công.');
          }).catch(e => alert('Lấy quy tắc thất bại: ' + e.message));
        }

        function resetDiagRules() {
          localStorage.removeItem('bloodCountDiagnosisRules');
          loadSettingsEditor();
          alert('Đã tải lại quy tắc chẩn đoán mặc định.');
        }

        function init() {
          createParameterRows();
          loadSavedRecords();
          loadSettingsEditor();
        }

        window.addEventListener('load', init);

        return {
          createParameterRows,
          analyzeResults,
          saveCurrentRecord,
          clearForm,
          exportRecords,
          applyRangesFromEditor,
          resetRanges,
          applyDiagRulesFromEditor,
          resetDiagRules,
          syncToServer,
          pullFromServer,
          clearSavedRecords,
          getSavedRanges
        };
    })();

    const BiochemistryModule = (() => {
        const defaultRanges = {
            "ALT": { min: 7, max: 56, unit: "U/L" },
            "AST": { min: 10, max: 40, unit: "U/L" },
            "ALP": { min: 44, max: 147, unit: "U/L" },
            "GGT": { min: 9, max: 48, unit: "U/L" },
            "Bilirubin total": { min: 0.1, max: 1.2, unit: "mg/dL" },
            "Bilirubin direct": { min: 0, max: 0.3, unit: "mg/dL" },
            "Urea": { min: 2.5, max: 7.1, unit: "mmol/L" },
            "Creatinine": { min: 0.6, max: 1.3, unit: "mg/dL" },
            "Glucose": { min: 70, max: 99, unit: "mg/dL" },
            "Cholesterol": { min: 0, max: 200, unit: "mg/dL" },
            "HDL": { min: 40, max: 100, unit: "mg/dL" },
            "LDL": { min: 0, max: 100, unit: "mg/dL" },
            "Triglycerides": { min: 0, max: 150, unit: "mg/dL" },
            "Na": { min: 135, max: 145, unit: "mmol/L" },
            "K": { min: 3.5, max: 5.1, unit: "mmol/L" },
            "Cl": { min: 98, max: 107, unit: "mmol/L" },
            "Ca": { min: 8.5, max: 10.2, unit: "mg/dL" },
            "Mg": { min: 1.7, max: 2.2, unit: "mg/dL" }
        };

        const categories = {
            "Gan": ["ALT", "AST", "ALP", "GGT", "Bilirubin total", "Bilirubin direct"],
            "Thận": ["Urea", "Creatinine"],
            "Chuyển hóa": ["Glucose", "Cholesterol", "HDL", "LDL", "Triglycerides"],
            "Điện giải": ["Na", "K", "Cl", "Ca", "Mg"]
        };

        function getSavedRanges() {
            const configRanges = window.ConfigModule && window.ConfigModule.biochemistryRanges;
            if (configRanges && typeof configRanges === 'object') {
                return configRanges;
            }
            const local = JSON.parse(localStorage.getItem('biochemistryRanges') || 'null');
            return (local && typeof local === 'object') ? local : defaultRanges;
        }

        function getRangeForKey(key) {
            const ranges = getSavedRanges();
            return ranges[key] || defaultRanges[key] || null;
        }

        function createParameterRows() {
            const tbody = document.getElementById('biochemistry-parameter-table');
            tbody.innerHTML = '';
            const ranges = getSavedRanges();
            Object.keys(defaultRanges).forEach((key) => {
                const range = ranges[key] || defaultRanges[key];
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${key}</td>
                    <td><input type="number" step="any" id="bio-input-${key}" placeholder="Nhập giá trị" /></td>
                    <td>${range.min} - ${range.max} ${range.unit}</td>
                    <td id="bio-status-${key}" class="status-missing">Chưa nhập</td>
                `;
                tbody.appendChild(row);
            });
        }

        function parseValue(id) {
            const el = document.getElementById(id);
            if (!el) return null;
            const raw = el.value.trim();
            if (raw === '') return null;
            const value = parseFloat(raw.replace(',', '.'));
            return Number.isFinite(value) ? value : null;
        }

        function getInputValues() {
            const values = {
                sex: document.getElementById('bio-sex') ? document.getElementById('bio-sex').value : '',
                age: parseValue('bio-age'),
                note: document.getElementById('bio-note') ? document.getElementById('bio-note').value : ''
            };
            Object.keys(defaultRanges).forEach((key) => {
                values[key] = parseValue(`bio-input-${key}`);
            });
            return values;
        }

        function compareValue(key, value) {
            const range = getRangeForKey(key);
            if (!range) return { state: 'missing', label: 'Không có tham chiếu' };
            if (value == null) return { state: 'missing', label: 'Chưa nhập' };
            if (value < range.min) return { state: 'low', label: 'Thấp' };
            if (value > range.max) return { state: 'high', label: 'Cao' };
            return { state: 'normal', label: 'Bình thường' };
        }

        function formatStatus(result, value, key) {
            const range = getRangeForKey(key);
            const diff = value == null ? '' : ` (${value} ${range ? range.unit : ''})`;
            return `<span class="status-${result.state}">${result.label}${diff}</span>`;
        }

        function updateStatusCells(values) {
            Object.keys(defaultRanges).forEach((key) => {
                const statusCell = document.getElementById(`bio-status-${key}`);
                if (!statusCell) return;
                const result = compareValue(key, values[key]);
                statusCell.innerHTML = formatStatus(result, values[key], key);
            });
        }

        function analyzeGroup(keys, values) {
            const issues = [];
            keys.forEach((key) => {
                const result = compareValue(key, values[key]);
                if (result.state === 'low') issues.push(`${key} thấp`);
                if (result.state === 'high') issues.push(`${key} cao`);
            });
            return issues;
        }

        function getSeverity(value, key) {
            const range = getRangeForKey(key);
            if (value == null || !range) return '';
            const limit = value > range.max ? range.max : range.min;
            const diff = Math.abs(value - limit);
            const ratio = limit === 0 ? 0 : diff / limit;
            if (ratio < 0.2) return 'nhẹ';
            if (ratio < 0.5) return 'vừa';
            return 'nặng';
        }

        function buildConclusions(values) {
            const groupSummaries = Object.keys(categories).map((group) => {
                const issues = analyzeGroup(categories[group], values);
                return {
                    title: group,
                    summary: issues.length === 0 ? 'Bình thường.' : issues.join(', ') + '.'
                };
            });

            const detailed = [];
            const diagnoses = [];
            const recommendations = [];
            const {
                ALT,
                AST,
                ALP,
                GGT,
                "Bilirubin total": bt,
                "Bilirubin direct": bd,
                Urea,
                Creatinine,
                Glucose,
                Cholesterol,
                HDL,
                LDL,
                Triglycerides,
                Na,
                K,
                Cl,
                Ca,
                Mg
            } = values;

            const isHigh = (key, value) => {
                const range = getRangeForKey(key);
                return value != null && range && value > range.max;
            };
            const isLow = (key, value) => {
                const range = getRangeForKey(key);
                return value != null && range && value < range.min;
            };

            if (ALT != null) {
                if (isHigh('ALT', ALT)) detailed.push(`ALT tăng (${getSeverity(ALT, 'ALT')}): gợi ý tổn thương gan tế bào.`);
                else if (isLow('ALT', ALT)) detailed.push('ALT thấp: thường ít ý nghĩa lâm sàng.');
            }
            if (AST != null) {
                if (isHigh('AST', AST)) detailed.push(`AST tăng (${getSeverity(AST, 'AST')}): có thể do viêm gan hoặc tổn thương cơ.`);
                else if (isLow('AST', AST)) detailed.push('AST thấp: ít khi có ý nghĩa lâm sàng rõ ràng.');
            }
            if (ALP != null) {
                if (isHigh('ALP', ALP)) detailed.push('ALP tăng: nghi tắc mật hoặc tổn thương xương.');
                else if (isLow('ALP', ALP)) detailed.push('ALP thấp: cân nhắc thiếu vitamin K hoặc bệnh lý gan nặng.');
            }
            if (GGT != null) {
                if (isHigh('GGT', GGT)) detailed.push('GGT tăng: gợi ý tổn thương ống mật hoặc nghiện rượu.');
            }
            if (bt != null && isHigh('Bilirubin total', bt)) detailed.push('Bilirubin tổng tăng: theo dõi vàng da/tan huyết.');
            if (bd != null && isHigh('Bilirubin direct', bd)) detailed.push('Bilirubin trực tiếp tăng: nghi tắc mật hoặc suy gan.');
            if (Urea != null) {
                if (isHigh('Urea', Urea)) detailed.push('Urea tăng: gợi ý chức năng thận suy giảm hoặc mất nước.');
                else if (isLow('Urea', Urea)) detailed.push('Urea thấp: có thể do dinh dưỡng kém hoặc suy gan.');
            }
            if (Creatinine != null) {
                if (isHigh('Creatinine', Creatinine)) detailed.push('Creatinine tăng: cần đánh giá chức năng thận.');
                else if (isLow('Creatinine', Creatinine)) detailed.push('Creatinine thấp: thường ít khi phản ánh bệnh lý nặng.');
            }
            if (Glucose != null) {
                if (isHigh('Glucose', Glucose)) detailed.push('Glucose tăng: nghi đái tháo đường.');
                else if (isLow('Glucose', Glucose)) detailed.push('Glucose thấp: cân nhắc hạ đường huyết.');
            }
            if (Cholesterol != null && isHigh('Cholesterol', Cholesterol)) detailed.push('Cholesterol cao: nguy cơ tim mạch tăng.');
            if (LDL != null && isHigh('LDL', LDL)) detailed.push('LDL cao: nguy cơ xơ vữa động mạch.');
            if (HDL != null && isLow('HDL', HDL)) detailed.push('HDL thấp: yếu tố nguy cơ tim mạch.');
            if (Triglycerides != null && isHigh('Triglycerides', Triglycerides)) detailed.push('Triglycerides cao: rối loạn chuyển hóa mỡ.');
            if (Na != null) {
                if (isLow('Na', Na)) detailed.push('Na thấp: cân nhắc mất nước hoặc rối loạn nội tiết.');
                else if (isHigh('Na', Na)) detailed.push('Na cao: gợi ý mất nước hoặc rối loạn muối nước.');
            }
            if (K != null) {
                if (isLow('K', K)) detailed.push('K thấp: nguy cơ loạn nhịp tim.');
                else if (isHigh('K', K)) detailed.push('K cao: cần đánh giá chức năng thận và điện giải.');
            }
            if (Cl != null) {
                if (isLow('Cl', Cl)) detailed.push('Cl thấp: gợi ý toan chuyển hóa hoặc mất dịch.');
                else if (isHigh('Cl', Cl)) detailed.push('Cl cao: gợi ý toan hô hấp hoặc mất nước.');
            }
            if (Ca != null) {
                if (isLow('Ca', Ca)) detailed.push('Calcium thấp: cân nhắc thiếu vitamin D hoặc rối loạn cận giáp.');
                else if (isHigh('Ca', Ca)) detailed.push('Calcium cao: đánh giá cường cận giáp hoặc ung thư.');
            }
            if (Mg != null) {
                if (isLow('Mg', Mg)) detailed.push('Magnesium thấp: theo dõi co cơ và tim.');
                else if (isHigh('Mg', Mg)) detailed.push('Magnesium cao: gợi ý suy thận hoặc dùng quá mức.');
            }

            if (ALT != null && AST != null && isHigh('ALT', ALT) && isHigh('AST', AST)) {
                const ratio = ALT === 0 ? null : AST / ALT;
                if (ratio !== null && ratio > 2) detailed.push('AST/ALT > 2: mô hình gợi ý tổn thương do rượu hoặc viêm gan nặng.');
                else detailed.push('ALT và AST đều tăng: tổn thương gan tế bào.');
            }
            if ((isHigh('ALP', ALP) || isHigh('GGT', GGT)) && bt != null && isHigh('Bilirubin total', bt)) {
                detailed.push('Mô hình cholestatic: nghi tắc mật hoặc viêm đường mật.');
            }
            if (bd != null && bt != null && isHigh('Bilirubin direct', bd) && isHigh('Bilirubin total', bt)) {
                detailed.push('Bilirubin trực tiếp tăng vượt trội: gợi ý tắc mật nội hoặc ngoại.');
            }

            if (isHigh('ALT', ALT) || isHigh('AST', AST)) {
                recommendations.push('Kiểm tra chức năng gan, siêu âm gan-mật, đánh giá thuốc/độc tố.');
                diagnoses.push('Nghi tổn thương gan tế bào.');
            }
            if (isHigh('ALP', ALP) || isHigh('GGT', GGT)) {
                recommendations.push('Đánh giá cholestasis, siêu âm gan-mật.');
                diagnoses.push('Nghi rối loạn đường mật.');
            }
            if (bt != null && isHigh('Bilirubin total', bt)) {
                recommendations.push('Kiểm tra hội chứng vàng da và các xét nghiệm tan máu.');
            }
            if (isHigh('Urea', Urea) || isHigh('Creatinine', Creatinine)) {
                recommendations.push('Đánh giá chức năng thận và điện giải.');
                diagnoses.push('Nghi suy thận hoặc giảm tưới máu thận.');
            }
            if (Glucose != null && (isHigh('Glucose', Glucose) || isLow('Glucose', Glucose))) {
                recommendations.push('Kiểm tra HbA1c, tư vấn chế độ ăn và theo dõi glucose.');
                diagnoses.push(isHigh('Glucose', Glucose) ? 'Nghi đái tháo đường.' : 'Nghi hạ đường huyết.');
            }
            if (isHigh('Cholesterol', Cholesterol) || isHigh('LDL', LDL) || isHigh('Triglycerides', Triglycerides) || isLow('HDL', HDL)) {
                recommendations.push('Đánh giá lipid toàn diện và tư vấn chế độ ăn/lifestyle.');
                diagnoses.push('Nghi rối loạn lipid máu.');
            }
            if (isLow('K', K) || isHigh('K', K) || isLow('Na', Na) || isHigh('Na', Na) || isLow('Cl', Cl) || isHigh('Cl', Cl) || isLow('Ca', Ca) || isHigh('Ca', Ca) || isLow('Mg', Mg) || isHigh('Mg', Mg)) {
                recommendations.push('Theo dõi điện giải, ECG nếu cần, và đánh giá chức năng thận.');
                diagnoses.push('Nghi rối loạn điện giải.');
            }

            const uniqueRecommendations = [...new Set(recommendations)];
            const finalDiagnoses = diagnoses.length ? [...new Set(diagnoses)] : ['Không có gợi ý chẩn đoán rõ ràng; phối hợp lâm sàng.'];

            return {
                groupSummaries,
                finalText: `Bệnh nhân ${values.sex || 'chưa chọn giới tính'}, tuổi ${values.age != null ? values.age : 'chưa nhập'}. ${values.note ? 'Ghi chú: ' + values.note + '.' : ''}`,
                recommendations: uniqueRecommendations.length ? uniqueRecommendations : ['Không có đề nghị bổ sung rõ ràng.'],
                extra: detailed.length ? detailed.join(' ') : 'Các chỉ số nằm trong giới hạn tham chiếu. Theo dõi và phối hợp lâm sàng.',
                diagnoses: finalDiagnoses
            };
        }

        function analyzeResults() {
            const values = getInputValues();
            updateStatusCells(values);
            const analysis = buildConclusions(values);
            document.getElementById('biochemistry-final-summary').innerText = analysis.finalText;
            document.getElementById('biochemistry-group-summaries').innerHTML = analysis.groupSummaries.map((item) => `
                <div class="summary-item">
                    <div class="summary-label">${item.title}</div>
                    <div>${item.summary}</div>
                </div>
            `).join('');
            document.getElementById('biochemistry-recommendations').innerHTML = analysis.recommendations.map(r => `<li>${r}</li>`).join('');
            document.getElementById('biochemistry-extra-comments').innerText = analysis.extra;
            document.getElementById('biochemistry-results').style.display = 'block';
        }

        function saveCurrentRecord() {
            const values = getInputValues();
            const analysis = buildConclusions(values);
            const savedRecords = JSON.parse(localStorage.getItem('biochemistryRecords') || '[]');
            savedRecords.unshift({
                id: Date.now(),
                timestamp: new Date().toLocaleString('vi-VN'),
                sex: values.sex,
                age: values.age,
                note: values.note,
                summary: analysis.finalText,
                extra: analysis.extra,
                values
            });
            localStorage.setItem('biochemistryRecords', JSON.stringify(savedRecords));
            loadSavedRecords();
            alert('Đã lưu bản ghi hóa sinh.');
        }

        function loadSavedRecords() {
            const savedRecords = JSON.parse(localStorage.getItem('biochemistryRecords') || '[]');
            const list = document.getElementById('biochemistry-saved-records');
            list.innerHTML = savedRecords.length === 0
                ? '<li>Chưa có bản ghi nào.</li>'
                : savedRecords.map((record) => `
                    <li>
                        <div class="summary-item">
                            <span><strong>${record.timestamp}</strong></span>
                            <span>${record.sex || 'Giới tính chưa chọn'}, tuổi ${record.age != null ? record.age : 'chưa nhập'}</span>
                        </div>
                        <p><strong>Ghi chú:</strong> ${record.note || 'Không có'}</p>
                        <p><strong>Tóm tắt:</strong> ${record.summary}</p>
                        <p><strong>Phân tích chi tiết:</strong> ${record.extra}</p>
                    </li>
                `).join('');
        }

        function clearSavedRecords() {
            if (!confirm('Xác nhận xóa toàn bộ kho dữ liệu hóa sinh?')) return;
            localStorage.removeItem('biochemistryRecords');
            loadSavedRecords();
        }

        function createReferenceSettingsRows() {
            const ranges = getSavedRanges();
            const tbody = document.getElementById('biochemistry-range-settings-table');
            if (!tbody) return;
            tbody.innerHTML = '';
            Object.keys(defaultRanges).forEach((key) => {
                const range = ranges[key] || defaultRanges[key];
                const safeKey = key.replace(/\s+/g, '_');
                tbody.innerHTML += `
                    <tr>
                        <td>${key}</td>
                        <td><input type="number" step="any" id="bio-ref-min-${safeKey}" value="${range.min}" /></td>
                        <td><input type="number" step="any" id="bio-ref-max-${safeKey}" value="${range.max}" /></td>
                        <td><input type="text" id="bio-ref-unit-${safeKey}" value="${range.unit}" /></td>
                    </tr>
                `;
            });
        }

        async function saveReferenceSettings() {
            const ranges = {};
            Object.keys(defaultRanges).forEach((key) => {
                const safeKey = key.replace(/\s+/g, '_');
                const minEl = document.getElementById(`bio-ref-min-${safeKey}`);
                const maxEl = document.getElementById(`bio-ref-max-${safeKey}`);
                const unitEl = document.getElementById(`bio-ref-unit-${safeKey}`);
                const min = minEl ? parseFloat(minEl.value) : null;
                const max = maxEl ? parseFloat(maxEl.value) : null;
                const unit = unitEl ? unitEl.value.trim() : defaultRanges[key].unit;
                ranges[key] = {
                    min: Number.isFinite(min) ? min : defaultRanges[key].min,
                    max: Number.isFinite(max) ? max : defaultRanges[key].max,
                    unit: unit || defaultRanges[key].unit
                };
            });
            if (window.ConfigModule) {
                ConfigModule.setBiochemistryRanges(ranges);
            } else {
                localStorage.setItem('biochemistryRanges', JSON.stringify(ranges));
            }
            if (window.StorageModule) {
                await StorageModule.save();
            }
            createParameterRows();
            createReferenceSettingsRows();
            NotificationModule.success('Đã lưu tham chiếu hóa sinh.');
        }

        function resetReferenceSettings() {
            localStorage.removeItem('biochemistryRanges');
            if (window.ConfigModule) {
                ConfigModule.biochemistryRanges = null;
            }
            createParameterRows();
            createReferenceSettingsRows();
            NotificationModule.success('Đã tải lại tham chiếu hóa sinh mặc định.');
        }

        function loadReferenceSettingsEditor() {
            createReferenceSettingsRows();
        }

        function clearForm() {
            document.getElementById('bio-sex').value = '';
            document.getElementById('bio-age').value = '';
            document.getElementById('bio-note').value = '';
            Object.keys(defaultRanges).forEach((key) => {
                const input = document.getElementById(`bio-input-${key}`);
                if (input) input.value = '';
                const status = document.getElementById(`bio-status-${key}`);
                if (status) status.innerHTML = '<span class="status-missing">Chưa nhập</span>';
            });
            document.getElementById('biochemistry-results').style.display = 'none';
        }

        function exportRecords() {
            const savedRecords = localStorage.getItem('biochemistryRecords');
            if (!savedRecords) {
                alert('Kho dữ liệu hóa sinh trống.');
                return;
            }
            const blob = new Blob([savedRecords], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'biochemistry-records.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function init() {
            createParameterRows();
            loadSavedRecords();
            loadReferenceSettingsEditor();
        }

        window.addEventListener('load', init);

        return {
            analyzeResults,
            saveCurrentRecord,
            clearForm,
            exportRecords,
            clearSavedRecords,
            saveReferenceSettings,
            resetReferenceSettings,
            loadReferenceSettingsEditor,
            getSavedRanges
        };
    })();

const ImmunologyModule = (() => {
    const defaultRanges = {
        'IgG': { min: 700, max: 1600, unit: 'mg/dL' },
        'IgM': { min: 40, max: 230, unit: 'mg/dL' },
        'IgA': { min: 70, max: 400, unit: 'mg/dL' },
        'IgE': { min: 0, max: 150, unit: 'IU/mL' },
        'C3': { min: 0.9, max: 1.8, unit: 'g/L' },
        'C4': { min: 0.1, max: 0.4, unit: 'g/L' },
        'RF (Rheumatoid Factor)': { min: 0, max: 20, unit: 'IU/mL' },
        'CRP': { min: 0, max: 10, unit: 'mg/L' },
        'ANA (Anti-Nuclear Antibody)': { min: 0, max: 1, unit: 'Negative/Positive' },
        'Anti-HCV': { min: 0, max: 1, unit: 'Negative/Positive' },
        'Anti-HBc (HBcore)': { min: 0, max: 1, unit: 'Negative/Positive' },
        'HBsAg': { min: 0, max: 1, unit: 'Negative/Positive' },
        'Anti-HIV': { min: 0, max: 1, unit: 'Negative/Positive' },
        'TSH': { min: 0.3, max: 4.0, unit: 'mIU/L' },
        'T3': { min: 2.5, max: 5.8, unit: 'pg/mL' },
        'T4': { min: 4.5, max: 11.0, unit: 'ng/dL' }
    };

    const groups = {
        Antibodies: ['IgG', 'IgM', 'IgA', 'IgE'],
        Complement: ['C3', 'C4'],
        InflammationMarkers: ['RF (Rheumatoid Factor)', 'CRP'],
        AutoimmunityMarkers: ['ANA (Anti-Nuclear Antibody)'],
        InfectiousMarkers: ['Anti-HCV', 'Anti-HBc (HBcore)', 'HBsAg', 'Anti-HIV'],
        ThyroidFunction: ['TSH', 'T3', 'T4']
    };

    function getSavedRanges() {
        if (window.ConfigModule && ConfigModule.immunologyRanges) {
            return ConfigModule.immunologyRanges;
        }
        const stored = JSON.parse(localStorage.getItem('immunologyRanges') || 'null');
        return stored && typeof stored === 'object' ? stored : defaultRanges;
    }

    function getRangeForKey(key) {
        const ranges = getSavedRanges();
        return ranges[key] || defaultRanges[key] || null;
    }

    function createParameterRows() {
        const tbody = document.querySelector('#immunology-parameter-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        const displayRanges = getSavedRanges();
        Object.keys(displayRanges).forEach((key) => {
            const range = displayRanges[key];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${key}</td>
                <td><input type="number" step="any" id="imm-input-${key.replace(/\s+/g, '_')}" placeholder="Nhập giá trị" /></td>
                <td>${range.min} - ${range.max} ${range.unit}</td>
                <td id="imm-status-${key.replace(/\s+/g, '_')}" class="status-missing">Chưa nhập</td>
            `;
            tbody.appendChild(row);
        });
    }

    function parseValue(id) {
        const input = document.getElementById(id);
        if (!input) return null;
        const raw = input.value.trim();
        if (raw === '') return null;
        const value = parseFloat(raw.replace(',', '.'));
        return Number.isFinite(value) ? value : null;
    }

    function getInputValues() {
        const values = {
            sex: document.getElementById('imm-sex').value,
            age: parseValue('imm-age'),
            note: document.getElementById('imm-note').value
        };
        Object.keys(defaultRanges).forEach((key) => {
            values[key] = parseValue(`imm-input-${key.replace(/\s+/g, '_')}`);
        });
        return values;
    }

    function isQualitative(range) {
        return typeof range.unit === 'string' && range.unit.includes('Negative/Positive');
    }

    function compareValue(key, value, range) {
        if (!range) return { state: 'missing', label: 'Không có tham chiếu' };
        if (value == null) return { state: 'missing', label: 'Chưa nhập' };

        if (isQualitative(range)) {
            const code = Number(value);
            if (code === 0) return { state: 'normal', label: 'Negative' };
            if (code === 1) return { state: 'positive', label: 'Positive' };
            return { state: 'invalid', label: 'Giá trị sai (0/1)' };
        }

        if (value < range.min) return { state: 'low', label: 'Thấp' };
        if (value > range.max) return { state: 'high', label: 'Cao' };
        return { state: 'normal', label: 'Bình thường' };
    }

    function percentDiff(value, range) {
        if (value == null || !range || isQualitative(range)) return null;
        const mid = (range.min + range.max) / 2;
        if (mid === 0) return 0;
        return ((value - mid) / mid) * 100;
    }

    function getSeverity(value, key) {
        const range = getRangeForKey(key);
        if (!range || value == null || isQualitative(range)) return 'normal';

        const diff = Math.abs(percentDiff(value, range)) || 0;
        if (diff < 10) return 'normal';
        if (diff < 30) return 'mild';
        if (diff < 50) return 'moderate';
        return 'severe';
    }

    function buildConclusions(values) {
        const ranges = getSavedRanges();
        const results = {
            normal: [],
            low: [],
            high: [],
            positive: [],
            invalid: [],
            missing: [],
            summary: '',
            groupSummaries: {},
            recommendations: [],
            extraComments: []
        };

        Object.keys(defaultRanges).forEach((key) => {
            const value = values[key];
            const range = ranges[key];
            const status = compareValue(key, value, range);

            if (status.state === 'missing' && value != null) {
                results.missing.push(key);
            } else if (status.state === 'normal') {
                results.normal.push(key);
            } else if (status.state === 'low') {
                results.low.push(key);
            } else if (status.state === 'high') {
                results.high.push(key);
            } else if (status.state === 'positive') {
                results.positive.push(key);
            } else if (status.state === 'invalid') {
                results.invalid.push(key);
            }
        });

        Object.keys(groups).forEach((group) => {
            const keys = groups[group];
            const groupResults = { normal: 0, abnormal: 0, keys: [] };
            keys.forEach((key) => {
                const value = values[key];
                const range = ranges[key];
                const status = compareValue(key, value, range);
                if (status.state === 'normal' || (value == null && status.state === 'missing')) {
                    groupResults.normal++;
                } else {
                    groupResults.abnormal++;
                    groupResults.keys.push(`${key}: ${status.label}`);
                }
            });
            results.groupSummaries[group] = groupResults;
        });

        const hasPositives = results.positive.length > 0;
        const hasLowIg = results.low.includes('IgG') || results.low.includes('IgM') || results.low.includes('IgA');
        const hasHighIg = results.high.includes('IgG') || results.high.includes('IgM') || results.high.includes('IgA');
        const c3Low = results.low.includes('C3');
        const c4Low = results.low.includes('C4');
        const rfPos = results.positive.includes('RF (Rheumatoid Factor)');
        const anaPos = results.positive.includes('ANA (Anti-Nuclear Antibody)');
        const crpHigh = results.high.includes('CRP');
        const igEHigh = results.high.includes('IgE');
        const hivPos = results.positive.includes('Anti-HIV');
        const hbsPos = results.positive.includes('HBsAg');
        const hcvPos = results.positive.includes('Anti-HCV');
        const hbcPos = results.positive.includes('Anti-HBc (HBcore)');
        const tsh = values.TSH;
        const t3 = values.T3;
        const t4 = values.T4;

        if (igEHigh) {
            results.extraComments.push('IgE cao gợi ý dị ứng, phản ứng type I hoặc nhiễm ký sinh trùng.');
            results.recommendations.push('Xét nghiệm dị nguyên, tổng phân tích máu, và đánh giá lâm sàng dị ứng.');
        }

        if (hasLowIg) {
            if (results.low.includes('IgA') && !results.low.includes('IgG') && !results.low.includes('IgM')) {
                results.extraComments.push('Giảm IgA đơn độc: cân nhắc thiếu hụt IgA chọn lọc.');
                results.recommendations.push('Theo dõi nguy cơ dị ứng, nhiễm khuẩn niêm mạc và đánh giá miễn dịch đầy đủ.');
            } else {
                results.extraComments.push('Giảm globulin miễn dịch: gợi ý thiếu hụt miễn dịch nguyên phát hoặc thứ phát.');
                results.recommendations.push('Xét nghiệm bổ sung miễn dịch, đánh giá bệnh lý nhiễm trùng tái phát và đánh giá tủy.');
            }
        }

        if (hasHighIg) {
            results.extraComments.push('Tăng globulin miễn dịch: gợi ý viêm mạn, nhiễm trùng mạn hoặc bệnh tự miễn.');
            results.recommendations.push('Đánh giá thêm CRP, ESR, và kiểm tra tự miễn; nếu cần, xét nghiệm protein huyết thanh.');
        }

        if (c3Low || c4Low) {
            results.extraComments.push('C3/C4 thấp: gợi ý tiêu thụ bổ thể trong lupus, viêm mạch hoặc hội chứng miễn dịch.');
            if (c3Low && c4Low) {
                results.extraComments.push('Giảm đồng thời C3 và C4 thường gặp trong lupus ban đỏ hệ thống.');
            }
            results.recommendations.push('Khuyến cáo xét nghiệm ANA, anti-dsDNA, và đánh giá lâm sàng bệnh mô liên kết.');
        }

        if (rfPos || anaPos) {
            if (rfPos && anaPos) {
                results.extraComments.push('RF và ANA dương tính: gợi ý bệnh tự miễn như viêm khớp dạng thấp hoặc lupus.');
            } else if (rfPos) {
                results.extraComments.push('RF dương tính: gợi ý viêm khớp dạng thấp hoặc bệnh tự miễn.');
            } else {
                results.extraComments.push('ANA dương tính: gợi ý bệnh mô liên kết, lupus, hoặc Sjögren.');
            }
            results.recommendations.push('Tiếp tục xét nghiệm tự miễn chuyên sâu và đánh giá lâm sàng bởi bác sĩ chuyên khoa.');
        }

        if (crpHigh) {
            results.extraComments.push('CRP cao cho thấy tình trạng viêm cấp hoặc nhiễm trùng.');
            results.recommendations.push('Kết hợp với cấy máu, xét nghiệm viêm nhiễm và đánh giá lâm sàng.');
        }

        if (hivPos || hbsPos || hcvPos || hbcPos) {
            if (hivPos) results.extraComments.push('Anti-HIV dương tính: cần xác nhận bằng xét nghiệm huyết thanh học/hóa sinh chuyên sâu.');
            if (hbsPos) results.extraComments.push('HBsAg dương tính: gợi ý nhiễm viêm gan B.');
            if (hcvPos) results.extraComments.push('Anti-HCV dương tính: gợi ý nhiễm viêm gan C.');
            if (hbcPos) results.extraComments.push('Anti-HBc dương tính: gợi ý tiếp xúc hoặc nhiễm HBV.');
            results.recommendations.push('Xác nhận bằng xét nghiệm huyết thanh học chuyên sâu, tải lượng virus nếu cần.');
        }

        if (typeof tsh === 'number') {
            if (tsh > defaultRanges.TSH.max) {
                if (t3 != null && t4 != null && t3 < defaultRanges.T3.min && t4 < defaultRanges.T4.min) {
                    results.extraComments.push('Mẫu phù hợp suy giáp rõ rệt.');
                    results.recommendations.push('Xác định chức năng tuyến giáp và hormone tuyến giáp tự do, cân nhắc điều trị.');
                } else {
                    results.extraComments.push('TSH tăng nhưng T3/T4 chưa rõ ràng: gợi ý suy giáp cận lâm sàng.');
                    results.recommendations.push('Theo dõi TSH và xét nghiệm T3/T4 tự do sau 6-8 tuần.');
                }
            } else if (tsh < defaultRanges.TSH.min) {
                if (t3 != null && t4 != null && t3 > defaultRanges.T3.max && t4 > defaultRanges.T4.max) {
                    results.extraComments.push('Mẫu phù hợp cường giáp rõ rệt.');
                    results.recommendations.push('Xác định thêm hormone tuyến giáp tự do và đánh giá lâm sàng.');
                } else {
                    results.extraComments.push('TSH giảm nhưng T3/T4 chưa rõ ràng: gợi ý cường giáp cận lâm sàng.');
                    results.recommendations.push('Theo dõi và đánh giá lại sau khi xác nhận các hormone tự do.');
                }
            }
        }

        const abnormalCount = results.low.length + results.high.length + results.positive.length + results.invalid.length;
        if (abnormalCount === 0) {
            results.summary = '✓ Không phát hiện bất thường rõ ràng. Cần kết hợp lâm sàng.';
        } else {
            const mainIssues = [];
            if (results.positive.length > 0) mainIssues.push(`${results.positive.length} marker dương tính`);
            if (results.high.length > 0) mainIssues.push(`${results.high.length} chỉ số cao`);
            if (results.low.length > 0) mainIssues.push(`${results.low.length} chỉ số thấp`);
            if (results.invalid.length > 0) mainIssues.push(`${results.invalid.length} giá trị chưa hợp lệ`);
            results.summary = `⚠ Phát hiện ${mainIssues.join(', ')}. Xem chi tiết nhận định và khuyến cáo.`;
        }

        results.extraComments = results.extraComments.join(' ');
        results.recommendations = [...new Set(results.recommendations)];
        return results;
    }

    function displayResults(results) {
        const resultsDiv = document.getElementById('immunology-results');
        const summaryDiv = document.getElementById('immunology-final-summary');
        const groupDiv = document.getElementById('immunology-group-summaries');
        const recDiv = document.getElementById('immunology-recommendations');
        const commentsDiv = document.getElementById('immunology-extra-comments');

        if (!resultsDiv || !summaryDiv) return;

        summaryDiv.textContent = results.summary;
        groupDiv.innerHTML = '';
        Object.keys(results.groupSummaries).forEach((group) => {
            const g = results.groupSummaries[group];
            const html = `<div><strong>${group}:</strong> ${g.normal} bình thường, ${g.abnormal} bất thường${g.keys.length > 0 ? ' (' + g.keys.join(', ') + ')' : ''}</div>`;
            groupDiv.innerHTML += html;
        });

        recDiv.innerHTML = '';
        if (results.recommendations.length > 0) {
            results.recommendations.forEach((rec) => {
                const li = document.createElement('li');
                li.textContent = rec;
                recDiv.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = 'Không có khuyến cáo thêm dựa trên kết quả.';
            recDiv.appendChild(li);
        }

        commentsDiv.textContent = 'Ghi chú: Tất cả kết quả cần được bác sĩ chuyên khoa xác nhận và kết hợp với lâm sàng bệnh nhân.';

        resultsDiv.style.display = 'block';
    }

    function analyzeResults() {
        const values = getInputValues();
        const ranges = getSavedRanges();
        let hasData = false;

        Object.keys(defaultRanges).forEach((key) => {
            const safeKey = key.replace(/\s+/g, '_');
            const value = values[key];
            const range = ranges[key];
            const statusEl = document.getElementById(`imm-status-${safeKey}`);

            if (statusEl) {
                const status = compareValue(key, value, range);
                const severity = getSeverity(value, key);
                let diffText = '';
                if (value != null && range) {
                    if (!isQualitative(range)) {
                        const diff = percentDiff(value, range);
                        diffText = diff == null ? ` (${value} ${range.unit})` : ` (${value} ${range.unit}, ${diff.toFixed(1)}%)`;
                    } else {
                        diffText = ` (${value} ${range.unit})`;
                    }
                }
                statusEl.innerHTML = `<span class="status-${status.state}">${status.label}${diffText}</span>`;
                
                if (value != null) hasData = true;
            }
        });

        if (!hasData) {
            NotificationModule.success('Vui lòng nhập ít nhất một chỉ số.');
            return;
        }

        const results = buildConclusions(values);
        displayResults(results);
        NotificationModule.success('Đã phân tích.');
    }

    function saveCurrentRecord() {
        const values = getInputValues();
        let hasData = false;

        Object.keys(defaultRanges).forEach((key) => {
            if (values[key] != null) hasData = true;
        });

        if (!hasData) {
            NotificationModule.success('Vui lòng nhập ít nhất một chỉ số để lưu.');
            return;
        }

        const records = JSON.parse(localStorage.getItem('immunologyRecords') || '[]');
        records.push({
            timestamp: new Date().toISOString(),
            ...values
        });
        localStorage.setItem('immunologyRecords', JSON.stringify(records));
        loadSavedRecords();
        NotificationModule.success('Đã lưu hồ sơ miễn dịch.');
    }

    function loadSavedRecords() {
        const records = JSON.parse(localStorage.getItem('immunologyRecords') || '[]');
        const container = document.getElementById('immunology-saved-records');
        if (!container) return;

        container.innerHTML = '';
        records.forEach((record, idx) => {
            const date = new Date(record.timestamp).toLocaleString('vi-VN');
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>Hồ sơ ${records.length - idx}:</strong> ${date}
                <br/> Tuổi: ${record.age || '-'}, Giới tính: ${record.sex || '-'}, Ghi chú: ${record.note || '-'}
                <br/> <button class="btn-custom btn-danger-custom btn-sm" onclick="ImmunologyModule.deleteRecord(${idx})">Xóa</button>
            `;
            container.appendChild(li);
        });
    }

    function deleteRecord(idx) {
        if (!confirm('Xác nhận xóa hồ sơ này?')) return;
        const records = JSON.parse(localStorage.getItem('immunologyRecords') || '[]');
        records.splice(idx, 1);
        localStorage.setItem('immunologyRecords', JSON.stringify(records));
        loadSavedRecords();
        NotificationModule.success('Đã xóa hồ sơ.');
    }

    function clearSavedRecords() {
        if (!confirm('Xác nhận xóa toàn bộ kho dữ liệu miễn dịch?')) return;
        localStorage.removeItem('immunologyRecords');
        loadSavedRecords();
        NotificationModule.success('Đã xóa kho dữ liệu.');
    }

    function createReferenceSettingsRows() {
        const ranges = getSavedRanges();
        const tbody = document.getElementById('immunology-range-settings-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        Object.keys(defaultRanges).forEach((key) => {
            const range = ranges[key] || defaultRanges[key];
            const safeKey = key.replace(/\s+/g, '_');
            tbody.innerHTML += `
                <tr>
                    <td>${key}</td>
                    <td><input type="number" step="any" id="imm-ref-min-${safeKey}" value="${range.min}" /></td>
                    <td><input type="number" step="any" id="imm-ref-max-${safeKey}" value="${range.max}" /></td>
                    <td><input type="text" id="imm-ref-unit-${safeKey}" value="${range.unit}" /></td>
                </tr>
            `;
        });
    }

    async function saveReferenceSettings() {
        const ranges = {};
        Object.keys(defaultRanges).forEach((key) => {
            const safeKey = key.replace(/\s+/g, '_');
            const minEl = document.getElementById(`imm-ref-min-${safeKey}`);
            const maxEl = document.getElementById(`imm-ref-max-${safeKey}`);
            const unitEl = document.getElementById(`imm-ref-unit-${safeKey}`);
            const min = minEl ? parseFloat(minEl.value) : null;
            const max = maxEl ? parseFloat(maxEl.value) : null;
            const unit = unitEl ? unitEl.value.trim() : defaultRanges[key].unit;
            ranges[key] = {
                min: Number.isFinite(min) ? min : defaultRanges[key].min,
                max: Number.isFinite(max) ? max : defaultRanges[key].max,
                unit: unit || defaultRanges[key].unit
            };
        });
        if (window.ConfigModule) {
            ConfigModule.setImmunologyRanges(ranges);
        } else {
            localStorage.setItem('immunologyRanges', JSON.stringify(ranges));
        }
        if (window.StorageModule) {
            await StorageModule.save();
        }
        createParameterRows();
        createReferenceSettingsRows();
        NotificationModule.success('Đã lưu tham chiếu miễn dịch.');
    }

    async function resetReferenceSettings() {
        localStorage.removeItem('immunologyRanges');
        if (window.ConfigModule) {
            ConfigModule.immunologyRanges = null;
        }
        if (window.StorageModule) {
            await StorageModule.save();
        }
        createParameterRows();
        createReferenceSettingsRows();
        NotificationModule.success('Đã tải lại tham chiếu miễn dịch mặc định.');
    }

    function loadReferenceSettingsEditor() {
        createReferenceSettingsRows();
    }

    function clearForm() {
        document.getElementById('imm-sex').value = '';
        document.getElementById('imm-age').value = '';
        document.getElementById('imm-note').value = '';
        Object.keys(defaultRanges).forEach((key) => {
            const safeKey = key.replace(/\s+/g, '_');
            const input = document.getElementById(`imm-input-${safeKey}`);
            if (input) input.value = '';
            const status = document.getElementById(`imm-status-${safeKey}`);
            if (status) status.innerHTML = '<span class="status-missing">Chưa nhập</span>';
        });
        document.getElementById('immunology-results').style.display = 'none';
    }

    function exportRecords() {
        const savedRecords = localStorage.getItem('immunologyRecords');
        if (!savedRecords) {
            alert('Kho dữ liệu miễn dịch trống.');
            return;
        }
        const blob = new Blob([savedRecords], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'immunology-records.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function init() {
        createParameterRows();
        loadSavedRecords();
        loadReferenceSettingsEditor();
    }

    window.addEventListener('load', init);

    return {
        analyzeResults,
        saveCurrentRecord,
        deleteRecord,
        clearSavedRecords,
        loadSavedRecords,
        clearForm,
        exportRecords,
        createParameterRows,
        loadReferenceSettingsEditor,
        saveReferenceSettings,
        resetReferenceSettings,
        getSavedRanges
    };
})();

const UrinalysisModule = (() => {
    const defaultRanges = {
        'Specific Gravity': { min: 1.005, max: 1.030, unit: '' },
        'pH': { min: 4.5, max: 8.0, unit: '' },
        'Protein': { min: 0, max: 15, unit: 'mg/dL' },
        'Glucose': { min: 0, max: 15, unit: 'mg/dL' },
        'Ketones': { min: 0, max: 5, unit: 'mg/dL' },
        'Blood': { min: 0, max: 0, unit: 'RBC/hpf' },
        'Nitrite': { min: 0, max: 0, unit: 'Negative/Positive' },
        'Leukocyte Esterase': { min: 0, max: 0, unit: 'Negative/Positive' },
        'Urobilinogen': { min: 0.2, max: 1.0, unit: 'mg/dL' },
        'Bilirubin': { min: 0, max: 0.2, unit: 'mg/dL' }
    };

    function getSavedRanges() {
        if (window.ConfigModule && ConfigModule.urinalysisRanges) {
            return ConfigModule.urinalysisRanges;
        }
        const stored = JSON.parse(localStorage.getItem('urinalysisRanges') || 'null');
        return stored && typeof stored === 'object' ? stored : defaultRanges;
    }

    function getRangeForKey(key) {
        const ranges = getSavedRanges();
        return ranges[key] || defaultRanges[key] || null;
    }

    function createParameterRows() {
        const tbody = document.getElementById('urinalysis-parameter-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        const displayRanges = getSavedRanges();
        Object.keys(displayRanges).forEach((key) => {
            const range = displayRanges[key];
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${key}</td>
                <td><input type="number" step="any" id="urine-input-${safeKey}" placeholder="Nhập giá trị" /></td>
                <td>${range.min} - ${range.max} ${range.unit}</td>
                <td id="urine-status-${safeKey}" class="status-missing">Chưa nhập</td>
            `;
            tbody.appendChild(row);
        });
    }

    function parseValue(id) {
        const input = document.getElementById(id);
        if (!input) return null;
        const raw = input.value.trim();
        if (raw === '') return null;
        const value = parseFloat(raw.replace(',', '.'));
        return Number.isFinite(value) ? value : null;
    }

    function getInputValues() {
        const values = {
            sex: document.getElementById('urine-sex') ? document.getElementById('urine-sex').value : '',
            age: parseValue('urine-age'),
            note: document.getElementById('urine-note') ? document.getElementById('urine-note').value : ''
        };
        Object.keys(getSavedRanges()).forEach((key) => {
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            values[key] = parseValue(`urine-input-${safeKey}`);
        });
        return values;
    }

    function compareValue(key, value) {
        const range = getRangeForKey(key);
        if (!range) return { state: 'missing', label: 'Không có tham chiếu' };
        if (value == null) return { state: 'missing', label: 'Chưa nhập' };
        if (range.min === range.max) {
            return value === range.min ? { state: 'normal', label: 'Bình thường' } : { state: 'high', label: 'Bất thường' };
        }
        if (value < range.min) return { state: 'low', label: 'Thấp' };
        if (value > range.max) return { state: 'high', label: 'Cao' };
        return { state: 'normal', label: 'Bình thường' };
    }

    function formatStatus(result, value, key) {
        const range = getRangeForKey(key);
        const valueText = value == null ? '' : ` (${value} ${range ? range.unit : ''})`;
        return `<span class="status-${result.state}">${result.label}${valueText}</span>`;
    }

    function updateStatusCells(values) {
        Object.keys(getSavedRanges()).forEach((key) => {
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            const statusCell = document.getElementById(`urine-status-${safeKey}`);
            if (!statusCell) return;
            const result = compareValue(key, values[key]);
            statusCell.innerHTML = formatStatus(result, values[key], key);
        });
    }

    function buildConclusions(values) {
        const notes = [];
        const recommendations = [];

        const isHigh = (key) => {
            const value = values[key];
            const range = getRangeForKey(key);
            return value != null && range && value > range.max;
        };
        const isLow = (key) => {
            const value = values[key];
            const range = getRangeForKey(key);
            return value != null && range && value < range.min;
        };

        if (isHigh('Specific Gravity')) notes.push('Tỷ trọng cao: có thể do mất nước hoặc nước tiểu cô đặc.');
        else if (isLow('Specific Gravity')) notes.push('Tỷ trọng thấp: gợi ý tiểu loãng hoặc suy thận.');

        if (isHigh('pH')) notes.push('pH kiềm: gợi ý nhiễm trùng tiết niệu do vi khuẩn phân hủy ure.');
        else if (isLow('pH')) notes.push('pH axit: gợi ý toan chuyển hóa hoặc chế độ ăn nhiều protein.');

        if (isHigh('Protein')) {
            notes.push('Protein niệu: gợi ý tổn thương cầu thận hoặc viêm tiết niệu.');
            recommendations.push('Đánh giá albumin/creatinine nước tiểu và chức năng thận.');
        }
        if (isHigh('Glucose')) {
            notes.push('Glucose niệu: gợi ý tăng đường huyết hoặc đái tháo đường.');
            recommendations.push('Kiểm tra glucose huyết tương và HbA1c.');
        }
        if (isHigh('Ketones')) {
            notes.push('Ketone dương tính: có thể do đái tháo đường, nhịn đói hoặc nhiễm toan.');
        }
        if (isHigh('Blood')) {
            notes.push('Máu trong nước tiểu: cân nhắc nhiễm trùng, sỏi thận, chấn thương hoặc ung thư tiết niệu.');
            recommendations.push('Xét nghiệm kính hiển vi nước tiểu và siêu âm hệ tiết niệu.');
        }
        if (isHigh('Nitrite')) notes.push('Nitrit dương tính: gợi ý nhiễm khuẩn tiết niệu.');
        if (isHigh('Leukocyte Esterase')) notes.push('Leukocyte esterase dương tính: gợi ý viêm tiết niệu.');
        if (isHigh('Urobilinogen')) notes.push('Urobilinogen cao: có thể liên quan đến bệnh lý gan hoặc tan huyết.');
        if (isHigh('Bilirubin')) notes.push('Bilirubin niệu: gợi ý bệnh lý gan hoặc tắc mật.');

        if (!notes.length) notes.push('Tất cả các thông số nằm trong giới hạn tham chiếu.');
        if (!recommendations.length) recommendations.push('Không phát hiện bất thường lớn. Theo dõi lâm sàng và xét nghiệm bổ sung khi cần.');

        return {
            summary: `Bệnh nhân ${values.sex || 'chưa chọn giới tính'}, tuổi ${values.age != null ? values.age : 'chưa nhập'}. ${values.note ? values.note : ''}`,
            groupSummaries: notes,
            recommendations,
            extra: notes.join(' ')
        };
    }

    function createReferenceSettingsRows() {
        const ranges = getSavedRanges();
        const tbody = document.getElementById('urinalysis-range-settings-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        Object.keys(defaultRanges).forEach((key) => {
            const range = ranges[key] || defaultRanges[key];
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            tbody.innerHTML += `
                <tr>
                    <td>${key}</td>
                    <td><input type="number" step="any" id="urine-ref-min-${safeKey}" value="${range.min}" /></td>
                    <td><input type="number" step="any" id="urine-ref-max-${safeKey}" value="${range.max}" /></td>
                    <td><input type="text" id="urine-ref-unit-${safeKey}" value="${range.unit}" /></td>
                </tr>
            `;
        });
    }

    async function saveReferenceSettings() {
        const ranges = {};
        Object.keys(defaultRanges).forEach((key) => {
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            const minEl = document.getElementById(`urine-ref-min-${safeKey}`);
            const maxEl = document.getElementById(`urine-ref-max-${safeKey}`);
            const unitEl = document.getElementById(`urine-ref-unit-${safeKey}`);
            const min = minEl ? parseFloat(minEl.value) : null;
            const max = maxEl ? parseFloat(maxEl.value) : null;
            const unit = unitEl ? unitEl.value.trim() : defaultRanges[key].unit;
            ranges[key] = {
                min: Number.isFinite(min) ? min : defaultRanges[key].min,
                max: Number.isFinite(max) ? max : defaultRanges[key].max,
                unit: unit || defaultRanges[key].unit
            };
        });
        if (window.ConfigModule) {
            ConfigModule.setUrinalysisRanges(ranges);
        } else {
            localStorage.setItem('urinalysisRanges', JSON.stringify(ranges));
        }
        if (window.StorageModule) {
            await StorageModule.save();
        }
        createParameterRows();
        createReferenceSettingsRows();
        NotificationModule.success('Đã lưu tham chiếu nước tiểu.');
    }

    async function resetReferenceSettings() {
        localStorage.removeItem('urinalysisRanges');
        if (window.ConfigModule) {
            ConfigModule.urinalysisRanges = null;
        }
        if (window.StorageModule) {
            await StorageModule.save();
        }
        createParameterRows();
        createReferenceSettingsRows();
        NotificationModule.success('Đã tải lại tham chiếu nước tiểu mặc định.');
    }

    function loadReferenceSettingsEditor() {
        createReferenceSettingsRows();
    }

    function analyzeResults() {
        const values = getInputValues();
        updateStatusCells(values);
        const analysis = buildConclusions(values);
        document.getElementById('urine-final-summary').innerText = analysis.summary;
        const groupDiv = document.getElementById('urine-group-summaries');
        groupDiv.innerHTML = analysis.groupSummaries.map(item => `<div>${item}</div>`).join('');
        document.getElementById('urine-recommendations').innerHTML = analysis.recommendations.map(r => `<li>${r}</li>`).join('');
        document.getElementById('urine-extra-comments').innerText = analysis.extra;
        document.getElementById('urine-results').style.display = 'block';
    }

    function clearForm() {
        document.getElementById('urine-sex').value = '';
        document.getElementById('urine-age').value = '';
        document.getElementById('urine-note').value = '';
        Object.keys(getSavedRanges()).forEach((key) => {
            const safeKey = key.replace(/[^a-zA-Z0-9]+/g, '_');
            const input = document.getElementById(`urine-input-${safeKey}`);
            if (input) input.value = '';
            const status = document.getElementById(`urine-status-${safeKey}`);
            if (status) status.innerHTML = '<span class="status-missing">Chưa nhập</span>';
        });
        document.getElementById('urine-results').style.display = 'none';
    }

    function init() {
        createParameterRows();
        loadReferenceSettingsEditor();
    }

    window.addEventListener('load', init);

    return {
        analyzeResults,
        clearForm,
        createParameterRows,
        createReferenceSettingsRows,
        loadReferenceSettingsEditor,
        saveReferenceSettings,
        resetReferenceSettings,
        getSavedRanges
    };
})();
