export type NoteSortOption = "recentlyEdited" | "newestCreated" | "oldestCreated" | "titleAsc" | "titleDesc";

export type Note = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    updatedAt: string;
};

export type CreateNotePayload = {
    title?: string;
    body?: string;
};

export type UpdateNotePayload = {
    title?: string;
    body?: string;
};

export type NotesApiResponse = {
    notes: Note[];
};

export type NoteApiResponse = {
    note: Note;
};

export type NotesPageState = {
    notes: Note[];
    selectedNoteId: string | null;
    searchTerm: string;
    sortBy: NoteSortOption;
    isLoading: boolean;
    isSaving: boolean;
    error: string;
};