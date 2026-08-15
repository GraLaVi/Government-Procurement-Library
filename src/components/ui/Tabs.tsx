import { ReactNode } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

interface TabPanelProps {
  children: ReactNode;
  tabId: string;
  activeTab: string;
  className?: string;
}

/**
 * Underlined tabs: a rail with the active tab marked by a teal underline.
 *
 * The former shape — a bg-muted-light trough with the active tab raised on
 * bg-card-bg — had two problems. In light mode the raised tab was #FFFFFF on
 * a #F8FAFC trough, a 2% difference carried almost entirely by its shadow. And
 * once the tables took the RFQ style, the trough and the table header beneath
 * it were both bg-muted-light, so two recessed bands stacked with nothing
 * between them.
 *
 * The teal marks the selection rather than filling a band: the label stays
 * text-foreground and only the 3px rule is primary, which keeps contrast off
 * the text and out of trouble in both themes (white-on-primary is 4.2:1, under
 * AA at this size — a solid teal chip would have needed per-theme text colors).
 */
export function Tabs({ tabs, activeTab, onTabChange, className = "" }: TabsProps) {
  return (
    <div
      className={`inline-flex flex-wrap gap-x-5 border-b border-border ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            // -mb-px pulls the tab's own border onto the rail's, so the active
            // underline replaces that segment of rule instead of sitting under
            // it. Every tab carries the border at the same width, transparent
            // when inactive, so labels don't shift as the selection moves.
            className={`
              relative flex items-center gap-1.5 px-1 pb-2 -mb-px border-b-[3px] text-xs font-medium
              transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground hover:border-border"
              }
              ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`
                  ml-0.5 px-1 py-0.5 rounded-full text-[10px] font-medium
                  ${isActive ? "bg-primary/10 text-primary" : "bg-muted-light text-muted"}
                `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, tabId, activeTab, className = "" }: TabPanelProps) {
  if (activeTab !== tabId) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={className}
    >
      {children}
    </div>
  );
}
