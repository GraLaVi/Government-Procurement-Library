import { Fragment } from "react";
import { CheckIcon } from "@/components/icons";

// Static comparison copy for /pricing. Deliberately not driven off the plans
// API: that payload carries prices, seat ceilings and max_customer_users, but
// not the feature_limits keys the numeric rows below need (max_profiles,
// max_conditions_per_profile live under products.feature_limits and are never
// serialised to the client). Surfacing them properly is an API change; until
// then these are copy, and they have to be re-checked against
// products.feature_limits whenever a tier's limits are edited in admin
// /billing/settings.
//
// The numbers below were read from feature_limits on the DEV business
// database. Confirm against prod before this ships.
//
// Tier keys match the column order, not the plan ids — this table is
// marketing copy about the three Parts & Vendor Library tiers and does not
// try to reflect whichever products happen to be billing_enabled.

type Cell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "value"; text: string }
  | { kind: "addon" }
  // A capability the tier has only while some condition holds. Rendered as
  // the condition text, not a checkmark — a plain tick here would overstate
  // what Free and Basic actually get.
  | { kind: "conditional"; text: string };

const yes: Cell = { kind: "yes" };
const no: Cell = { kind: "no" };
const addon: Cell = { kind: "addon" };
const val = (text: string): Cell => ({ kind: "value", text });
const conditional = (text: string): Cell => ({ kind: "conditional", text });

type Row = { label: string; free: Cell; basic: Cell; advanced: Cell };
type Group = { title: string; rows: Row[] };

const groups: Group[] = [
  {
    title: "Parts & vendor data",
    rows: [
      { label: "Part identifiers, details, and codes", free: yes, basic: yes, advanced: yes },
      { label: "Which vendors are registered and active on a part", free: yes, basic: yes, advanced: yes },
      { label: "Manufacturers, technical characteristics, packaging", free: no, basic: yes, advanced: yes },
      { label: "Cross-references and management codes", free: no, basic: yes, advanced: yes },
    ],
  },
  {
    title: "Solicitations & awards",
    rows: [
      { label: "See whether solicitations exist on a part", free: yes, basic: yes, advanced: yes },
      { label: "Recent solicitation detail", free: no, basic: yes, advanced: yes },
      { label: "Full procurement and award history", free: no, basic: no, advanced: yes },
      { label: "Open solicitations by vendor", free: no, basic: no, advanced: yes },
    ],
  },
  {
    title: "Bid-matching",
    rows: [
      { label: "Matching profiles", free: val("1"), basic: val("5"), advanced: val("20") },
      { label: "Conditions per profile", free: val("5"), basic: val("20"), advanced: val("100") },
      {
        label: "Match alerts",
        free: val("Weekly"),
        basic: val("Daily"),
        advanced: val("Immediate"),
      },
      { label: "Full solicitation detail on a match", free: no, basic: yes, advanced: yes },
    ],
  },
  {
    title: "Supplier stock",
    rows: [
      { label: "Upload your inventory", free: yes, basic: yes, advanced: yes },
      // Mirrors can_view_network_stock() in the API: Advanced tier OR an
      // active sharing contributor. Basic is NOT above the bar on tier alone,
      // so it carries the same condition Free does.
      {
        label: "See what other suppliers have on the shelf",
        free: conditional("If you share"),
        basic: conditional("If you share"),
        advanced: yes,
      },
    ],
  },
  {
    title: "Working tools",
    rows: [
      { label: "Saved searches and pinned items", free: no, basic: no, advanced: yes },
      { label: "CSV export", free: no, basic: no, advanced: yes },
    ],
  },
  {
    title: "Add-ons",
    rows: [
      { label: "Requests for Quote", free: no, basic: addon, advanced: addon },
      { label: "Procurement Analytics", free: no, basic: no, advanced: addon },
    ],
  },
  {
    title: "Team",
    rows: [
      { label: "Users", free: val("3"), basic: val("Per seat"), advanced: val("Per seat") },
    ],
  },
];

function CellContent({ cell, label }: { cell: Cell; label: string }) {
  switch (cell.kind) {
    case "yes":
      return (
        <>
          <CheckIcon className="w-4 h-4 text-success inline-block align-[-2px]" />
          <span className="sr-only">{`${label}: included`}</span>
        </>
      );
    case "no":
      return (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">{`${label}: not included`}</span>
        </>
      );
    case "addon":
      return (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Add-on
        </span>
      );
    case "conditional":
      return <span className="text-muted italic">{cell.text}</span>;
    case "value":
      return <span className="font-medium text-foreground">{cell.text}</span>;
  }
}

export function PlanComparison() {
  return (
    <section id="compare" className="scroll-mt-24 mt-16">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground">Compare plans</h2>
        <p className="text-muted mt-2">
          Each tier includes everything in the one before it.
        </p>
      </div>

      {/* The table is wider than a phone. It scrolls inside its own container
          so the page body never scrolls sideways. */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            Feature comparison across the Free, Basic, and Advanced plans
          </caption>
          <thead>
            <tr>
              <th scope="col" className="text-left font-semibold text-muted px-4 py-3 border-b border-border">
                Feature
              </th>
              <th scope="col" className="text-center font-bold text-foreground px-4 py-3 border-b border-border w-32">
                Free
              </th>
              <th scope="col" className="text-center font-bold text-foreground px-4 py-3 border-b border-border w-32">
                Basic
              </th>
              <th scope="col" className="text-center font-bold text-primary px-4 py-3 border-b border-border w-32">
                Advanced
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              // One <tbody> per group would be cleaner semantically but breaks
              // the single-border-collapse run across groups in Safari, so the
              // group heading is a full-width row instead.
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={4}
                    className="bg-muted-light px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="hover:bg-primary/5">
                    <th
                      scope="row"
                      className="text-left font-normal text-foreground px-4 py-3 border-b border-border"
                    >
                      {row.label}
                    </th>
                    <td className="text-center px-4 py-3 border-b border-border text-muted tabular-nums">
                      <CellContent cell={row.free} label={row.label} />
                    </td>
                    <td className="text-center px-4 py-3 border-b border-border text-muted tabular-nums">
                      <CellContent cell={row.basic} label={row.label} />
                    </td>
                    <td className="text-center px-4 py-3 border-b border-border text-muted tabular-nums">
                      <CellContent cell={row.advanced} label={row.label} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted text-center">
        &ldquo;If you share&rdquo; — turn on inventory sharing and keep at least one listing
        current, and you can see the rest of the network&apos;s stock on any plan. Advanced
        includes network access whether you share or not.
      </p>
    </section>
  );
}
