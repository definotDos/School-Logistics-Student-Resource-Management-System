const paths = {
  profile: <><circle cx="12" cy="7" r="3.5" /><path d="M4.5 20c.6-3.2 3.4-5.4 7.5-5.4s6.9 2.2 7.5 5.4H4.5Z" /></>,
  users: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.4-3.5 2.7-5.5 7-5.5s6.6 2 7 5.5" /><circle cx="5.5" cy="9" r="2.2" /><path d="M1.8 19.5c.3-2.5 1.8-4 4.4-4" /><circle cx="18.5" cy="9" r="2.2" /><path d="M22.2 19.5c-.3-2.5-1.8-4-4.4-4" /></>,
  home: <path d="m3 10.5 9-7 9 7v9.2a1.3 1.3 0 0 1-1.3 1.3h-5.1v-6h-5.2v6H4.3A1.3 1.3 0 0 1 3 19.7v-9.2Z" />,
  notification: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /><path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" /></>,
  requests: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  resources: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></>,
  catalog: <><path d="M8 3h11a2 2 0 0 1 2 2v14" /><path d="M5 6h12a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /><path d="M7 10h2M12 10h4M7 14h2M12 14h4M7 18h2M12 18h4" /></>,
  history: <><path d="M12 5a7 7 0 1 1-6.2 3.8" /><path d="M4 5v4h4M12 8v4l3 2" /></>,
  performance: <><circle cx="9" cy="7" r="3.5" /><path d="M3.5 19.5c.5-3.7 2.5-5.7 5.5-5.7s5 2 5.5 5.7" /><circle cx="17" cy="7" r="4.8" /><path d="M17 4.8v2.5l1.7 1M14 14l3-3 2 2 3-3M19 10h3v3" /></>,
  school: <><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M7 20v-6h3v6M14 20v-6h3v6M3 10h18M12 4v-2M12 2l3 1.5v2" /></>,
};

function DashboardIcon({ name, className = "" }) {
  return <svg className={`dashboard-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name] || paths.home}</svg>;
}

export default DashboardIcon;
