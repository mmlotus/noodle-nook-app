"use client";

import { buildEmptySimpleTrackerForm, buildSimpleTrackerFormFromItem, getFieldValueAsString, normalizeSimpleTrackerFieldValue } from "@/lib/trackers/trackerFormUtils";
import global from "@/styles/Global.module.css";
import styles from "@/styles/SimpleTrackers.module.css";
import { defaultFilters, SimpleTracker, SimpleTrackerFieldConfig, SimpleTrackerItem, SimpleTrackerItemFormState, SimpleTrackerPageProps, TrackerFilters } from "@/types/trackers";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";
import Banner from "../Images/banner";
import { ArrowDownWideNarrow, Pencil, Trash } from "lucide-react";
import BasicModal from "../Modals/PopupModal";
import TagSelector from "../TagSelector";

function buildTrackerQueryParams(
    trackerSlug: string,
    currentFilters: TrackerFilters
) {
    const cleanedParams = Object.entries(currentFilters)
        .filter(([, value]) => typeof value === "string" && value.trim() !== "")
        .reduce((acc, [key, value]) => {
            acc[key] = value.trim();
            return acc;
        }, {} as Record<string, string>);

    return new URLSearchParams({
        slug: trackerSlug,
        ...cleanedParams,
    }).toString();
}

export default function SimpleTrackerPage({ trackerSlug }: SimpleTrackerPageProps) {
    const [tracker, setTracker] = useState<SimpleTracker | null>(null);
    const [items, setItems] = useState<SimpleTrackerItem[]>([]);
    const [form, setForm] = useState<SimpleTrackerItemFormState>(buildEmptySimpleTrackerForm());

    const [editingItem, setEditingItem] = useState<SimpleTrackerItem | null>(null);
    const [pendingDeleteItem, setPendingDeleteItem] = useState<SimpleTrackerItem | null>(null);

    const [filters, setFilters] = useState<TrackerFilters>(defaultFilters);
    const [sortMenuOpen, setSortMenuOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    function getSortLabel(sort: TrackerFilters["sort"]) {
        if (sort === "title_asc") return "A > Z";
        if (sort === "title_desc") return "Z > A";
        if (sort === "oldest") return "Oldest to Newest";
        return "Newest to Oldest";
    }

    async function handleSortChange(nextSort: TrackerFilters["sort"]) {
        const nextFilters = {
            ...filters,
            sort: nextSort,
        };

        setFilters(nextFilters);
        setSortMenuOpen(false);
        await handleSearch(nextFilters);
    }

    const fetchTracker = useCallback(
        async (currentFilters: TrackerFilters) => {
            const params = buildTrackerQueryParams(trackerSlug, currentFilters);

            const res = await fetch(`/api/trackers?${params}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to load tracker.");

            return data;
        },
        [trackerSlug]
    );

    const createTrackerFromTemplate = useCallback(async () => {
        const createRes = await fetch("/api/trackers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateKey: trackerSlug }),
        });

        const createData = await createRes.json();

        if (!createRes.ok) throw new Error(createData.error || "Failed to create tracker. Please try again.");

        return createData.tracker as SimpleTracker;
    }, [trackerSlug]);

    const loadTracker = useCallback(async () => {
        try {
            const data = await fetchTracker(defaultFilters);

            if (data.tracker) {
                const loadedTracker = data.tracker as SimpleTracker;

                setTracker(loadedTracker);
                setItems(data.items || []);
                setFilters(defaultFilters);
                setEditingItem(null);
                setPendingDeleteItem(null);
                setForm(buildEmptySimpleTrackerForm(loadedTracker.status_options?.[0] || ""));
                return;
            }

            const createdTracker = await createTrackerFromTemplate();

            setTracker(createdTracker);
            setItems([]);
            setFilters(defaultFilters);
            setEditingItem(null);
            setPendingDeleteItem(null);
            setForm(buildEmptySimpleTrackerForm(createdTracker.status_options?.[0] || ""));
        } catch (err) {
            console.error("loadTracker error:", err);
            setTracker(null);
            setItems([]);
            toast.error("Could not load tracker.");
        } finally {
            setLoading(false);
        }
    }, [createTrackerFromTemplate, fetchTracker]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            void loadTracker();
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [loadTracker]);

    async function handleSearch(currentFilters: TrackerFilters = filters) {
        try {
            setLoading(true);

            const data = await fetchTracker(currentFilters);

            setTracker(data.tracker);
            setItems(data.items || []);
        } catch (err) {
            console.error("handleSearch tracker error:", err);
            toast.error("Could not search/filter tracker.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetFilters() {
        setFilters(defaultFilters);
        await handleSearch(defaultFilters);
    }

    function handleFilterChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        setFilters((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetForm(nextStatus?: string) {
        setEditingItem(null);
        setForm(buildEmptySimpleTrackerForm(nextStatus || tracker?.status_options?.[0] || ""));
    }

    function handleFieldValueChange(
        field: SimpleTrackerFieldConfig,
        value: string | boolean
    ) {
        setForm((current) => ({
            ...current,
            field_values: {
                ...current.field_values,
                [field.key]: normalizeSimpleTrackerFieldValue(field, value),
            },
        }));
    }

    function handleEdit(item: SimpleTrackerItem) {
        setEditingItem(item);
        setForm(buildSimpleTrackerFormFromItem(item));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleSave() {
        if (!tracker) return;

        const cleanTitle = form.title.trim();

        if (!cleanTitle) {
            toast.error("Please enter a title.");
            return;
        }

        if (!form.status) {
            toast.error("Please choose a status.");
            return;
        }

        setSaving(true);

        try {
            const payload = {
                title: cleanTitle,
                status: form.status,
                priority: form.priority,
                notes: form.notes,
                url: form.url,
                tags: form.tags,
                field_values: form.field_values,
            };

            const endpoint = editingItem
                ? `/api/trackers/${tracker.id}/items/${editingItem.id}`
                : `/api/trackers/${tracker.id}/items`;

            const method = editingItem ? "PATCH" : "POST";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to save item.");

            toast.success(editingItem ? "Updated!" : "Added!");
            resetForm(data.item.status);
            await handleSearch(filters);
        } catch (err) {
            console.error("handleSave tracker item error:", err);
            toast.error("Could not save item.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!tracker || !pendingDeleteItem) return;

        setDeleting(true);

        try {
            const res = await fetch(`/api/trackers/${tracker.id}/items/${pendingDeleteItem.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to delete item.");

            toast.success("Deleted!");
            setPendingDeleteItem(null);
            await handleSearch(filters);
        } catch (err) {
            console.error("handleDelete tracker item error:", err);
            toast.error("Could not delete item.");
        } finally {
            setDeleting(false);
        }
    }

    const hasActiveFilters = Object.values(filters).some((value) => value !== "");

    if (loading) return <LoadingSpinner />;

    if (!tracker) {
        return (
            <main className={global.pageWrapper}>
                <Banner
                    type="default"
                    title="Tracker Not Found"
                    subtitle="This tracker could not be loaded. Please try again later."
                />
            </main>
        );
    }

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title={tracker.name}
                subtitle={tracker.description || "Track your list your way."}
            />

            <div className={styles.trackerPage}>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>
                            {editingItem ? "Edit Item" : `Add to ${tracker.name}`}
                        </h2>

                        <p>Add an item, choose a status, & organize it with tags.</p>
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Title</label>
                            <input
                                className={global.input}
                                value={form.title}
                                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                                placeholder={tracker.slug === "books" ? "Book title" : tracker.slug === "watchlist" ? "Movie or show title" : "Item title"}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Status</label>
                            <TagSelector
                                mode="single"
                                options={tracker.status_options}
                                selected={form.status ? [form.status] : []}
                                onChange={(selected) => setForm((current) => ({ ...current, status: selected[0] || "" }))}
                                placeholder="Add status"
                                allowCreate={false}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={global.label}>Priority</label>
                            <TagSelector
                                mode="single"
                                options={["Low", "Medium", "High"]}
                                selected={form.priority ? [form.priority] : []}
                                onChange={(selected) => setForm((current) => ({ ...current, priority: selected[0] || "" }))}
                                placeholder="Add priority"
                                allowCreate={false}
                            />
                        </div>

                        {tracker.field_config.map((field) => (
                            <div key={field.key} className={styles.field}>
                                <label className={global.label}>{field.label}</label>

                                {field.type === "select" ? (
                                    <TagSelector
                                        mode="single"
                                        options={field.options || []}
                                        selected={
                                            getFieldValueAsString(form.field_values[field.key])
                                                ? [getFieldValueAsString(form.field_values[field.key])]
                                                : []
                                        }
                                        onChange={(selected) => handleFieldValueChange(field, selected[0] || "")}
                                        placeholder={`Add ${field.label.toLowerCase()}`}
                                        allowCreate={false}
                                    />
                                ) : field.type === "textarea" ? (
                                    <textarea
                                        className={global.textarea}
                                        value={getFieldValueAsString(form.field_values[field.key])}
                                        onChange={(e) => handleFieldValueChange(field, e.target.value)}
                                    />
                                ) : field.type === "checkbox" ? (
                                    <label className={styles.checkboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(form.field_values[field.key])}
                                            onChange={(e) => handleFieldValueChange(field, e.target.checked)}
                                        />
                                        <span>Yes</span>
                                    </label>
                                ) : (
                                    <input
                                        className={global.input}
                                        type={
                                            field.type === "number"
                                                ? "number"
                                                : field.type === "date"
                                                    ? "date"
                                                    : "text"
                                        }
                                        value={getFieldValueAsString(form.field_values[field.key])}
                                        onChange={(e) => handleFieldValueChange(field, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                        <div className={styles.field}>
                            <label className={global.label}>URL</label>
                            <input
                                className={global.input}
                                value={form.url}
                                onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
                                placeholder="optional"
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={global.label}>Tags</label>
                            <TagSelector
                                options={tracker.tag_options}
                                selected={form.tags}
                                onChange={(tags) => setForm((current) => ({ ...current, tags }))}
                                placeholder="Add tag"
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label className={global.label}>Notes</label>
                            <textarea
                                className={global.textarea}
                                value={form.notes}
                                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                                placeholder="optional"
                            />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={global.buttonBrand}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : editingItem ? "Update" : "Add"}
                        </button>

                        {editingItem && (
                            <button
                                type="button"
                                className={global.buttonSecondary}
                                onClick={() => resetForm()}
                                disabled={saving}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.listHeader}>
                        <div>
                            <h2 className={global.headLeft}>{tracker.name}</h2>
                            <p>
                                Showing {items.length}{" "}
                                {items.length === 1 ? "item" : "items"}.
                            </p>
                        </div>

                        <div className={styles.listHeaderActions}>
                            <div className={global.activeSortText}>
                                {getSortLabel(filters.sort)}
                            </div>

                            <div className={global.sortMenuWrap}>
                                <button
                                    type="button"
                                    className={global.sortIconButton}
                                    onClick={() => setSortMenuOpen((current) => !current)}
                                    title="Sort items"
                                >
                                    <ArrowDownWideNarrow size={14} />
                                </button>

                                {sortMenuOpen && (
                                    <div className={global.sortDropdown}>
                                        <button
                                            type="button"
                                            className={
                                                filters.sort === "title_asc"
                                                    ? global.sortOptionActive
                                                    : global.sortOption
                                            }
                                            onClick={() => handleSortChange("title_asc")}
                                        >
                                            A &gt; Z
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                filters.sort === "title_desc"
                                                    ? global.sortOptionActive
                                                    : global.sortOption
                                            }
                                            onClick={() => handleSortChange("title_desc")}
                                        >
                                            Z &gt; A
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                filters.sort === "newest"
                                                    ? global.sortOptionActive
                                                    : global.sortOption
                                            }
                                            onClick={() => handleSortChange("newest")}
                                        >
                                            Newly Added First
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                filters.sort === "oldest"
                                                    ? global.sortOptionActive
                                                    : global.sortOption
                                            }
                                            onClick={() => handleSortChange("oldest")}
                                        >
                                            Newly Added Last
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <form className={styles.filters} onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                        <input
                            className={global.input}
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search..."
                        />

                        <select
                            className={global.input}
                            name="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Statuses</option>
                            {tracker.status_options.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        <select
                            className={global.input}
                            name="tag"
                            value={filters.tag}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Tags</option>
                            {tracker.tag_options.map((tag) => (
                                <option key={tag} value={tag}>
                                    {tag}
                                </option>
                            ))}
                        </select>

                        <button type="submit" className={global.button}>
                            Search
                        </button>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                className={global.linkBtn}
                                onClick={handleResetFilters}
                            >
                                Clear Filters
                            </button>
                        )}
                    </form>

                    {items.length === 0 ? (
                        <p className={global.subcentered}>
                            {hasActiveFilters
                                ? "No items match those filters."
                                : `No ${tracker.name.toLowerCase()} items yet.`}
                        </p>
                    ) : (
                        <div className={styles.itemGrid}>
                            {items.map((item) => (
                                <article key={item.id} className={styles.itemCard}>
                                    <div className={styles.itemCardHeader}>
                                        <div>
                                            <p className={styles.statusPill}>
                                                {item.status}
                                            </p>

                                            <h3>{item.title}</h3>
                                        </div>

                                        <div className={styles.cardActions}>
                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => handleEdit(item)}
                                                title="Edit item"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                className={global.iconButton}
                                                onClick={() => setPendingDeleteItem(item)}
                                                title="Delete item"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {item.priority && (
                                        <p className={styles.metaLine}>
                                            <strong>Priority:</strong> {item.priority}
                                        </p>
                                    )}

                                    {tracker.field_config.map((field) => {
                                        const value = item.field_values?.[field.key];

                                        if (
                                            value === undefined || value === null || value === ""
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <p key={field.key} className={styles.metaLine}>
                                                <strong>{field.label}:</strong>{" "}
                                                {typeof value === "boolean"
                                                    ? value
                                                        ? "Yes" : "No"
                                                    : String(value)}
                                            </p>
                                        );
                                    })}

                                    {item.url && (
                                        <p className={styles.metaLine}>
                                            <strong>Link:</strong>{" "}
                                            <a href={item.url} target="_blank" rel="noreferrer">Open</a>
                                        </p>
                                    )}

                                    {item.tags.length > 0 && (
                                        <div className={styles.tagRow}>
                                            {item.tags.map((tag) => (
                                                <span key={tag} className={styles.tagPill}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {item.notes && (
                                        <p className={styles.notes}>{item.notes}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={Boolean(pendingDeleteItem)}
                title="Delete Item?"
                cancelText="Cancel"
                confirmText={deleting ? "Deleting..." : "Yes, Delete"}
                onClose={() => {
                    if (!deleting) setPendingDeleteItem(null);
                }}
                onConfirm={handleDelete}
                disableConfirm={deleting}
                message={
                    pendingDeleteItem ? (
                        <div>
                            <p>Are you sure you want to delete this item?</p>

                            <p className={global.labelLine}>
                                <strong>Title:</strong> {pendingDeleteItem.title}
                            </p>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}