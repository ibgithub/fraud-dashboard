// English resource file
const en = {
  lang: 'en',
  langLabel: 'English',

  // App
  appName: 'Fraud Detection',
  appTagline: 'Banking Risk & Fraud Detection System',
  logout: 'Logout',
  language: 'Language',

  // Fraud Detection
  menu_home: 'Home',

  // ---- Legacy CPI menu labels (menus removed in auth V35; pages still routable)
  // 1. Corporate Insight
  menu_ci: 'Corporate Insight',
  menu_ci_01: 'Executive Overview',

  // 2. Churn Analysis
  menu_ch: 'Churn Analysis',
  menu_ch_01: 'Churn Overview',
  menu_ch_02: 'Churn Ranking',
  menu_ch_03: 'Model Performance — Churn',

  // 2b. TRB Analysis
  menu_aum: 'TRB Analysis',
  menu_aum_01: 'TRB Overview',
  menu_aum_02: 'TRB Ranking',

  // 3. Customer Profitability
  menu_cp: 'Profitability Analysis',
  menu_cp_01: 'Profitability Overview',
  menu_cp_02: 'Customer Profitability List',
  menu_cp_03: 'Model Performance — Profitability',

  // 4. Customer Segmentation
  menu_cs: 'Segmentation Analysis',
  menu_cs_01: 'Segmentation Overview',
  menu_cs_02: 'Segment Characteristics & Strategy',
  menu_cs_03: 'Product Usage Analysis',
  menu_cs_04: 'Model Performance — Segmentation',

  // 5. CPI Matrix
  menu_cpi: 'Customer Matrix',
  menu_cpi_01: 'Select Customer Matrix',
  menu_cpi_02: 'HOT TARGET Deep-Dive',
  menu_cpi_05: 'Action Plan Detail',

  // 6. Recommender System
  menu_rs: 'Recommender System',
  menu_rs_01: 'Product Recommendations',
  menu_rs_02: 'Model Performance — Recommender',

  // 7. Campaign & Strategy Tracking
  menu_cam: 'Campaign & Strategy',
  menu_cam_00: 'Action Per Customer',
  menu_cam_history: 'Business Strategy Monitoring',
  menu_cam_01: 'Business Strategy Registry',
  menu_cam_02: 'Strategy Assignment & Progress',
  menu_cam_03: 'Campaign Effectiveness & ROI',

  // 8. Customer 360
  menu_c360: 'Customer 360',
  menu_c360_01: 'Customer Search & Profile',

  // 9. Alert / Notification Center
  menu_not: 'Alert Center',
  menu_not_01: 'Alert Center',

  // Machine Learning / Model Performance
  menu_ml: 'Model Performance',
  menu_ml_01: 'Churn',
  menu_ml_02: 'Segmentation',
  menu_ml_03: 'Recommender System',

  // Access Management (access & system management)
  menu_adm: 'Access Management',
  menu_adm_05: 'Audit Log',

  // 10. Setup
  menu_set: 'Setup',
  menu_set_01: 'Threshold Tiering',
  menu_set_03: 'Recommendation Settings',
  menu_set_04: 'User Management',
  menu_set_08: 'Role Management',
  menu_set_09: 'Menu Management',
  menu_set_10: 'Setting Parameter Management',
  menu_set_05: 'Observation & Cost Settings',
  menu_set_06: 'Notification Rules',
  menu_set_07: 'Manage Persona Labels',

  // 11. System
  menu_sys: 'Profile & Account',
  menu_sys_01: 'User Profile',
  menu_sys_03: 'Change Password',
  menu_sys_02: 'Help & Glossary',

  // Role Management
  role_title: 'Role Management',
  role_subtitle: 'List of roles available in the system',
  role_name: 'Role Name',
  role_description: 'Description',
  role_actions: 'Actions',
  role_add: 'Add Role',
  role_detail: 'Role Detail',
  role_edit: 'Edit Role',
  role_delete_confirm: 'Are you sure you want to delete this role?',
  role_loading: 'Loading roles...',
  role_access_denied: 'Access denied. You do not have permission to view roles.',
  role_session_expired: 'Session expired. Please login again.',
  role_save: 'Save',
  role_cancel: 'Cancel',
  role_close: 'Close',
  role_delete: 'Delete',
  role_confirm_delete: 'Confirm Delete',
  role_search: 'Search roles...',
  role_page_info: 'Page {page} of {total}',
  role_prev: 'Previous',
  role_next: 'Next',

  // User Management
  user_title: 'User Management',
  user_subtitle: 'List of users registered in the system',
  user_username: 'Username',
  user_fullname: 'Full Name',
  user_email: 'Email',
  user_phone: 'Phone Number',
  user_firstname: 'First Name',
  user_lastname: 'Last Name',
  user_password: 'Password',
  user_actions: 'Actions',
  user_add: 'Add User',
  user_detail: 'User Detail',
  user_edit: 'Edit User',
  user_delete_confirm: 'Are you sure you want to delete this user?',
  user_loading: 'Loading users...',
  user_search: 'Search users...',
  user_save: 'Save',
  user_cancel: 'Cancel',
  user_close: 'Close',

  // Login
  login_title: 'Login',
  login_subtitle: 'Sign in to Fraud Detection System',
  login_username: 'Username',
  login_password: 'Password',
  login_button: 'Login',
  login_loading: 'Processing...',
  login_placeholder_username: 'Enter your username',
  login_placeholder_password: 'Enter your password',
  login_portal_badge: 'OFFICER LOGIN PORTAL',
  login_portal_title: 'Login Page',
  login_anti_brute: 'Anti Brute-Force Protection Active',
  login_submit_button: 'Sign In',
  login_verifying: 'Verifying Account...',
  login_help_text: 'Need technical assistance? Contact',

  // Home (landing)
  home_title: 'Welcome to Fraud Detection',
  home_subtitle: 'Transaction monitoring, alert queue, and analyst review for banking fraud detection. The modules below are being built and will appear in the menu one by one.',
  home_modules_title: 'Modules in development',
  home_modules_status: 'Status: In Development',
  home_mod_overview: 'Overview',
  home_mod_overview_desc: 'Alert volume, daily trend, anomaly types, and top cases.',
  home_mod_live: 'Live Monitoring',
  home_mod_live_desc: 'Incoming transactions in real time with their risk score.',
  home_mod_alerts: 'Alert Queue & Detail',
  home_mod_alerts_desc: 'Alert list, reasons per transaction, and analyst decisions.',
  home_mod_daily: 'Daily Review',
  home_mod_daily_desc: 'Daily review versus the 7-day average, and repeat customers.',
  home_mod_data: 'Data Health & Drift',
  home_mod_data_desc: 'Daily data quality and shifts in transaction patterns.',
  home_mod_model: 'Model & Explanations',
  home_mod_model_desc: 'How the model works, its limits, and the reasons behind each alert.',

  // Global footer
  footer_text: 'Banking Fraud Detection & Prevention System',
};

export default en;
