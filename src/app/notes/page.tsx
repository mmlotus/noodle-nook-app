"use client";

import Banner from "@/components/Images/banner";
import LoadingSpinner from "@/components/LoadingSpinner";
import global from "@/styles/Global.module.css";
import styles from "@/styles/Notes.module.css";
import { Note, NotesApiResponse, NoteSortOption } from "@/types/notes";
import { Pencil, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatDate } from "../utils/formatDate";
import BasicModal from "@/components/Modals/PopupModal";
import SortDropdown from "@/components/SortDropdown";

const sortOptions: { value: NoteSortOption; label: string }[] = [
    { value: "recentlyEdited", label: "Recently Edited" },
    { value: "newestCreated", label: "Newest Created" },
    { value: "oldestCreated", label: "Oldest Created" },
    { value: "titleAsc", label: "A > Z" },
    { value: "titleDesc", label: "Z > A" },
];

function getNotePreview(body: string) {
    const cleaned = body.trim();

    if (!cleaned) return "Note is empty.";

    return cleaned.length > 140 ? `${cleaned.slice(0, 140)}...` : cleaned;
}

function formatNoteTimestamp(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    const time = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

    return `${formatDate(value)} ${time}`;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);

    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<NoteSortOption>("recentlyEdited");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState("");
    const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);

    const selectedNote = useMemo(() => {
        return notes.find((note) => note.id === selectedNoteId) || null;
    }, [notes, selectedNoteId]);

    const filteredNotes = useMemo(() => {
        const cleanSearch = searchTerm.trim().toLowerCase();

        const matchingNotes = notes.filter((note) => {
            if (!cleanSearch) return true;

            const noteTitle = note.title || "";
            const noteBody = note.body || "";

            return (
                noteTitle.toLowerCase().includes(cleanSearch) ||
                noteBody.toLowerCase().includes(cleanSearch)
            );
        });

        return matchingNotes.sort((a, b) => {
            if (sortBy === "recentlyEdited") {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            } else if (sortBy === "newestCreated") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else if (sortBy === "oldestCreated") {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortBy === "titleAsc") {
                return a.title.localeCompare(b.title);
            } else if (sortBy === "titleDesc") {
                return b.title.localeCompare(a.title);
            }

            return 0;
        });
    }, [notes, searchTerm, sortBy]);

    async function loadNotes() {
        try {
            const res = await fetch("/api/notes");

            if (!res.ok) throw new Error("Failed to load notes.");

            const data = (await res.json()) as NotesApiResponse;

            return data.notes || [];
        } catch (err) {
            console.error("loadNotes error:", err);
            toast.error("Could not load notes. Please try again later.");

            return null;
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const loadedNotes = await loadNotes();

            if (cancelled || !loadedNotes) return;

            setNotes(loadedNotes);
            setLoading(false);
        }

        run();

        return () => {
            cancelled = true;
        };
    }, []);

    function resetEditor() {
        setSelectedNoteId(null);
        setTitle("");
        setBody("");
    }

    function handleEdit(note: Note) {
        setSelectedNoteId(note.id);
        setTitle(note.title);
        setBody(note.body);

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleCreateNote() {
        setSaving(true);

        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    body,
                }),
            });

            if (!res.ok) throw new Error("Failed to create note.");

            const data = await res.json();
            const newNote = data.note as Note;

            setNotes((current) => [newNote, ...current]);
            resetEditor();
            toast.success("Note created!");
        } catch (err) {
            console.error("handleCreateNote error:", err);
            toast.error("Could not create note. Please try again later.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveNote() {
        if (!selectedNote) {
            toast.error("Select a note first.");
            return;
        }

        setSaving(true);

        try {
            const res = await fetch(`/api/notes/${selectedNote.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    body
                }),
            });

            if (!res.ok) throw new Error("Failed to save note.");

            const data = await res.json();
            const updatedNote = data.note as Note;

            setNotes((current) => current.map((note) => note.id === updatedNote.id ? updatedNote : note));
            resetEditor();
            toast.success("Note saved!");
        } catch (err) {
            console.error("handleSaveNote error:", err);
            toast.error("Could not save note. Please try again later.");
        } finally {
            setSaving(false);
        }
    }

    function openDeleteModal(note: Note) {
        setPendingDeleteNote(note);
    }

    function closeDeleteModal() {
        if (deletingNoteId) return;
        setPendingDeleteNote(null);
    }

    async function handleDeleteNote(noteId: string) {
        setDeletingNoteId(noteId);

        try {
            const res = await fetch(`/api/notes/${noteId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete note.");

            setNotes((current) => current.filter((note) => note.id !== noteId));

            if (selectedNoteId === noteId) {
                resetEditor();
            }

            setPendingDeleteNote(null);
            toast.success("Note deleted!");
        } catch (err) {
            console.error("handleDeleteNote error:", err);
            toast.error("Could not delete note.");
        } finally {
            setDeletingNoteId("");
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <main className={global.pageWrapper}>
            <Banner
                type="default"
                title="Notepad"
                subtitle="Save quick notes, reminders, ideas & anything else."
            />

            <div className={styles.notesPage}>
                {/* EDITOR */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={global.headLeft}>
                            {selectedNote ? "Edit Note" : "New Note"}
                        </h2>

                        <p>
                            {selectedNote
                                ? "Update the selected note."
                                : "Create a note, then edit as needed anytime."}
                        </p>
                    </div>

                    <div className={styles.editorGrid}>
                        <div className={styles.field}>
                            <label className={global.label}>Title</label>
                            <input
                                type="text"
                                className={global.input}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note title"
                                disabled={saving}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.bodyField}`}>
                            <label className={global.label}>Note</label>
                            <textarea
                                className={global.textarea}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Start typing..."
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        {!selectedNote && (
                            <button
                                type="button"
                                className={global.buttonBrand}
                                onClick={handleCreateNote}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Create Note"}
                            </button>
                        )}

                        {selectedNote && (
                            <>
                                <div className={styles.noteMetaBlock}>
                                    <p className={styles.noteTimestamp}>
                                        Created: {formatNoteTimestamp(selectedNote.createdAt)}
                                    </p>

                                    <p className={styles.noteTimestamp}>
                                        Last udpated: {formatNoteTimestamp(selectedNote.updatedAt)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className={global.buttonBrand}
                                    onClick={handleSaveNote}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save Note"}
                                </button>

                                <button
                                    type="button"
                                    className={global.buttonSecondary}
                                    onClick={resetEditor}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={global.iconButton}
                                    onClick={() => openDeleteModal(selectedNote)}
                                    disabled={saving}
                                >
                                    <Trash size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </section>

                {/* NOTES LIST */}
                <section className={styles.section}>
                    <div className={styles.notesHeaderRow}>
                        <div>
                            <h2 className={global.headLeft}>Saved Notes</h2>
                            <p>
                                Showing {filteredNotes.length} of {notes.length} saved notes.
                            </p>
                        </div>

                        <div className={styles.notesHeaderActions}>
                            <SortDropdown
                                value={sortBy}
                                options={sortOptions}
                                onChange={setSortBy}
                                title="Sort By"
                            />
                        </div>
                    </div>

                    <div className={styles.notesFilters}>
                        <div className={styles.filterField}>
                            <label className={global.label}>Search</label>
                            <input
                                type="text"
                                className={global.input}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title or note text"
                            />
                        </div>

                        <div className={styles.filterActions}>
                            <button
                                type="button"
                                className={global.linkBtn}
                                onClick={() => setSearchTerm("")}
                            >
                                Clear Search
                            </button>
                        </div>
                    </div>

                    {notes.length === 0 ? (
                        <p className={global.subcentered}>No notes yet.</p>
                    ) : filteredNotes.length === 0 ? (
                        <p className={global.subcentered}>No notes match that search.</p>
                    ) : (
                        <div className={styles.notesList}>
                            {filteredNotes.map((note) => (
                                <div key={note.id} className={note.id === selectedNoteId
                                    ? `${styles.noteItem} ${styles.noteItemActive}`
                                    : styles.noteItem}>
                                    <div className={styles.noteDetails}>
                                        <div>
                                            <span className={styles.noteTitle}>
                                                {note.title || "Untitled Note"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className={styles.notePreview}>
                                                {getNotePreview(note.body)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.noteActions}>
                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={() => handleEdit(note)}
                                            title="Edit"
                                        >
                                            <Pencil size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            className={global.iconButton}
                                            onClick={() => openDeleteModal(note)}
                                            disabled={deletingNoteId === note.id}
                                            title="Delete"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <BasicModal
                isOpen={Boolean(pendingDeleteNote)}
                title="Delete This Note?"
                cancelText="Cancel"
                confirmText={deletingNoteId ? "Deleting..." : "Yes, Delete"}
                onClose={closeDeleteModal}
                onConfirm={() => {
                    if (!pendingDeleteNote) return;
                    handleDeleteNote(pendingDeleteNote.id);
                }}
                disableConfirm={Boolean(deletingNoteId)}
                message={
                    pendingDeleteNote ? (
                        <div>
                            <p>Are you sure you want to delete this note?</p>

                            <div style={{ marginTop: "1rem" }}>
                                <p className={global.labelLine}>
                                    <strong>Title:</strong> {pendingDeleteNote.title || "Untitled Note"}
                                </p>

                                <p className={global.labelLine}>
                                    <strong>Updated:</strong> {formatDate(pendingDeleteNote.updatedAt)}
                                </p>
                            </div>
                        </div>
                    ) : null
                }
            />
        </main>
    );
}