import re

with open('src/App.jsx', 'r') as f:
    text = f.read()

# Add systemInfo state and polling
state_old = """function AppContent({ fileKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(null);"""

state_new = """function AppContent({ fileKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [sysInfo, setSysInfo] = useState({ username: '...', lastSync: 0, lastArchive: 0 });

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const res = await apiFetch('/api/system-info');
        const data = await res.json();
        if (data && !data.error) setSysInfo(data);
      } catch (e) {}
    };
    fetchSysInfo();
    const interval = setInterval(fetchSysInfo, 3000);
    return () => clearInterval(interval);
  }, [fileKey]);"""

text = text.replace(state_old, state_new)

# Add UI to the header
header_old = """                <option value="csv">📑 Export to CSV</option>
                <option value="print">🖨️ Export to PDF (Print)</option>
              </select>
            </div>
          </div>

          {/* Navigation Items */}"""

header_new = """                <option value="csv">📑 Export to CSV</option>
                <option value="print">🖨️ Export to PDF (Print)</option>
              </select>
            </div>
            
            {/* System Info */}
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--primary-hover)' }}>👤 {sysInfo.username}</span>
                <span title="Last Sync (Automerge)">
                  🔄 {sysInfo.lastSync ? new Date(sysInfo.lastSync).toLocaleTimeString() : 'Never'}
                </span>
                <span title="Last Archive">
                  📦 {sysInfo.lastArchive ? new Date(sysInfo.lastArchive).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}"""

text = text.replace(header_old, header_new)

with open('src/App.jsx', 'w') as f:
    f.write(text)
