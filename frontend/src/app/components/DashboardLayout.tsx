import { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Users,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  UserCircle,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Lock,
  ShieldCheck,
  Building2,
  FileText,
  Cpu,
  Grid3x3,
  Target,
  Bell,
  Radio,
  Briefcase,
  ListChecks,
  Sunrise,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { FraudLogo } from './FraudLogo';

// Map icon string from API to Lucide component
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  UserCircle,
  BarChart3,
  Settings,
  FileText,
  Cpu,
  Grid3x3,
  Target,
  Bell,
  ShieldCheck,
  Radio,
  Briefcase,
  ListChecks,
  Sunrise,
  ClipboardCheck,
};

function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FileText;
  return iconMap[iconName] || FileText;
}

// Types matching API response
interface ApiMenu {
  id: number;
  code: string;
  parentCode: string | null;
  menuKey: string;
  path: string;
  icon: string | null;
  sortOrder: number;
  children: ApiMenu[] | null;
}

interface DisplayMenu {
  key: string;
  code: string;
  icon: LucideIcon;
  path: string;
  children: { key: string; path: string }[];
}

// Menu paths whose backend APIs are ADMIN-only (see auth-service SecurityConfig:
// /api/roles, /api/menus, /api/settings, /api/audit-logs, user management).
// Non-admin users must not even see these in the sidebar, since the API would
// reject them with 403.
const ADMIN_ONLY_PATHS = [
  '/setup/role-management',
  '/setup/menu-management',
  '/setup/user-role-management',
  '/setup/setting-parameters',
  '/admin/audit-log',
  '/settings/role-management',
  '/settings/menu-management',
  '/settings/system-parameters',
];

function buildMenuFromApi(apiMenus: ApiMenu[], isAdmin: boolean): DisplayMenu[] {
  const isHidden = (code: string, key: string, path: string) => {
    const c = code.toUpperCase();
    // Hide ADMIN-only admin menus from non-admin roles (e.g. "cabang").
    if (!isAdmin && ADMIN_ONLY_PATHS.includes((path || '').toLowerCase())) return true;
    const k = key.toLowerCase();
    // "Profil & Akun" (SYS) group removed from sidebar — moved to the top-right profile dropdown.
    if (c === 'SYS' || c === 'SYS-01' || c === 'SYS-03' || k === 'menu_sys') return true;
    return false;
  };

  return apiMenus
    .filter((menu) => !isHidden(menu.code || '', menu.menuKey || '', menu.path || ''))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((menu) => {
      const children = (menu.children || [])
        .filter((child) => !isHidden(child.code || '', child.menuKey || '', child.path || ''))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((child) => ({
          key: child.menuKey,
          path: child.path,
        }));

      return {
        key: menu.menuKey,
        code: menu.code,
        icon: getIcon(menu.icon),
        path: menu.path,
        children,
      };
    });
}

// Menu Groups definition
interface MenuGroup {
  titleId: string;
  titleEn: string;
  menuCodes: string[];
}

// Sidebar sections. A top-level menu (auth.menu.code) shows only in the group
// that lists its code; unknown codes fall into the "other" block at the end.
// A group with no menus is not rendered; add menu codes as the fraud pages are built.
const MENU_GROUPS: MenuGroup[] = [
  {
    titleId: 'ANALITIK & WAWASAN',
    titleEn: 'ANALYTICS & INSIGHTS',
    menuCodes: ['HOME', 'FG-OV', 'FG-LIVE', 'FG-EXEC'],
  },
  {
    titleId: 'AKSI & RETENSI',
    titleEn: 'ACTION & RETENTION',
    menuCodes: ['FG-ALERT', 'FG-DAILY', 'FG-REVIEW'],
  },
  {
    titleId: 'MACHINE LEARNING',
    titleEn: 'MACHINE LEARNING',
    menuCodes: [],
  },
  {
    titleId: 'ADMINISTRASI',
    titleEn: 'ADMINISTRATION',
    menuCodes: ['ADM', 'SYS'],
  },
];

// Map certain routes to the sidebar item that should appear active for them
// (for detail pages reached from a list that are not menu items themselves).
const ACTIVE_PATH_ALIAS: Record<string, string> = {};
function effectivePath(pathname: string): string {
  return ACTIVE_PATH_ALIAS[pathname] ?? pathname;
}

interface MenuItemProps {
  menu: DisplayMenu;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  expandedKey: string | null;
  toggleAccordion: (k: string) => void;
  location: any;
  t: any;
}

function MenuItem({ menu, isCollapsed, setIsCollapsed, expandedKey, toggleAccordion, location, t }: MenuItemProps) {
  const Icon = menu.icon;
  const hasChildren = menu.children.length > 0;
  const isExpanded = expandedKey === menu.key;
  const curPath = effectivePath(location.pathname);
  const isParentActive = hasChildren && menu.children.some((c) => curPath === c.path);
  const isSingleActive = !hasChildren && (curPath === menu.path || curPath.startsWith(menu.path + '/'));
  const label = t[menu.key] || menu.key;

  return (
    <div>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
              toggleAccordion(menu.key);
            } else {
              toggleAccordion(menu.key);
            }
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-3 px-3 py-2.5 rounded-xl transition text-xs font-semibold ${isParentActive ? 'bg-gradient-to-r from-[#028DAA] via-[#0E7490] to-[#1E4B75] text-white font-bold shadow-md shadow-[#028DAA]/35' : 'text-[#CFE8EE] hover:bg-[#1A4A78] hover:text-white'}`}
          title={isCollapsed ? label : ''}
        >
          <div className="flex items-center gap-3 truncate">
            <Icon className={`w-4 h-4 shrink-0 ${isParentActive ? 'text-white' : 'text-[#22D3EE]'}`} />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </div>
          {!isCollapsed && (isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />)}
        </button>
      ) : (
        <Link
          to={menu.path}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl transition text-xs font-semibold ${isSingleActive ? 'bg-gradient-to-r from-[#028DAA] via-[#0E7490] to-[#1E4B75] text-white font-bold shadow-md shadow-[#028DAA]/35' : 'text-[#CFE8EE] hover:bg-[#1A4A78] hover:text-white'}`}
          title={isCollapsed ? label : ''}
        >
          <Icon className={`w-4 h-4 shrink-0 ${isSingleActive ? 'text-white' : 'text-[#22D3EE]'}`} />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </Link>
      )}
      {hasChildren && !isCollapsed && (
        <div className="ml-5 border-l-2 border-[#1E4F7A] pl-2.5 overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: isExpanded ? '500px' : '0px', opacity: isExpanded ? 1 : 0, marginTop: isExpanded ? '4px' : '0px' }}>
          <div className="space-y-1">
            {menu.children.map((child) => {
              const childLabel = t[child.key] || child.key;
              const isChildActive = effectivePath(location.pathname) === child.path;
              return (
                <Link key={child.key} to={child.path} className={`group w-full flex items-center justify-start gap-2 px-3 py-2 rounded-lg transition text-xs font-medium ${isChildActive ? 'bg-[#028DAA]/25 text-[#22D3EE] font-bold border-l-2 border-[#22D3EE]' : 'text-[#CFE8EE] hover:bg-[#1A4A78] hover:text-white'}`}>
                  {/* Connector tick linking the item to the vertical guide line. */}
                  <span className={`h-px w-2 shrink-0 ${isChildActive ? 'bg-[#22D3EE]' : 'bg-[#1E4F7A] group-hover:bg-[#CFE8EE]'}`} />
                  <span className="truncate">{childLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t, setLang } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; name?: string; firstName?: string; lastName?: string; fullName?: string }>({
    username: 'admin',
    role: 'ADMIN',
  });

  useEffect(() => {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try {
        if (raw.startsWith('{')) {
          setCurrentUser(JSON.parse(raw));
        } else {
          setCurrentUser({ username: raw, role: 'ADMIN' });
        }
      } catch (e) {}
    }
  }, []);

  const isAdmin = (currentUser.role || '').toUpperCase() === 'ADMIN';
  // Bottom line under the username: "firstName lastName" (fall back to
  // fullName, then role) so the header shows the person's name.
  const displayName = (() => {
    const fn = (currentUser.firstName || '').trim();
    const ln = (currentUser.lastName || '').trim();
    const combined = `${fn} ${ln}`.trim();
    if (combined) return combined;
    if ((currentUser.fullName || '').trim()) return currentUser.fullName!.trim();
    return currentUser.role || '';
  })();

  // Load menu from localStorage
  const menuStructure = useMemo<DisplayMenu[]>(() => {
    try {
      const stored = localStorage.getItem('auth_menus');
      if (stored) {
        const apiMenus: ApiMenu[] = JSON.parse(stored);
        if (Array.isArray(apiMenus) && apiMenus.length > 0) {
          return buildMenuFromApi(apiMenus, isAdmin);
        }
      }
    } catch (e) {}

    // No menus from the API (not logged in yet / cache cleared): show only Home.
    return [{ key: 'menu_home', code: 'HOME', icon: LayoutDashboard, path: '/home', children: [] }];
  }, [isAdmin]);

  // Auto-expand active accordion menu matching current route
  useEffect(() => {
    let matchedKey: string | null = null;
    const curPath = effectivePath(location.pathname);
    menuStructure.forEach((parent) => {
      if (parent.children.some((c) => curPath === c.path)) {
        matchedKey = parent.key;
      }
    });
    setExpandedKey(matchedKey);
  }, [location.pathname, menuStructure]);

  function toggleAccordion(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  // Profile dropdown (top-right)
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  function handleLogout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_menus');
    navigate('/login', { replace: true });
  }

  // Filter grouped items
  const matchedCodes = useMemo(() => new Set(MENU_GROUPS.flatMap((g) => g.menuCodes)), []);
  const otherItems = useMemo(
    () => menuStructure.filter((m) => !matchedCodes.has((m.code || '').toUpperCase())),
    [menuStructure, matchedCodes]
  );

  return (
    <div className="flex h-screen bg-[#E7F4F6] font-sans text-[#0F2B48] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#13385E] text-white border-r border-[#1E4F7A] transition-all duration-300 flex flex-col justify-between z-20 shadow-xl overflow-y-auto`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-3.5 border-b border-[#1E4F7A]">
            <div className="flex items-center justify-between">
              {isCollapsed ? (
                <div className="w-full text-center">
                  <FraudLogo variant="icon" size="sm" />
                </div>
              ) : (
                <div className="flex items-center gap-2 truncate">
                  <FraudLogo variant="icon" size="sm" />
                  <div className="truncate">
                    <h1 className="text-xs font-black tracking-tight bg-gradient-to-r from-[#38BDF8] via-[#22D3EE] to-[#A5F3FC] bg-clip-text text-transparent uppercase truncate">
                      Fraud Detection
                    </h1>
                    <p className="text-[9px] uppercase tracking-widest text-[#A5D8EA] font-bold truncate">
                      Banking Risk & Security
                    </p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A4A78] text-[#CFE8EE] hover:text-white transition"
              >
                {isCollapsed ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Grouped into 3 Sections */}
          <nav className="p-3">
            {MENU_GROUPS.map((group, groupIdx) => {
              const groupItems = menuStructure.filter((m) =>
                group.menuCodes.includes((m.code || '').toUpperCase())
              );

              if (groupItems.length === 0) return null;

              return (
                <div key={group.titleId} className={groupIdx > 0 ? 'mt-4' : ''}>
                  {!isCollapsed ? (
                    <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#22D3EE]/90 flex items-center justify-between border-b border-[#1E4F7A]/50 mb-2">
                      <span>{lang === 'id' ? group.titleId : group.titleEn}</span>
                    </div>
                  ) : (
                    groupIdx > 0 && <div className="my-2 border-t border-[#1E4F7A]/50" />
                  )}

                  <div className="space-y-1">
                    {groupItems.map((menu) => (
                      <MenuItem
                        key={menu.key}
                        menu={menu}
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        expandedKey={expandedKey}
                        toggleAccordion={toggleAccordion}
                        location={location}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Fallback for unmatched menu items */}
            {otherItems.length > 0 && (
              <div className="mt-4">
                {!isCollapsed ? (
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[#22D3EE]/90 border-b border-[#1E4F7A]/50 mb-2">
                    <span>{lang === 'id' ? 'MENU LAINNYA' : 'OTHER MENUS'}</span>
                  </div>
                ) : (
                  <div className="my-2 border-t border-[#1E4F7A]/50" />
                )}
                <div className="space-y-1">
                  {otherItems.map((menu) => (
                    <MenuItem
                      key={menu.key}
                      menu={menu}
                      isCollapsed={isCollapsed}
                      setIsCollapsed={setIsCollapsed}
                      expandedKey={expandedKey}
                      toggleAccordion={toggleAccordion}
                      location={location}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#CFE8EE] px-6 flex items-center justify-between z-10 shrink-0 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#7A6A55]">
              <Building2 className="w-4 h-4 text-[#028DAA]" />
              <span className="font-semibold text-[#0F2B48]">
                Banking Risk & Security
              </span>
              <span className="text-[#E2D8C9]">/</span>
              <span className="text-[#2E7D32] font-bold">SNAP BI Payment & Admin Portal</span>
            </div>
          </div>

          {/* Language Switcher + User Profile */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#F0F7F9] p-1.5 rounded-xl border border-[#CFE8EE]">
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`p-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  lang === 'id'
                    ? 'bg-[#028DAA] text-white shadow-xs ring-1 ring-[#028DAA]'
                    : 'hover:bg-white text-[#7A6A55]'
                }`}
                title="Bahasa Indonesia"
              >
                <svg width="20" height="14" viewBox="0 0 24 16" className="rounded-sm shrink-0 border border-black/10">
                  <rect width="24" height="8" fill="#FF0000" />
                  <rect y="8" width="24" height="8" fill="#FFFFFF" />
                </svg>
                <span className="text-xs font-bold">ID</span>
              </button>

              <button
                type="button"
                onClick={() => setLang('en')}
                className={`p-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  lang === 'en'
                    ? 'bg-[#028DAA] text-white shadow-xs ring-1 ring-[#028DAA]'
                    : 'hover:bg-white text-[#7A6A55]'
                }`}
                title="English (UK)"
              >
                <svg width="20" height="14" viewBox="0 0 60 30" className="rounded-sm shrink-0 border border-black/10">
                  <clipPath id="gb-flag-clip-layout"><rect width="60" height="30"/></clipPath>
                  <g clipPath="url(#gb-flag-clip-layout)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                  </g>
                </svg>
                <span className="text-xs font-bold">EN</span>
              </button>
            </div>

            <div className="relative pl-2 border-l border-[#CFE8EE]" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-[#F0F7F9] transition"
              >
                <div className="w-8 h-8 rounded-full bg-[#028DAA] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {(currentUser.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-[#0F2B48] leading-tight">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-[#7A6A55] font-medium">
                    {displayName}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#7A6A55] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#CFE8EE] rounded-xl shadow-lg py-1 z-50">
                  {/* User summary */}
                  <div className="px-3 py-2 border-b border-[#CFE8EE]">
                    <div className="text-xs font-bold text-[#0F2B48]">{currentUser.username}</div>
                    <div className="text-[10px] text-[#7A6A55]">{displayName}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); navigate('/system/profile'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0F2B48] hover:bg-[#F0F7F9] transition text-left"
                  >
                    <User className="w-4 h-4 text-[#028DAA]" />
                    <span>{t.menu_sys_01 || 'User Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); navigate('/system/change-password'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#0F2B48] hover:bg-[#F0F7F9] transition text-left"
                  >
                    <Lock className="w-4 h-4 text-[#028DAA]" />
                    <span>{t.menu_sys_03 || 'Change Password'}</span>
                  </button>

                  <div className="my-1 border-t border-[#CFE8EE]"></div>

                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition text-left font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t.logout || 'Keluar (Logout)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 pt-1 bg-[#E7F4F6]">
          <div className="max-w-7xl mx-auto flex flex-col min-h-full">
            <div className="flex-1">
              <Outlet />
            </div>
            {/* Global footer */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-xs text-slate-400">
              © 2026 <span className="font-semibold text-slate-500">Fraud Detection</span> — {t.footer_text}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
