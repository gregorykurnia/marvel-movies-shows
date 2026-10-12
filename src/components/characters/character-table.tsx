"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { TagFilter } from "@/components/tags/tag-filter";
import { buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Td, Th, Tr, Table, TableWrap } from "@/components/ui/table";
import type { CharacterTableRow, EntryChip } from "@/lib/data/characters";
import { importanceLabel, statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { CharacterAvatar } from "./character-avatar";

type Filters = "importance" | "status" | "universe" | "predominant" | "first" | "last";
const FILTER_IDS: Filters[] = ["importance", "status", "universe", "predominant", "first", "last"];
const SORTABLE_IDS = ["name", "importance", "universe", "predominant", "first", "last", "status"] as const;

// The features this table uses. Module scope, so the table keeps the same features on every render.
const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { text: sortFn_text },
});

const columnHelper = createColumnHelper<typeof features, CharacterTableRow>();

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    sortFn: "text",
    cell: (info) => (
      <div className="flex min-w-[180px] items-center gap-2.5">
        <CharacterAvatar name={info.getValue()} />
        <Link href={`/characters/${info.row.original.id}`} className="font-bold text-ink no-underline hover:underline hover:underline-offset-4">
          {info.getValue()}
        </Link>
      </div>
    ),
  }),
  columnHelper.accessor("importance", {
    id: "importance",
    header: "Importance",
    sortFn: "text",
    filterFn: (row, _id, value: string) => row.original.importance === value,
    cell: (info) => <Chip tone={info.getValue()}>{importanceLabel(info.getValue())}</Chip>,
  }),
  columnHelper.accessor((row) => row.universeName ?? "", {
    id: "universe",
    header: "Universe",
    sortFn: "text",
    filterFn: (row, _id, value: string) => row.original.universeId === value,
    cell: (info) =>
      info.row.original.universeName ? (
        <Chip tone="universe">{info.row.original.universeName}</Chip>
      ) : (
        <span className="text-ink-3">—</span>
      ),
  }),
  columnHelper.accessor((row) => row.predominantTitleName ?? "", {
    id: "predominant",
    header: "Predominant",
    sortFn: "text",
    filterFn: (row, _id, value: string) => row.original.predominantTitleId === value,
    cell: (info) => (info.getValue() ? info.getValue() : <span className="text-ink-3">—</span>),
  }),
  columnHelper.accessor((row) => row.firstEntry?.rank ?? Number.POSITIVE_INFINITY, {
    id: "first",
    header: "First appearance",
    filterFn: (row, _id, value: string) => row.original.firstEntry?.id === value,
    cell: (info) => <AppearanceLink entry={info.row.original.firstEntry} />,
  }),
  columnHelper.accessor((row) => row.lastEntry?.rank ?? Number.POSITIVE_INFINITY, {
    id: "last",
    header: "Last appearance",
    filterFn: (row, _id, value: string) => row.original.lastEntry?.id === value,
    cell: (info) => <AppearanceLink entry={info.row.original.lastEntry} />,
  }),
  columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    sortFn: "text",
    filterFn: (row, _id, value: string) => row.original.status === value,
    cell: (info) => (
      <Chip tone={info.getValue()} dot>
        {statusLabel(info.getValue())}
      </Chip>
    ),
  }),
]);

// The directory (IMPLEMENTATION_PLAN §5.3). Search by name, column filters, and sorting on any column. The search,
// the filters and the sort all live in the URL, so a filtered view survives a reload and can be bookmarked. The URL
// is updated with history.replaceState, so typing doesn't add history entries or make server requests.
export function CharacterTable({ rows }: { rows: CharacterTableRow[] }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => filtersFrom(params));
  const [sorting, setSorting] = useState<SortingState>(() => sortingFrom(params));
  const [tag, setTag] = useState<string | null>(() => params.get("tag"));

  // Keep the address bar in step with what the table shows.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    for (const filter of columnFilters) {
      if (typeof filter.value === "string" && filter.value) next.set(filter.id, filter.value);
    }
    if (tag) next.set("tag", tag);
    const sort = sorting[0];
    if (sort) {
      next.set("sort", sort.id);
      next.set("dir", sort.desc ? "desc" : "asc");
    }
    const query = next.toString();
    window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}`);
  }, [search, columnFilters, sorting, tag, pathname]);

  // Every tag a character has, once each, for the tag filter. The filter narrows the rows before the table sees them.
  const tagOptions = useMemo(
    () => [...new Set(rows.flatMap((row) => row.tags))].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    [rows],
  );
  const tagged = useMemo(
    () => (tag ? rows.filter((row) => row.tags.some((name) => name.toLowerCase() === tag.toLowerCase())) : rows),
    [rows, tag],
  );

  const options = useMemo(() => {
    const uniqueBy = <T extends { value: string; label: string }>(list: T[]) => {
      const seen = new Map<string, T>();
      for (const item of list) seen.set(item.value, item);
      return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
    };
    return {
      importance: [
        { value: "major", label: "Major" },
        { value: "minor", label: "Minor" },
      ],
      status: [
        { value: "alive", label: "Alive" },
        { value: "deceased", label: "Deceased" },
        { value: "unknown", label: "Unknown" },
      ],
      universe: uniqueBy(
        rows.flatMap((row) => (row.universeId && row.universeName ? [{ value: row.universeId, label: row.universeName }] : [])),
      ),
      predominant: uniqueBy(
        rows.flatMap((row) =>
          row.predominantTitleId && row.predominantTitleName
            ? [{ value: row.predominantTitleId, label: row.predominantTitleName }]
            : [],
        ),
      ),
      // Only the entries some character is first or last in, so the list stays short.
      first: uniqueBy(rows.flatMap((row) => (row.firstEntry ? [{ value: row.firstEntry.id, label: row.firstEntry.label }] : []))),
      last: uniqueBy(rows.flatMap((row) => (row.lastEntry ? [{ value: row.lastEntry.id, label: row.lastEntry.label }] : []))),
    };
  }, [rows]);

  const table = useTable({
    features,
    data: tagged,
    columns,
    state: { columnFilters, sorting, globalFilter: search },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    // Only the name takes part in the search box. The other text columns would match on universe names too.
    getColumnCanGlobalFilter: (column) => column.id === "name",
    globalFilterFn: "includesString",
    // Sorting toggles between ascending and descending, and the first click is always ascending (TanStack would
    // start numbers descending). A third click doesn't clear the sort.
    enableSortingRemoval: false,
    sortDescFirst: false,
  });

  const visibleRows = table.getRowModel().rows;
  const activeCount = columnFilters.length + (search.trim() ? 1 : 0) + (tag ? 1 : 0);
  const filterValue = (id: Filters) => (columnFilters.find((filter) => filter.id === id)?.value as string | undefined) ?? null;

  function setFilter(id: Filters, value: string | null) {
    setColumnFilters((current) => {
      const rest = current.filter((filter) => filter.id !== id);
      return value === null ? rest : [...rest, { id, value }];
    });
  }

  function clearAll() {
    setSearch("");
    setColumnFilters([]);
    setTag(null);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-[42px] min-w-[200px] flex-1 items-center gap-2 rounded-pill border-2 border-line bg-surface pr-3.5 pl-3.5 max-w-[320px] focus-within:border-blue focus-within:shadow-[0_0_0_4px_var(--blue-soft),3px_3px_0_var(--blue)]">
          <Search aria-hidden strokeWidth={2.5} className="size-[18px] shrink-0 text-ink-2" />
          <span className="sr-only">Search by name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            className="min-w-0 flex-1 bg-transparent font-body text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </label>
        <FilterMenu label="Importance" value={filterValue("importance")} options={options.importance} onChange={(value) => setFilter("importance", value)} />
        <FilterMenu label="Status" value={filterValue("status")} options={options.status} onChange={(value) => setFilter("status", value)} />
        <FilterMenu label="Universe" value={filterValue("universe")} options={options.universe} onChange={(value) => setFilter("universe", value)} />
        <FilterMenu label="Predominant" value={filterValue("predominant")} options={options.predominant} onChange={(value) => setFilter("predominant", value)} />
        <FilterMenu label="First" value={filterValue("first")} options={options.first} onChange={(value) => setFilter("first", value)} />
        <FilterMenu label="Last" value={filterValue("last")} options={options.last} onChange={(value) => setFilter("last", value)} />
        <TagFilter value={tag} options={tagOptions} onChange={setTag} />
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="h-[34px] cursor-pointer rounded-pill bg-transparent px-3 text-[13px] font-bold text-ink hover:bg-surface-2"
          >
            Clear all
          </button>
        ) : null}
        <span className="ml-auto font-mono text-[13px] font-bold whitespace-nowrap text-ink-2 tabular-nums" aria-live="polite">
          {visibleRows.length === rows.length
            ? `${rows.length} ${rows.length === 1 ? "result" : "results"}`
            : `${visibleRows.length} of ${rows.length}`}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="★"
          title="No characters yet"
          action={
            <Link href="/characters/new" className={buttonVariants({ variant: "primary" })}>
              ＋ Add character
            </Link>
          }
        >
          Add a character, then tell the directory which universe and recaps they appear in.
        </EmptyState>
      ) : visibleRows.length === 0 ? (
        <EmptyState
          icon="★"
          title="No characters match these filters"
          action={
            <button type="button" onClick={clearAll} className={buttonVariants({ variant: "secondary" })}>
              Clear all
            </button>
          }
        >
          Try a shorter search, or remove a filter.
        </EmptyState>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const sortable = (SORTABLE_IDS as readonly string[]).includes(header.column.id);
                    const direction = header.column.getIsSorted();
                    return (
                      <Th key={header.id} sorted={Boolean(direction)} sortDirection={direction === "desc" ? "desc" : "asc"}>
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex cursor-pointer items-center gap-1 bg-transparent p-0 font-mono text-xs font-bold tracking-[.06em] uppercase [color:inherit]"
                          >
                            <table.FlexRender header={header} />
                            {direction ? (
                              <span aria-hidden className="ml-1 text-red">
                                {direction === "desc" ? "▼" : "▲"}
                              </span>
                            ) : null}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </Th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <Tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <Td key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}

// First and last appearance link to the matching recap. A watched entry shows a check, an unwatched one a ring.
function AppearanceLink({ entry }: { entry: EntryChip | null }) {
  if (!entry) return <span className="text-ink-3">—</span>;
  return (
    <Link
      href={`/recaps/${entry.id}`}
      title={entry.label}
      className="flex max-w-[160px] items-center gap-2 font-medium text-ink underline underline-offset-[3px] decoration-line-soft hover:decoration-ink"
    >
      <span
        aria-label={entry.watched ? "Watched" : "Not watched"}
        className={cn("shrink-0 font-bold", entry.watched ? "text-green-ink" : "text-ink-3")}
      >
        {entry.watched ? "✓" : "○"}
      </span>
      <span className="min-w-0 truncate">{entry.label}</span>
    </Link>
  );
}

function filtersFrom(params: URLSearchParams): ColumnFiltersState {
  return FILTER_IDS.flatMap((id) => {
    const value = params.get(id);
    return value ? [{ id, value }] : [];
  });
}

function sortingFrom(params: URLSearchParams): SortingState {
  const id = params.get("sort");
  if (!id || !(SORTABLE_IDS as readonly string[]).includes(id)) return [];
  return [{ id, desc: params.get("dir") === "desc" }];
}
